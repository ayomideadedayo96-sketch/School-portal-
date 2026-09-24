-- ============================================================
-- School Management Portal — Phase 3 Migration
-- Run this AFTER 0001_initial_schema.sql and 0002_phase2.sql.
-- ============================================================

-- ============================================================
-- 1. STAFF PERMISSIONS — lets an admin grant a specific staff
--    member a narrow, named permission (e.g. managing results)
--    without making them a teacher or admin.
-- ============================================================

create table if not exists public.staff_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null check (permission in ('manage_results')),
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint staff_permissions_unique unique (profile_id, permission)
);

create index if not exists idx_staff_permissions_profile on public.staff_permissions(profile_id);

alter table public.staff_permissions enable row level security;

create policy "staff_permissions_select_own_or_admin"
  on public.staff_permissions for select
  using (profile_id = public.get_profile_id() or public.get_user_role() = 'admin');

create policy "staff_permissions_admin_insert"
  on public.staff_permissions for insert
  with check (public.get_user_role() = 'admin');

create policy "staff_permissions_admin_delete"
  on public.staff_permissions for delete
  using (public.get_user_role() = 'admin');

-- Returns true if the calling user (any role) holds the named permission.
create or replace function public.has_permission(p_permission text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.staff_permissions
    where profile_id = public.get_profile_id() and permission = p_permission
  );
$$;

-- ============================================================
-- 2. AUTHORIZATION HELPERS for attendance & results
-- ============================================================

-- True if the calling teacher is assigned to teach ANY subject in this
-- class for this session, or is the class's designated class teacher.
-- Used to gate attendance, which is taken per class, not per subject.
create or replace function public.is_class_teacher_or_assigned(
  p_class_id uuid,
  p_academic_session_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (
      select 1 from public.classes
      where id = p_class_id and class_teacher_id = public.get_profile_id()
    )
    or exists (
      select 1 from public.teacher_assignments
      where class_id = p_class_id
        and academic_session_id = p_academic_session_id
        and teacher_id = public.get_profile_id()
    );
$$;

-- True if the calling teacher is assigned to teach this specific
-- subject in this class for this session. Used to gate results entry.
create or replace function public.is_assigned_to_class_subject(
  p_class_id uuid,
  p_subject_id uuid,
  p_academic_session_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.teacher_assignments
    where class_id = p_class_id
      and subject_id = p_subject_id
      and academic_session_id = p_academic_session_id
      and teacher_id = public.get_profile_id()
  );
$$;

-- ============================================================
-- 3. ATTENDANCE
-- ============================================================

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  academic_session_id uuid not null references public.academic_sessions(id) on delete cascade,
  term_id uuid references public.terms(id) on delete set null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  recorded_by uuid references public.profiles(id) on delete set null default public.get_profile_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One attendance record per student per calendar day, regardless of
  -- which class/term it was recorded under — this is what stops a
  -- student from being marked twice on the same date.
  constraint attendance_unique_student_date unique (student_id, date)
);

create index if not exists idx_attendance_class_date on public.attendance(class_id, date);
create index if not exists idx_attendance_student on public.attendance(student_id);
create index if not exists idx_attendance_session_term on public.attendance(academic_session_id, term_id);

create trigger trg_attendance_updated_at before update on public.attendance
  for each row execute function public.set_updated_at();

alter table public.attendance enable row level security;

create policy "attendance_select_admin_or_authorized_teacher"
  on public.attendance for select
  using (
    public.get_user_role() = 'admin'
    or (
      public.get_user_role() = 'teacher'
      and public.is_class_teacher_or_assigned(class_id, academic_session_id)
    )
  );

create policy "attendance_insert_admin_or_authorized_teacher"
  on public.attendance for insert
  with check (
    public.get_user_role() = 'admin'
    or (
      public.get_user_role() = 'teacher'
      and public.is_class_teacher_or_assigned(class_id, academic_session_id)
    )
  );

create policy "attendance_update_admin_or_authorized_teacher"
  on public.attendance for update
  using (
    public.get_user_role() = 'admin'
    or (
      public.get_user_role() = 'teacher'
      and public.is_class_teacher_or_assigned(class_id, academic_session_id)
    )
  )
  with check (
    public.get_user_role() = 'admin'
    or (
      public.get_user_role() = 'teacher'
      and public.is_class_teacher_or_assigned(class_id, academic_session_id)
    )
  );

create policy "attendance_delete_admin_only"
  on public.attendance for delete
  using (public.get_user_role() = 'admin');

-- ============================================================
-- 4. CONFIGURABLE GRADING
-- ============================================================

