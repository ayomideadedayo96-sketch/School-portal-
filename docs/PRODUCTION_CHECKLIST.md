# Production Checklist

Check every box before real student/staff data goes into this system.
Items marked **(unresolved)** are known gaps as of Phase 7 — see
`PRODUCTION_READINESS_REPORT.md` §9 for detail.

## Supabase project
- [ ] Project created on a paid-enough tier for expected usage (free
      tier has rate limits on auth emails — hit during this project's
      own setup)
- [ ] Correct project's URL/keys used everywhere (mixing two projects'
      credentials was a real issue hit during this project's own launch)

## Database migrations
- [ ] All 7 migrations run, in order, each confirmed "Success" before
      the next (0007 adds search indexes — new this pass, run it too)
- [ ] Spot-check: `select count(*) from public.profiles;` returns
      without error (confirms the schema is actually in place)

## Row Level Security
- [ ] Confirmed via `PRODUCTION_READINESS_REPORT.md` §3 — all 19
      tables have RLS enabled with policies for every operation the app
      uses
- [ ] **(unresolved)** No independent penetration test / live
      unauthorized-access attempt has been performed against the
      deployed instance — this report is a code review, not a live
      attack simulation

## Authentication
- [ ] Email provider enabled in Supabase
- [ ] Site URL and Redirect URLs point at the **production** domain,
      not localhost
- [ ] First admin account created and confirmed able to log in
- [ ] **(unresolved — needs you)** Only one admin account exists — no
      recovery path if it's locked out. Fix: `/admin/staff/new` in the
      portal, invite a second Admin. 2 minutes, no code needed.

## Storage policies
- [ ] `student-photos` — admin-only (confirmed)
- [ ] `school-documents` — role/audience-scoped (confirmed)
- [ ] `school-assets` (logo) — intentionally public-read, admin-write
      only (confirmed; this is correct, not a leak)

## Environment variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set, matches the correct project
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set, matches the same project
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set, marked secret, matches the same
      project
- [ ] All three copied fresh from the same Settings → API screen in one
      sitting (see Deployment Guide — mixing projects was a real issue)

## Netlify deployment
- [ ] Repo connected, `@netlify/plugin-nextjs` auto-detected
- [ ] Production build succeeds with no errors
- [ ] Live site loads `/login` without a Supabase connection error
- [ ] Login tested end-to-end on the live URL (not just localhost)

## Domain configuration
- [ ] **(unresolved — needs you)** Still on the default
      `*.netlify.app` subdomain. Fix: Netlify → Domain management → Add
      a domain, then add the DNS records it shows you at your registrar.

## Admin account
- [ ] At least one confirmed working admin login
- [ ] Admin account's role verified as `admin` in `/admin/users`

## Test users
- [ ] **(unresolved — needs you)** No dedicated teacher/staff test
      accounts exist yet. Fix: `/admin/staff/new`, invite one of each,
      log in as both once, confirm their dashboards show only what they
      should.

## Database backup strategy
- [x] **Resolved** — `.github/workflows/backup.yml` runs a scheduled
      `pg_dump` daily, kept 30 days as GitHub Actions artifacts. Add the
      `DATABASE_URL` secret per `docs/BACKUP_STRATEGY.md` to activate it
      — that one step is the only thing left for you to do here.
