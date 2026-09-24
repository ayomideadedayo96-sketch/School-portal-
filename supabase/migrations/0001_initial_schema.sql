-- ============================================================
-- School Management Portal — Phase 1 Initial Schema
-- Run this in Supabase SQL Editor, or via `supabase db push`
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Academic sessions (e.g. "2025/2026")
create table if not exists public.academic_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_sessions_dates_check check (end_date > start_date)
);

-- Terms within an academic session (e.g. "First Term")
create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  academic_session_id uuid not null references public.academic_sessions(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terms_dates_check check (end_date > start_date),
  constraint terms_unique_name_per_session unique (academic_session_id, name)
);

-- Profiles: one row per authenticated user, linked to auth.users
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'teacher', 'staff')),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Staff employment details (covers both teaching and non-teaching staff)
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  employee_id text unique,
  staff_type text not null check (staff_type in ('teaching', 'non_teaching')),
  department text,
  position text,
  date_joined date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Classes (e.g. "JSS 1A")
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text,
  academic_session_id uuid not null references public.academic_sessions(id) on delete restrict,
  class_teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_unique_name_per_session unique (name, academic_session_id)
);

-- Subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Teacher assignments: which teacher teaches which subject in which class
create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  academic_session_id uuid not null references public.academic_sessions(id) on delete cascade,
  term_id uuid references public.terms(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_assignments_unique unique (teacher_id, subject_id, class_id, academic_session_id)
);

-- Students (minimal placeholder — full student management arrives in Phase 2)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  admission_number text not null unique,
  full_name text not null,
  class_id uuid references public.classes(id) on delete set null,
  gender text check (gender in ('male', 'female')),
  date_of_birth date,
  guardian_name text,
  guardian_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_user_id on public.profiles(user_id);

create index if not exists idx_staff_profile_id on public.staff(profile_id);

create index if not exists idx_classes_session on public.classes(academic_session_id);
create index if not exists idx_classes_class_teacher on public.classes(class_teacher_id);

create index if not exists idx_terms_session on public.terms(academic_session_id);

create index if not exists idx_teacher_assignments_teacher on public.teacher_assignments(teacher_id);
create index if not exists idx_teacher_assignments_class on public.teacher_assignments(class_id);
create index if not exists idx_teacher_assignments_subject on public.teacher_assignments(subject_id);
create index if not exists idx_teacher_assignments_session on public.teacher_assignments(academic_session_id);

create index if not exists idx_students_class on public.students(class_id);
create index if not exists idx_students_admission_number on public.students(admission_number);

-- ============================================================
-- 3. updated_at TRIGGER (generic, reused by every table)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();
create trigger trg_classes_updated_at before update on public.classes
  for each row execute function public.set_updated_at();
create trigger trg_subjects_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();
create trigger trg_teacher_assignments_updated_at before update on public.teacher_assignments
  for each row execute function public.set_updated_at();
create trigger trg_academic_sessions_updated_at before update on public.academic_sessions
  for each row execute function public.set_updated_at();
create trigger trg_terms_updated_at before update on public.terms
  for each row execute function public.set_updated_at();
create trigger trg_students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. AUTO-CREATE PROFILE ON NEW AUTH USER
-- ============================================================
-- Admins create accounts via Supabase Dashboard > Authentication > Users >
-- "Invite user" (or the Admin API), setting user metadata to:
--   { "full_name": "Jane Doe", "role": "teacher" }
-- This trigger reads that metadata and creates the matching profile row
-- automatically, so nobody ever has to insert into `profiles` by hand.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 5. HELPER FUNCTIONS used by RLS policies
-- ============================================================

-- Returns the caller's role ('admin' | 'teacher' | 'staff'), or null.
-- security definer + a fixed search_path avoids the classic RLS
-- infinite-recursion problem you get from querying `profiles`
-- directly inside a `profiles` policy.
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

-- Returns the caller's own profiles.id.
create or replace function public.get_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid();
$$;

-- Guard: only an admin may change someone's role (blocks privilege
-- escalation via a self-service profile update).
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and public.get_user_role() is distinct from 'admin' then
    raise exception 'Only administrators can change a user role.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.staff enable row level security;
