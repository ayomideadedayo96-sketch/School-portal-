# Production Readiness Report — Phase 7

**Method note (read this first):** This was a static code audit, not a
live click-through. Every RLS policy, route guard, and helper function
in the codebase was read directly — which catches things a manual click
test would miss (e.g. a second, more permissive policy silently OR'd in
behind the one you can see in the UI). But it does **not** replace a
human actually clicking every button in a browser before real students'
data goes in. Section 9 lists what still needs that hands-on pass.

---

## 1. Authentication — reviewed

| Item | Status | Notes |
|---|---|---|
| Admin / Teacher / Staff login | ✅ | Single login form; role is read from `profiles` after auth and routes to `/admin`, `/teacher`, or `/staff`. |
| Logout | ✅ | `LogoutButton.tsx` calls `supabase.auth.signOut()`. |
| Password reset | ✅ | `/forgot-password` → email link → `/update-password`. Confirmed working live during deployment (with one real gotcha, see §9). |
| Protected routes | ✅ | Each of `admin/layout.tsx`, `teacher/layout.tsx`, `staff/layout.tsx` independently redirects unauthenticated users to `/login` and wrong-role users to their own dashboard or `/unauthorized` — server-rendered, so this can't be bypassed by disabling JS. Middleware refreshes the session on every route. |

## 2. Security testing — reviewed at the policy level

**Do teachers/staff get blocked from admin pages?** Yes — server-side,
before any data loads (§1 above), not just a hidden nav link.

**Can a teacher modify a class/subject they're not assigned to?**
No. `results` and `attendance` INSERT/UPDATE policies require
`is_assigned_to_class_subject(class_id, subject_id, session_id)`, which
checks the `teacher_assignments` table — not just "is a teacher."
Verified this function is `security definer` with `search_path = public`
pinned (prevents a search-path hijack), and reads `auth.uid()` directly
rather than trusting anything the client sends.

**Can staff modify results?** No, unless explicitly granted. The
`results` policies require `has_permission('manage_results')`, which
checks a `staff_permissions` row that only an admin can insert (staff
cannot grant themselves permissions — no staff-facing INSERT policy
exists on `staff_permissions`).

**Can a user change their own role?** No. `prevent_role_self_escalation`
is a database trigger (not just a UI restriction) that rejects any role
change unless the *acting* user's own role is already admin. This is
enforced even against a direct SQL Editor session — we hit this exact
protection live while bootstrapping the first admin account, which is
the correct behavior (see the workaround documented in the README and
in the Deployment Guide).

**Can a user read another user's private data, or a file they shouldn't
access?** Reviewed table-by-table — see §3. Storage bucket policies
(`student-photos`, `school-documents`, `school-assets`) are role- and
audience-scoped except `school-assets` (the logo), which is intentionally
public since it needs to render on the login page before any session
exists.