create table if not exists public.score_settings (
  id smallint primary key default 1 check (id = 1),
  ca_max numeric not null default 40,
  exam_max numeric not null default 60,
  updated_at timestamptz not null default now()
);

insert into public.score_settings (id) values (1)
on conflict (id) do nothing;

create trigger trg_score_settings_updated_at before update on public.score_settings
  for each row execute function public.set_updated_at();

alter table public.score_settings enable row level security;

create policy "score_settings_select_authenticated"
  on public.score_settings for select
  using (public.get_user_role() is not null);

create policy "score_settings_admin_update"
  on public.score_settings for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create table if not exists public.grade_boundaries (
  id uuid primary key default gen_random_uuid(),
  grade text not null unique,
  min_score numeric not null,
  max_score numeric not null,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grade_boundaries_range_check check (min_score <= max_score)
);

create trigger trg_grade_boundaries_updated_at before update on public.grade_boundaries
  for each row execute function public.set_updated_at();

alter table public.grade_boundaries enable row level security;

create policy "grade_boundaries_select_authenticated"
  on public.grade_boundaries for select
  using (public.get_user_role() is not null);

create policy "grade_boundaries_admin_insert"
  on public.grade_boundaries for insert
  with check (public.get_user_role() = 'admin');

create policy "grade_boundaries_admin_update"
  on public.grade_boundaries for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "grade_boundaries_admin_delete"
  on public.grade_boundaries for delete
  using (public.get_user_role() = 'admin');

-- Seed the default boundaries described in the Phase 3 brief. Safe to
-- edit or delete afterwards from Admin > Settings.
insert into public.grade_boundaries (grade, min_score, max_score, remark)
values
  ('A', 70, 100, 'Excellent'),
  ('B', 60, 69, 'Very Good'),
  ('C', 50, 59, 'Good'),
  ('D', 45, 49, 'Fair'),
  ('E', 40, 44, 'Pass'),
  ('F', 0, 39, 'Fail')
on conflict (grade) do nothing;

-- ============================================================
-- 5. RESULTS
-- ============================================================

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  academic_session_id uuid not null references public.academic_sessions(id) on delete cascade,
  term_id uuid not null references public.terms(id) on delete cascade,
  ca_score numeric not null default 0,
  exam_score numeric not null default 0,
  total numeric generated always as (ca_score + exam_score) stored,
  grade text,
  remark text,
  recorded_by uuid references public.profiles(id) on delete set null default public.get_profile_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint results_unique unique (student_id, subject_id, class_id, academic_session_id, term_id),
  -- Generous static ceiling as a last-resort safety net — the real
  -- "no score above maximum" business rule is enforced in the Server
  -- Action against the configurable score_settings row, since a CHECK
  -- constraint can't reference another table.
  constraint results_ca_range check (ca_score >= 0 and ca_score <= 1000),
  constraint results_exam_range check (exam_score >= 0 and exam_score <= 1000)
);

create index if not exists idx_results_student on public.results(student_id);
create index if not exists idx_results_class_subject on public.results(class_id, subject_id);
create index if not exists idx_results_session_term on public.results(academic_session_id, term_id);

create trigger trg_results_updated_at before update on public.results
  for each row execute function public.set_updated_at();

alter table public.results enable row level security;

create policy "results_select_authorized"
  on public.results for select
  using (
    public.get_user_role() = 'admin'
    or (
      public.get_user_role() = 'teacher'
      and public.is_assigned_to_class_subject(class_id, subject_id, academic_session_id)
    )
    or (
      public.get_user_role() = 'staff'
      and public.has_permission('manage_results')
    )
  );

create policy "results_insert_authorized"
  on public.results for insert
  with check (
    public.get_user_role() = 'admin'
    or (
      public.get_user_role() = 'teacher'
      and public.is_assigned_to_class_subject(class_id, subject_id, academic_session_id)
    )
    or (
      public.get_user_role() = 'staff'
      and public.has_permission('manage_results')
    )
  );

create policy "results_update_authorized"
  on public.results for update
  using (
    public.get_user_role() = 'admin'
    or (
      public.get_user_role() = 'teacher'
      and public.is_assigned_to_class_subject(class_id, subject_id, academic_session_id)
    )
    or (
      public.get_user_role() = 'staff'
      and public.has_permission('manage_results')
    )
  )
  with check (
    public.get_user_role() = 'admin'
    or (
      public.get_user_role() = 'teacher'
      and public.is_assigned_to_class_subject(class_id, subject_id, academic_session_id)
    )
    or (
      public.get_user_role() = 'staff'
      and public.has_permission('manage_results')
    )
  );

create policy "results_delete_admin_only"
  on public.results for delete
  using (public.get_user_role() = 'admin');
