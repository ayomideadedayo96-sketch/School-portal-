-- ============================================================
-- School Management Portal — Phase 2 Migration
-- Run this AFTER 0001_initial_schema.sql, in Supabase SQL Editor
-- or via `supabase db push`.
-- ============================================================

-- ============================================================
-- 1. STUDENTS — split full_name into first/middle/last, add
--    address, photo_url, admission_date, status
-- ============================================================

alter table public.students
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists address text,
  add column if not exists photo_url text,
  add column if not exists admission_date date not null default current_date,
  add column if not exists status text not null default 'active';

-- Backfill from the old full_name column if any Phase 1 rows exist.
update public.students
set
  first_name = coalesce(first_name, split_part(full_name, ' ', 1)),
  last_name = coalesce(last_name, nullif(full_name, ''), 'Unknown')
where first_name is null or last_name is null;

alter table public.students
  alter column first_name set not null,
  alter column last_name set not null;

alter table public.students drop column if exists full_name;

-- Convenience generated column for display/search — always derived,
-- never written to directly.
alter table public.students
  add column full_name text generated always as (
    trim(both ' ' from first_name || ' ' || coalesce(middle_name || ' ', '') || last_name)
  ) stored;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'students_status_check'
  ) then
    alter table public.students
      add constraint students_status_check check (status in ('active', 'archived'));
  end if;
end $$;

create index if not exists idx_students_status on public.students(status);

-- ============================================================
-- 2. STAFF — add status
-- ============================================================

alter table public.staff
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'staff_status_check'
  ) then
    alter table public.staff
      add constraint staff_status_check check (status in ('active', 'inactive'));
  end if;
end $$;

create index if not exists idx_staff_status on public.staff(status);

-- ============================================================
-- 3. CLASSES — add status
-- ============================================================

alter table public.classes
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'classes_status_check'
  ) then
    alter table public.classes
      add constraint classes_status_check check (status in ('active', 'archived'));
  end if;
end $$;

create index if not exists idx_classes_status on public.classes(status);

-- ============================================================
-- 4. CLASS_SUBJECTS — which subjects are offered in which class
-- ============================================================

create table if not exists public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  academic_session_id uuid not null references public.academic_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint class_subjects_unique unique (class_id, subject_id, academic_session_id)
);

create index if not exists idx_class_subjects_class on public.class_subjects(class_id);
create index if not exists idx_class_subjects_subject on public.class_subjects(subject_id);

alter table public.class_subjects enable row level security;

create policy "class_subjects_select_authenticated"
  on public.class_subjects for select
  using (public.get_user_role() is not null);

create policy "class_subjects_admin_insert"
  on public.class_subjects for insert
  with check (public.get_user_role() = 'admin');

create policy "class_subjects_admin_delete"
  on public.class_subjects for delete
  using (public.get_user_role() = 'admin');

-- ============================================================
-- 5. ACTIVITY_LOG — feeds the "Recent activity" dashboard panel
-- ============================================================

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null default public.get_profile_id(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_created_at on public.activity_log(created_at desc);

alter table public.activity_log enable row level security;

create policy "activity_log_select_admin"
  on public.activity_log for select
  using (public.get_user_role() = 'admin');

create policy "activity_log_admin_insert"
  on public.activity_log for insert
  with check (public.get_user_role() = 'admin');

-- ============================================================
-- 6. STORAGE — private bucket for student photos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', false)
on conflict (id) do nothing;

drop policy if exists "student_photos_admin_all" on storage.objects;
create policy "student_photos_admin_all"
  on storage.objects for all
  using (bucket_id = 'student-photos' and public.get_user_role() = 'admin')
  with check (bucket_id = 'student-photos' and public.get_user_role() = 'admin');

-- ============================================================
-- 7. Allow admins to update class_teacher_id via classes (already
--    covered by classes_admin_update from Phase 1 — no change needed).
-- ============================================================
