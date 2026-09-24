-- ============================================================
-- School Management Portal — Phase 6 Administrative Controls
-- Run this in Supabase SQL Editor, or via `supabase db push`
--
-- Adds:
--   1. school_settings — singleton row holding school identity
--      (name, logo, address, phone, email, website)
--   2. A fix to activity_log's insert policy: previously admin-only,
--      which silently blocked every logActivity() call made from a
--      teacher/staff Server Action (attendance, results). Non-admin
--      inserts are now allowed, but only for the caller's own actor_id.
--   3. school-assets storage bucket for the school logo.
-- ============================================================

-- ============================================================
-- 1. SCHOOL_SETTINGS
-- ============================================================

create table if not exists public.school_settings (
  id smallint primary key default 1,
  school_name text,
  logo_path text,
  address text,
  phone text,
  email text,
  website text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint school_settings_singleton check (id = 1)
);

insert into public.school_settings (id) values (1) on conflict (id) do nothing;

create trigger trg_school_settings_updated_at before update on public.school_settings
  for each row execute function public.set_updated_at();

alter table public.school_settings enable row level security;

-- Every signed-in user may read the school profile (used for headers,
-- login page branding, printed documents, etc).
create policy "school_settings_select_authenticated"
  on public.school_settings for select
  using (public.get_user_role() is not null);

-- Only an admin may change it. Insert is included even though the
-- singleton row is seeded above, in case it was ever removed.
create policy "school_settings_admin_insert"
  on public.school_settings for insert
  with check (public.get_user_role() = 'admin');

create policy "school_settings_admin_update"
  on public.school_settings for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ============================================================
-- 2. FIX activity_log INSERT POLICY
-- ============================================================
-- Phase 2 restricted inserts to admins only. That silently dropped
-- every audit-log entry written by a teacher or staff Server Action
-- (attendance submitted, result entered) because logActivity() swallows
-- its own errors so a logging failure never blocks the real action.
-- Replace it with a policy open to any authenticated user, but scoped
-- so a caller can only ever write a row attributed to themselves —
-- actor_id defaults to get_profile_id() and this check enforces it
-- can't be forged to attribute an entry to someone else.

drop policy if exists "activity_log_admin_insert" on public.activity_log;

create policy "activity_log_insert_self"
  on public.activity_log for insert
  with check (
    public.get_user_role() is not null
    and (actor_id is null or actor_id = public.get_profile_id())
  );

-- Select stays admin-only — audit logs must only be viewable by admins.
-- (activity_log_select_admin already exists from Phase 2; no change.)

-- ============================================================
-- 3. STORAGE — public bucket for the school logo
-- ============================================================
-- The logo is displayed on the login screen and in document headers
-- before a session exists, so it needs to be publicly readable (unlike
-- student photos or uploaded documents, it isn't sensitive). Writes
-- remain admin-only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-assets',
  'school-assets',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "school_assets_public_read" on storage.objects;
create policy "school_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'school-assets');

drop policy if exists "school_assets_admin_write" on storage.objects;
create policy "school_assets_admin_write"
  on storage.objects for insert
  with check (bucket_id = 'school-assets' and public.get_user_role() = 'admin');

drop policy if exists "school_assets_admin_update" on storage.objects;
create policy "school_assets_admin_update"
  on storage.objects for update
  using (bucket_id = 'school-assets' and public.get_user_role() = 'admin')
  with check (bucket_id = 'school-assets' and public.get_user_role() = 'admin');

drop policy if exists "school_assets_admin_delete" on storage.objects;
create policy "school_assets_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'school-assets' and public.get_user_role() = 'admin');
