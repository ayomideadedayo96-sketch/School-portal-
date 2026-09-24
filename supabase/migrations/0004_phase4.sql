-- ============================================================
-- School Management Portal — Phase 4 Migration
-- Teacher Dashboard, Timetable, Announcements & Documents.
-- Run this AFTER 0001, 0002, and 0003, in Supabase SQL Editor
-- or via `supabase db push`.
-- ============================================================

-- ============================================================
-- 1. TIMETABLE
-- ============================================================

create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  academic_session_id uuid not null references public.academic_sessions(id) on delete cascade,
  day_of_week text not null check (
    day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
  period smallint not null check (period between 1 and 12),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A class cannot have two different lessons in the same period on the
  -- same day, within the same session.
  constraint timetable_unique_class_slot unique (class_id, academic_session_id, day_of_week, period)
);

create index if not exists idx_timetable_class on public.timetable_entries(class_id);
create index if not exists idx_timetable_teacher on public.timetable_entries(teacher_id);
create index if not exists idx_timetable_session_day on public.timetable_entries(academic_session_id, day_of_week);

create trigger trg_timetable_entries_updated_at before update on public.timetable_entries
  for each row execute function public.set_updated_at();

alter table public.timetable_entries enable row level security;

-- Admins see everything. A teacher sees only entries where they are the
-- assigned teacher for that period, or where they are the class teacher
-- (homeroom) for the class the entry belongs to — this is what "relevant
-- to their assignments" means for the timetable.
create policy "timetable_select_admin_or_relevant_teacher"
  on public.timetable_entries for select
  using (
    public.get_user_role() = 'admin'
    or (
      public.get_user_role() = 'teacher'
      and (
        teacher_id = public.get_profile_id()
        or exists (
          select 1 from public.classes c
          where c.id = timetable_entries.class_id
            and c.class_teacher_id = public.get_profile_id()
        )
      )
    )
  );

create policy "timetable_admin_insert"
  on public.timetable_entries for insert
  with check (public.get_user_role() = 'admin');

create policy "timetable_admin_update"
  on public.timetable_entries for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "timetable_admin_delete"
  on public.timetable_entries for delete
  using (public.get_user_role() = 'admin');

-- ============================================================
-- 2. ANNOUNCEMENTS
-- ============================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'teachers')),
  created_by uuid references public.profiles(id) on delete set null default public.get_profile_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_announcements_created_at on public.announcements(created_at desc);

create trigger trg_announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;

create policy "announcements_select_admin_or_audience"
  on public.announcements for select
  using (
    public.get_user_role() = 'admin'
    or audience = 'all'
    or (audience = 'teachers' and public.get_user_role() = 'teacher')
  );

create policy "announcements_admin_insert"
  on public.announcements for insert
  with check (public.get_user_role() = 'admin');

create policy "announcements_admin_update"
  on public.announcements for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "announcements_admin_delete"
  on public.announcements for delete
  using (public.get_user_role() = 'admin');

-- ============================================================
-- 3. DOCUMENTS
-- ============================================================
-- A document is a link (e.g. Supabase Storage public/signed URL, Google
-- Drive link, etc.) rather than an uploaded blob, keeping this phase
-- storage-agnostic. `class_id` narrows a document to one class; leave it
-- null for a school-wide document.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text not null,
  audience text not null default 'all' check (audience in ('all', 'teachers')),
  class_id uuid references public.classes(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null default public.get_profile_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_created_at on public.documents(created_at desc);
create index if not exists idx_documents_class on public.documents(class_id);

create trigger trg_documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

create policy "documents_select_admin_or_relevant_teacher"
  on public.documents for select
  using (
    public.get_user_role() = 'admin'
    or (
      public.get_user_role() = 'teacher'
      and audience in ('all', 'teachers')
      and (
        class_id is null
        or exists (
          select 1 from public.classes c
          where c.id = documents.class_id and c.class_teacher_id = public.get_profile_id()
        )
        or exists (
          select 1 from public.teacher_assignments ta
          where ta.class_id = documents.class_id and ta.teacher_id = public.get_profile_id()
        )
      )
    )
  );

create policy "documents_admin_insert"
  on public.documents for insert
  with check (public.get_user_role() = 'admin');

create policy "documents_admin_update"
  on public.documents for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "documents_admin_delete"
  on public.documents for delete
  using (public.get_user_role() = 'admin');