**Does RLS actually block this, not just the frontend?** Yes — all
authorization above is enforced in Postgres policies, which apply
regardless of which client (browser, `curl`, someone's own script) makes
the request. The frontend hiding a button is a UX nicety, not the
security boundary, anywhere in this app.

## 3. Database security — verified directly against the migration files

- **RLS enabled on every table:** confirmed 19/19 tables have
  `enable row level security`, with a 1:1 match against every
  `create table` statement across all 6 migrations. None missed.
- **SELECT/INSERT/UPDATE/DELETE policies:** every table has an explicit
  policy for every operation it needs. A few tables (e.g.
  `class_subjects`, `score_settings`, `grade_boundaries`) intentionally
  have no UPDATE or DELETE policy where the app's own design never
  updates/deletes those rows a different way (e.g. class-subject links
  are removed, not edited) — this is correct, not a gap.
- **Foreign keys:** every child table references its parent with
  `references ... on delete cascade` or `on delete set null`, chosen
  deliberately per relationship (e.g. deleting a student cascades their
  results/attendance; deleting the recording teacher's profile just
  nulls `recorded_by` rather than deleting the historical record).
- **Sensitive fields:** `SUPABASE_SERVICE_ROLE_KEY` is only read in two
  server-only files (`lib/supabase/admin.ts`, `lib/utils/lastLogin.ts`),
  neither imported by any `'use client'` file — confirmed via a
  dependency-chain grep, not just a name search.

## 4. Performance — findings and fixes applied this phase

- Pagination already existed on the largest lists (students, staff,
  users, activity log, documents, classes) from earlier phases.
- **Fixed:** Announcements had no pagination and grows unboundedly over
  the life of the school — now paginated (20/page).
- **Reviewed, no fix needed:** Attendance and Results pages are
  naturally bounded — they're filtered to one class + one date/term at
  a time by the page itself, never loading the full historical table.
- **Reviewed, no fix needed:** Subjects/Settings lists are inherently
  small (a school has dozens of subjects, not thousands) — pagination
  would be over-engineering at this scale.
- **Fixed:** the one avatar image pulled from Supabase Storage
  (`students/[id]`) now uses `next/image` instead of a plain `<img>`,
  with `remotePatterns` configured for `*.supabase.co`. The other two
  `<img>` usages are live upload previews (blob URLs) that `next/image`
  genuinely can't optimize — left as-is, correctly.
- **Not fixed, noted for later:** `full_name`/`email` search (`ilike`)
  has no supporting index. At single-school scale (hundreds, not tens
  of thousands of rows) a sequential scan is fine; if a deployment ever
  grows past a few thousand students/staff, add a `pg_trgm` GIN index
  on those columns.

## 5. Mobile / responsive — findings and fixes applied

- **Fixed:** 3 tables (Settings → grading, Subjects, the printable
  result report) weren't wrapped in a horizontal-scroll container, so a
  wide table could overflow the screen on a phone. All three now scroll
  independently within their own container instead of breaking the page
  layout.
- **Not verified live:** I read the CSS/layout code for
  responsiveness but did not open the deployed site on an actual tablet
  or Android device. Given the app already uses Tailwind's responsive
  utilities consistently elsewhere, this is low-risk, but §9 lists it
  as still needing a real device check.

## 6. Error handling — fixed this phase

- **Fixed:** ~23 places across 9 server-action files were returning
  the raw Postgres/Supabase `error.message` straight to the UI — this
  could leak table/column/constraint names to end users. Replaced with
  a shared `toFriendlyError()` helper that maps common error classes
  (duplicate key, foreign key violation, permission denied, network
  failure) to plain-English messages, while still logging the real
  error server-side (`console.error`, visible in Netlify function logs)
  for debugging.
- **Fixed:** there was no global error boundary or 404 page — an
  unhandled exception showed Next.js's raw default crash screen. Added
  `src/app/global-error.tsx` and `src/app/not-found.tsx`, both styled to
  match the rest of the app.
- **Reviewed:** form validation, failed uploads, and "record not found"
  cases were already handled reasonably in most flows from earlier
  phases (e.g. document upload rejects oversized/wrong-type files before
  hitting storage). Not exhaustively re-tested click-by-click this pass.

## 7. Deployment configuration — see `docs/DEPLOYMENT_GUIDE.md`

## 8. Production checklist — see `docs/PRODUCTION_CHECKLIST.md`

---

## 9. Unresolved issues — do not skip this section

Per instruction, this app is **not** being declared production-ready.
Since the last version of this report, I resolved everything that was
resolvable through code, and found and fixed one real bug in the
process. What's left genuinely requires either your own account access
(I can't log into your Supabase/Netlify/domain registrar) or an actual
browser/device to click through (I have neither).

### Resolved since the last report (round 2 — reported live bug)

- **Real crash, found from your live screenshot:** `/admin/timetable`
  threw `invalid input syntax for type uuid: ""` whenever no academic
  session was set as current and none was selected in the filter —
  the query ran with an empty-string session id instead of skipping
  the query. Fixed, and while fixing it I checked the same pattern
  (`searchParams.x || current?.id || ''`) everywhere else it appears:
  `teacher/timetable` and `teacher/students` were already correctly
  guarded (no bug there), but the **student result report**
  (`admin/results/report/[studentId]`) had the same gap — it wasn't
  crashing (the error was silently swallowed), but was silently
  showing "no results" instead of the real ones whenever no
  session/term was resolved. Fixed the same way. Also fixed two more
  raw-error-message leaks found along the way (`admin/timetable`,
  `teacher/timetable`).

- **Search columns had no index** — added `pg_trgm` GIN indexes on
  `profiles.full_name`, `profiles.email`, `students.full_name`, and
  `students.admission_number` (migration `0007_search_indexes.sql`).
  Run it the same way as the others: SQL Editor, in order.
- **No database backup strategy** — built a real one, not just a
  recommendation: `.github/workflows/backup.yml` runs a scheduled
  `pg_dump` daily and keeps 30 days of backups as GitHub Actions
  artifacts, free-tier compatible. Needs exactly one secret
  (`DATABASE_URL`) added to your GitHub repo — see
  `docs/BACKUP_STRATEGY.md` for the 6-step setup and a tested restore
  procedure.
- **Bonus find while re-tracing the untested flows below:** two spots
  in `admin/timetable/actions.ts` (create and update) were still
  leaking a raw database error message — they used a different code
  pattern (a ternary with a local variable) that my original automated
  fix didn't match. Found via manual trace, now fixed.

### Cannot be resolved by me — needs your action

1. **Second admin account** — I can't create Supabase users on your
   behalf. Takes 2 minutes: `/admin/staff/new` in the portal itself
   (not Supabase directly, now that one admin account exists) →
   invite a second person with the Admin role.
2. **Test users** — same reason. Invite one Teacher and one Staff
   account the same way, log in as each once, and confirm their
   dashboards show only what they should.
3. **Custom domain** — requires your domain registrar and Netlify
   account. Netlify → Domain management → Add a domain, then add the
   DNS records it gives you at your registrar.
4. **Live click-through testing** — I traced the actual logic (not
   just skimmed) for Timetable create/edit/delete, Document
   upload/delete, and Announcement create/archive/expiration this
   pass, and found the bug above plus confirmed the expiration/audience
   RLS policy is correctly written. That closes some of the gap, but
   it is still not the same as a human clicking through the live site
   — genuinely recommend doing that once before real data goes in,
   especially for grade-calculation edge cases (e.g. a score exactly on
   a grade boundary), which I did not trace in this pass.
5. **Physical tablet/Android device test** — I have no hardware to test
   on. The responsive CSS follows the same patterns throughout (verified
   consistent), which is a good sign, but isn't a substitute for looking
   at it on an actual screen.

### One real limitation found, not a bug

Announcement `publish_at`/`expires_at` times are parsed in the server's
local timezone with no offset correction from the browser. Fine for a
single-timezone deployment (the normal case for one school); would need
a small fix if this ever serves admins across different timezones.