alter table public.academic_sessions enable row level security;
alter table public.terms enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.students enable row level security;

-- ---------- profiles ----------
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (user_id = auth.uid() or public.get_user_role() = 'admin');

create policy "profiles_insert_admin_only"
  on public.profiles for insert
  with check (public.get_user_role() = 'admin');

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (user_id = auth.uid() or public.get_user_role() = 'admin')
  with check (user_id = auth.uid() or public.get_user_role() = 'admin');

create policy "profiles_delete_admin_only"
  on public.profiles for delete
  using (public.get_user_role() = 'admin');

-- ---------- staff ----------
create policy "staff_select_own_or_admin"
  on public.staff for select
  using (profile_id = public.get_profile_id() or public.get_user_role() = 'admin');

create policy "staff_admin_insert"
  on public.staff for insert
  with check (public.get_user_role() = 'admin');

create policy "staff_admin_update"
  on public.staff for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "staff_admin_delete"
  on public.staff for delete
  using (public.get_user_role() = 'admin');

-- ---------- academic_sessions (reference data: readable by anyone signed in) ----------
create policy "academic_sessions_select_authenticated"
  on public.academic_sessions for select
  using (public.get_user_role() is not null);

create policy "academic_sessions_admin_insert"
  on public.academic_sessions for insert
  with check (public.get_user_role() = 'admin');

create policy "academic_sessions_admin_update"
  on public.academic_sessions for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "academic_sessions_admin_delete"
  on public.academic_sessions for delete
  using (public.get_user_role() = 'admin');

-- ---------- terms ----------
create policy "terms_select_authenticated"
  on public.terms for select
  using (public.get_user_role() is not null);

create policy "terms_admin_insert"
  on public.terms for insert
  with check (public.get_user_role() = 'admin');

create policy "terms_admin_update"
  on public.terms for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "terms_admin_delete"
  on public.terms for delete
  using (public.get_user_role() = 'admin');

-- ---------- classes ----------
create policy "classes_select_authenticated"
  on public.classes for select
  using (public.get_user_role() is not null);

create policy "classes_admin_insert"
  on public.classes for insert
  with check (public.get_user_role() = 'admin');

create policy "classes_admin_update"
  on public.classes for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "classes_admin_delete"
  on public.classes for delete
  using (public.get_user_role() = 'admin');

-- ---------- subjects ----------
create policy "subjects_select_authenticated"
  on public.subjects for select
  using (public.get_user_role() is not null);

create policy "subjects_admin_insert"
  on public.subjects for insert
  with check (public.get_user_role() = 'admin');

create policy "subjects_admin_update"
  on public.subjects for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "subjects_admin_delete"
  on public.subjects for delete
  using (public.get_user_role() = 'admin');

-- ---------- teacher_assignments ----------
create policy "teacher_assignments_select_own_or_admin"
  on public.teacher_assignments for select
  using (teacher_id = public.get_profile_id() or public.get_user_role() = 'admin');

create policy "teacher_assignments_admin_insert"
  on public.teacher_assignments for insert
  with check (public.get_user_role() = 'admin');

create policy "teacher_assignments_admin_update"
  on public.teacher_assignments for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "teacher_assignments_admin_delete"
  on public.teacher_assignments for delete
  using (public.get_user_role() = 'admin');

-- ---------- students ----------
-- Admins see everyone; a teacher sees only students in a class they are
-- assigned to teach. Staff have no access to student rows in Phase 1
-- (student management itself is built in a later phase).
create policy "students_select_admin_or_assigned_teacher"
  on public.students for select
  using (
    public.get_user_role() = 'admin'
    or exists (
      select 1 from public.teacher_assignments ta
      where ta.class_id = students.class_id
        and ta.teacher_id = public.get_profile_id()
    )
  );

create policy "students_admin_insert"
  on public.students for insert
  with check (public.get_user_role() = 'admin');

create policy "students_admin_update"
  on public.students for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "students_admin_delete"
  on public.students for delete
  using (public.get_user_role() = 'admin');
