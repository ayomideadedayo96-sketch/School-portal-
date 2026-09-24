-- ============================================================
-- School Management Portal — Phase 4b Migration
-- Upgrades documents from link-sharing to real Supabase Storage
-- uploads, and upgrades announcements with scheduling/archiving.
-- Run this AFTER 0001–0004, in Supabase SQL Editor or via
-- `supabase db push`.
-- ============================================================

-- ============================================================
-- 1. DOCUMENTS — switch from a pasted link to an uploaded file
-- ============================================================

-- The column held a full URL before; it now holds the Storage object
-- path inside the 'school-documents' bucket (e.g. "3f2a…-report.pdf").
-- Actual access URLs are always short-lived signed URLs minted
-- server-side, never a stored public URL.
alter table public.documents rename column file_url to file_path;

alter table public.documents
  add column if not exists file_name text not null default '',
  add column if not exists file_type text not null default '',
  add column if not exists file_size bigint not null default 0;

alter table public.documents alter column file_name drop default;
alter table public.documents alter column file_type drop default;
alter table public.documents alter column file_size drop default;

-- Widen audience to match Phase 4's four audiences, and require a
-- class to be picked whenever "Specific Class" is chosen.
alter table public.documents drop constraint if exists documents_audience_check;
alter table public.documents
  add constraint documents_audience_check
  check (audience in ('all', 'teachers', 'staff', 'class'));

alter table public.documents drop constraint if exists documents_class_required_for_class_audience;
alter table public.documents
  add constraint documents_class_required_for_class_audience
  check (audience <> 'class' or class_id is not null);

alter table public.documents drop constraint if exists documents_file_type_check;
alter table public.documents
  add constraint documents_file_type_check
  check (file_type in ('pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'));

comment on column public.documents.file_path is
  'Object path inside the private school-documents Storage bucket. Not a public URL — resolve with createSignedUrl.';

-- Replace Phase 4's simple select policy with one covering all four
-- audiences: everyone ("all"), teachers, staff, and a specific class
-- (visible to its homeroom teacher and any teacher assigned to it).
drop policy if exists "documents_select_admin_or_relevant_teacher" on public.documents;
drop policy if exists "documents_select_role_based" on public.documents;
create policy "documents_select_role_based"
  on public.documents for select
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and audience in ('all', 'teachers'))
    or (public.get_user_role() = 'staff' and audience in ('all', 'staff'))
    or (
      audience = 'class'
      and public.get_user_role() = 'teacher'
      and (
        exists (
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

drop policy if exists "documents_admin_insert" on public.documents;
create policy "documents_admin_insert"
  on public.documents for insert
  with check (public.get_user_role() = 'admin');

drop policy if exists "documents_admin_update" on public.documents;
create policy "documents_admin_update"
  on public.documents for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

drop policy if exists "documents_admin_delete" on public.documents;
create policy "documents_admin_delete"
  on public.documents for delete
  using (public.get_user_role() = 'admin');

-- ============================================================
-- 2. ANNOUNCEMENTS — audiences, scheduling, expiry, archiving
-- ============================================================

alter table public.announcements
  add column if not exists class_id uuid references public.classes(id) on delete set null,
  add column if not exists publish_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists is_archived boolean not null default false;

alter table public.announcements drop constraint if exists announcements_audience_check;
alter table public.announcements
  add constraint announcements_audience_check
  check (audience in ('all', 'teachers', 'staff', 'class'));

alter table public.announcements drop constraint if exists announcements_class_required_for_class_audience;
alter table public.announcements
  add constraint announcements_class_required_for_class_audience
  check (audience <> 'class' or class_id is not null);

alter table public.announcements drop constraint if exists announcements_expiry_after_publish;
alter table public.announcements
  add constraint announcements_expiry_after_publish
  check (expires_at is null or expires_at > publish_at);

create index if not exists idx_announcements_class on public.announcements(class_id);

comment on column public.announcements.publish_at is
  'When the announcement becomes visible to its audience. Defaults to immediately.';
comment on column public.announcements.expires_at is
  'When the announcement stops being "active". Null means it never expires on its own.';
comment on column public.announcements.is_archived is
  'Manually hidden by an admin, independent of the publish/expiry window.';

-- Admins always see every announcement (so they can manage drafts,
-- expired posts, and archived ones). Everyone else only sees
-- announcements that are currently active: not archived, published,
-- not yet expired, and addressed to their audience.
drop policy if exists "announcements_select_admin_or_audience" on public.announcements;
drop policy if exists "announcements_select_active_for_audience" on public.announcements;
create policy "announcements_select_active_for_audience"
  on public.announcements for select
  using (
    public.get_user_role() = 'admin'
    or (
      not is_archived
      and publish_at <= now()
      and (expires_at is null or expires_at > now())
      and (
        audience = 'all'
        or (audience = 'teachers' and public.get_user_role() = 'teacher')
        or (audience = 'staff' and public.get_user_role() = 'staff')
        or (
          audience = 'class'
          and public.get_user_role() = 'teacher'
          and (
            exists (
              select 1 from public.classes c
              where c.id = announcements.class_id and c.class_teacher_id = public.get_profile_id()
            )
            or exists (
              select 1 from public.teacher_assignments ta
              where ta.class_id = announcements.class_id and ta.teacher_id = public.get_profile_id()
            )
          )
        )
      )
    )
  );

drop policy if exists "announcements_admin_insert" on public.announcements;
create policy "announcements_admin_insert"
  on public.announcements for insert
  with check (public.get_user_role() = 'admin');

drop policy if exists "announcements_admin_update" on public.announcements;
create policy "announcements_admin_update"
  on public.announcements for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

drop policy if exists "announcements_admin_delete" on public.announcements;
create policy "announcements_admin_delete"
  on public.announcements for delete
  using (public.get_user_role() = 'admin');

-- ============================================================
-- 3. STORAGE — private bucket for uploaded documents
-- ============================================================
-- Same Supabase Storage project/bucket approach as student-photos
-- (Phase 2): a private bucket, accessed only via short-lived signed
-- URLs minted server-side after the documents-table RLS has already
-- confirmed the caller may see that row.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-documents',
  'school-documents',
  false,
  10485760, -- 10 MB per file
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "school_documents_admin_insert" on storage.objects;
create policy "school_documents_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'school-documents' and public.get_user_role() = 'admin');

drop policy if exists "school_documents_admin_update" on storage.objects;
create policy "school_documents_admin_update"
  on storage.objects for update
  using (bucket_id = 'school-documents' and public.get_user_role() = 'admin')
  with check (bucket_id = 'school-documents' and public.get_user_role() = 'admin');

drop policy if exists "school_documents_admin_delete" on storage.objects;
create policy "school_documents_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'school-documents' and public.get_user_role() = 'admin');

-- Read access is derived entirely from the documents table's own RLS:
-- a storage object is only selectable if some row in public.documents
-- points at it AND that row is visible to the caller under
-- documents_select_role_based above (RLS applies inside this EXISTS
-- too). This is the enforcement point that keeps a teacher or staff
-- member from reading a file whose document row isn't addressed to
-- them, even if they somehow learned its storage path.
drop policy if exists "school_documents_select_matching_document" on storage.objects;
create policy "school_documents_select_matching_document"
  on storage.objects for select
  using (
    bucket_id = 'school-documents'
    and exists (select 1 from public.documents d where d.file_path = storage.objects.name)
  );
