-- ============================================================
-- School Management Portal — Phase 7 follow-up
-- Adds trigram indexes to support fast ILIKE '%text%' search on the
-- name/email columns the app already searches (students, staff/users).
-- Flagged as "not urgent at current scale" in the Phase 7 readiness
-- report, but cheap to add now rather than wait for it to matter.
-- ============================================================

create extension if not exists pg_trgm;

create index if not exists idx_profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);

create index if not exists idx_profiles_email_trgm
  on public.profiles using gin (email gin_trgm_ops);

create index if not exists idx_students_full_name_trgm
  on public.students using gin (full_name gin_trgm_ops);

create index if not exists idx_students_admission_number_trgm
  on public.students using gin (admission_number gin_trgm_ops);
