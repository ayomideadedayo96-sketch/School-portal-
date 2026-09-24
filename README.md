# School Portal — Phase 1 + Phase 2 + Phase 3 + Phase 4

**Phase 1** — authentication, roles (admin/teacher/staff), and the core
database structure.
**Phase 2** — the full administrator dashboard: student management, staff
management, classes, subjects, teacher assignments, and settings.
**Phase 3** — attendance and academic results, for both admins and
authorized teachers, with a configurable grading scale and a
print-friendly student result report.
**Phase 4** — a full teacher dashboard (assigned classes/subjects,
today's timetable, today's attendance status, recent announcements and
documents), a school-wide weekly timetable (admin-managed, teacher
read-only), a teacher-facing student roster, and admin-managed
announcements and documents.

## 1. Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres +
Auth + Storage), deployable to Netlify via `@netlify/plugin-nextjs`.

## 2. Set up Supabase

1. Create a project at supabase.com.
2. In **SQL Editor**, run, in order:
   1. `supabase/migrations/0001_initial_schema.sql`
   2. `supabase/migrations/0002_phase2.sql`
   3. `supabase/migrations/0003_phase3.sql`
   4. `supabase/migrations/0004_phase4.sql`
3. In **Authentication > Providers**, confirm Email is enabled.
4. In **Authentication > URL Configuration**, set:
   - Site URL: your deployed URL (or `http://localhost:3000` for local dev)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and your
     production `https://your-domain/auth/callback`
5. In **Authentication > Emails**, the default "Invite user" template
   works out of the box (it links to `{{ .ConfirmationURL }}`, which the
   app points at `/auth/callback?next=/update-password`).
6. Create your **first admin account** once, by hand, so you can log in
   and use the dashboard to invite everyone else:
   - **Authentication > Users > Invite user** → enter your email.
   - Before or right after, add this to the user's metadata (Users list →
     click the user → Edit → User Metadata):
     ```json
     { "full_name": "Your Name", "role": "admin" }
     ```
   - A database trigger reads that metadata and creates the matching
     `profiles` row automatically. If you invited before setting the
     metadata, just re-run the metadata edit and re-run this once in SQL
     Editor: `update public.profiles set role = 'admin' where email = 'you@school.edu';`
   - Also give yourself a `staff` row so the dashboard's staff list and
     counts include you (optional but tidy):
     ```sql
     insert into public.staff (profile_id, staff_type, status)
     select id, 'non_teaching', 'active' from public.profiles where email = 'you@school.edu';
     ```
   - Every other user from here on is created through **Admin → Staff →
     Add staff** in the app itself — no more manual dashboard work.
7. From **Project Settings > API**, copy the Project URL, the `anon`
   public key, and the `service_role` key (click "Reveal") for step 3.

## 3. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`. Full explanation of each is in the template
file — in short: the first two are safe to expose to the browser, the
service-role key must **never** be prefixed `NEXT_PUBLIC_` and is only
read server-side, inside `src/lib/supabase/admin.ts`, to invite new staff
accounts.

## 4. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, sign in with the admin account from step
2.6.

## 5. Deploy to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify, "Add new site" → import the repo. `netlify.toml` already
   configures the build command and the `@netlify/plugin-nextjs` plugin.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` under Site settings > Environment
   variables. Optionally set `NEXT_PUBLIC_SITE_URL` to your Netlify URL.
4. Add your Netlify URL's `/auth/callback` to Supabase's Redirect URLs
   (step 2.4 above), and update the Site URL to match.

## 6. What's new in Phase 2

**Admin dashboard** (`/admin`) — stat cards (students, staff, teachers,
classes, current session, current term), recently added students/staff,
and a recent activity feed backed by a new `activity_log` table.

**Students** (`/admin/students`, `/new`, `/[id]`, `/[id]/edit`) — add,
edit, view, archive/restore, search (name or student ID), filter by
class/gender/status, paginated list, optional photo upload (stored in a
private `student-photos` Storage bucket, served via short-lived signed
URLs).

**Staff** (`/admin/staff`, `/new`, `/[id]`, `/[id]/edit`) — this is also
how you onboard every new portal user, of any role. "Add staff" invites
a real Supabase Auth account by email (no password is set by the admin —
the invite email lets the new user choose their own, reusing the
Phase 1 reset-password flow) and creates their `profiles` + `staff` rows
in one step. Search, filter by role/status, activate/deactivate.

**Classes** (`/admin/classes`, `/new`, `/[id]`, `/[id]/edit`) — create,
edit, archive/restore, assign a class teacher, see the roster and the
subjects offered in that class.

**Subjects** (`/admin/subjects`) — add/edit/delete via a dialog; assigning
a subject to a class happens from that class's detail page.

**Teacher Assignments** (`/admin/teacher-assignments`) — assign a
teacher to teach a subject in a class for a given academic session;
filter by teacher/subject/class; remove an assignment.

**Settings** (`/admin/settings`) — create academic sessions and terms,
and mark one of each as "current" (drives the dashboard cards and is the
default session offered when assigning teachers).

## 7. What's new in Phase 3

**Attendance** (`/admin/attendance`, `/teacher/attendance`) — select a
session, term, class, and date, then mark every student Present, Absent,
Late, or Excused (defaults to Present so you only touch the exceptions).
Live stats show the counts and attendance % as you go. Saving upserts on
`(student_id, date)`, so re-opening the same class/date later loads what
was already recorded and lets you edit it — the unique constraint is
what actually stops a student ending up with two records for one day.
Admins see every active class; teachers only see classes they are the
class teacher for or have a teacher assignment in, and the same rule is
enforced again at the database level via RLS regardless of what the UI
shows them.

**Results** (`/admin/results`, `/teacher/results`) — select a session,
term, class, and subject, then enter CA and Exam scores per student.
Total is computed automatically (and stored as a generated column, so it
can never drift from CA + Exam), and Grade is computed live from the
configurable grade boundaries as you type. A Remark field defaults to
the matching boundary's remark but can be overridden per student.
Validation (no negative scores, nothing above the configured CA/Exam
maximums, only real students in this class) runs both in the browser for
immediate feedback and again in the Server Action, which is the one that
actually matters. Saving upserts on
`(student_id, subject_id, class_id, academic_session_id, term_id)`, so
re-entering results for the same combination edits them rather than
creating a duplicate row. A teacher only sees subjects they're
specifically assigned to teach in the selected class, both in the
subject dropdown and enforced again via RLS.

**Grading configuration** (`/admin/settings`) — two new sections: score
maximums (CA max / Exam max, defaults 40/60) and the grade boundary
table itself (add/edit/delete a grade's score range and remark). Seeded
with the example A–F scale from the brief; change or replace it entirely
without touching any code.

**Staff permissions** — a new "Permissions" panel on a staff member's
profile page (visible only for the `staff` role) with a "Manage results"
toggle. Off by default: a plain staff account cannot read or write
`results` rows until an admin explicitly grants this, which is checked
by RLS via a `has_permission()` SQL function — not just hidden in the
UI. (Attendance intentionally has no equivalent staff permission — the
brief scopes attendance to "admin and authorized teachers" only, and
there's no `/staff/attendance` route.)

**Result report** (`/admin/results/report/[studentId]`) — a per-student
report card for a given session/term: student info, class, and a table
of every subject with CA/Exam/Total/Grade/Remark, plus a totals/average
line and signature lines. The Print button calls the browser's native
print dialog; a global print stylesheet hides the app header/sidebar so
only the report itself prints. Linked from a student's profile page.

## 8. What's new in Phase 4

**Teacher dashboard** (`/teacher`) — replaces the Phase 1 placeholder with
a real overview: the teacher's name, their assigned classes and subjects
(pulled from `teacher_assignments` for the current session), today's
timetable (today's `timetable_entries` for that teacher), a per-class
"today's attendance" status (Not started / In progress / Taken, based on
how many of today's attendance rows exist versus the class roster size),
and the five most recent announcements and documents visible to them.

**Timetable** (`/admin/timetable`, `/teacher/timetable`) — a weekly
grid (days × periods) backed by a new `timetable_entries` table. Admins
add/edit/delete entries (class, day, period, subject, teacher, room) via
a dialog opened either from "Add entry" or by clicking an existing cell;
filters narrow the grid by class, teacher, day, or academic session. Two
conflicts are actively prevented: a class can't have two lessons in the
same period on the same day (a database unique constraint), and a
teacher can't be scheduled in two places in the same period (checked in
the Server Action before writing, since that spans two different
classes and has no single-column constraint to lean on). Teachers get a
read-only version of the grid limited to their own periods, or the full
schedule of a class they're the class teacher for.

**Teacher — Students** (`/teacher/students`) — a read-only roster,
scoped by class, of the students in whichever classes the teacher is
assigned to (reusing the same `getAvailableClasses` scoping as
Attendance/Results).

## 8b. What's new in Phase 4b

**Announcements** (`/admin/announcements`, `/teacher/announcements`,
`/staff/announcements`) — the `announcements` table now has four
audiences ("All Staff", "Teachers", "Staff", "Specific Class"), plus
`publish_at`, `expires_at`, and `is_archived`. Admins create/edit via a
single dialog with datetime pickers for publish/expiry, and can
archive/restore or delete (with a confirmation dialog) from the list,
which shows a live Scheduled/Active/Expired/Archived badge per row. RLS
enforces the same rule for everyone else: an announcement is only
visible once `publish_at` has passed, only until `expires_at` (if any),
never while archived, and only to its audience — so an expired
announcement simply stops appearing for teachers/staff without any
client-side filtering to trust. Staff now get a real dashboard
(`/staff`) showing their recent announcements and documents, replacing
the Phase 1 placeholder.

**Documents** (`/admin/documents`, `/teacher/documents`,
`/staff/documents`) — documents are now real uploaded files, not pasted
links. Admins upload PDF/DOC/DOCX/JPG/PNG (10MB max) to a new private
`school-documents` Storage bucket; the `documents` table stores the
metadata (file name, Storage path, file type, file size, uploader,
audience, created date). The same four audiences as announcements
apply, including "Specific Class". Admins get search (title/file name),
filters (audience/class/type), and pagination; everyone gets a per-file
View (opens inline) and Download (forces `Content-Disposition:
attachment` with the original file name) link, both short-lived signed
URLs minted server-side after the row's own RLS check has already
confirmed the caller may see it — nothing is ever served from a public
URL. Deleting a document (admin only, with confirmation) removes both
the database row and the underlying Storage object.

**Storage-level enforcement, not just table-level:** the
`school-documents` bucket has its own Row Level Security on
`storage.objects` — admins get full read/write, and everyone else's
read access is derived by checking whether some visible `documents` row
points at that exact Storage path. That check re-runs the `documents`
table's own RLS, so a teacher or staff member can't read a file whose
metadata row isn't addressed to them even if they somehow obtained its
Storage path directly. The bucket also enforces a 10MB file size limit
and an `allowed_mime_types` allow-list at the Storage layer itself, as
a second line of defense behind the app-level checks in
`src/app/admin/documents/actions.ts`.

## 9. How access control works

- **Frontend guard (UX only):** `src/middleware.ts` and every
  `layout.tsx` under `/admin` and `/teacher` confirm the signed-in
  user's role before rendering. This exists for a good user experience,
  not for security.
- **Real enforcement (cannot be bypassed from the browser):** Row Level
  Security policies across all five migration files, using the
  `get_user_role()` / `get_profile_id()` SQL functions (and
  `is_class_teacher_or_assigned()`, `is_assigned_to_class_subject()`,
  and `has_permission()` from Phase 3). Only an admin session — or a
  teacher/staff session that passes the relevant check — can write to
  students, staff, classes, subjects, teacher_assignments,
  class_subjects, attendance, results, grade_boundaries, score_settings,
  staff_permissions, timetable_entries, announcements, or documents.
  Postgres rejects the write regardless of what the client sends. As of
  Phase 4, `timetable_entries` select is scoped so a teacher only sees
  their own periods or a class they're the class teacher for. As of
  Phase 4b, `announcements` select requires the row to be published, not
  expired, and not archived (admins bypass this so they can manage
  drafts/expired/archived rows), and both `announcements` and
  `documents` select is scoped by the row's `audience`
  ("all"/"teachers"/"staff"/"class") and, for the "class" audience, by
  `class_id` matching a class the teacher teaches or is the class
  teacher for. Only admins can write to any of these tables. The
  `school-documents` Storage bucket has its own RLS on
  `storage.objects`: admins get full read/write, and everyone else's
  read access is derived from whether a `documents` row they can see
  points at that path — so file access tracks the metadata row's
  audience automatically, with no separate list to keep in sync.
- **Server Actions** (`actions.ts` files throughout `/admin`, plus the
  shared `src/lib/actions/attendance.ts` and `src/lib/actions/results.ts`
  used by both `/admin` and `/teacher`) run with the calling user's own
  session (via `src/lib/supabase/server.ts`), so RLS applies to them
  exactly as it would to any other request. They additionally call
  `requireAdminProfile()` or the more permissive `requireProfile()`
  first purely to return a clean error message — RLS is still the
  actual backstop.
- **The one privileged exception:** creating a new auth user
  (`src/app/admin/staff/actions.ts` → `createStaffAccount`) requires the
  service-role key, since only the Auth Admin API can create users. That
  file is the only place the service-role client
  (`src/lib/supabase/admin.ts`) is used, it never runs in the browser,
  and it still checks `requireAdminProfile()` before doing anything.

## 10. Testing checklist

1. **Admin login:** sign in with the admin account → `/admin` shows your
   name, stat cards, and (once you've added data) recent students/staff/
   activity.
2. **Adding a student:** Students → Add student → fill required fields
   (Student ID, first name, last name) → save → redirected to the new
   student's profile, values match what you entered, a toast confirms
   success, and the dashboard's student count and "Recently added"
   list update.
3. **Editing a student:** open a student → Edit → change a field → Save
   changes → profile page reflects the update.
4. **Searching a student:** Students list → type part of a name or
   Student ID into the search box → list narrows after a brief pause,
   with no full page reload.
5. **Archiving a student:** open a student → Archive → confirm in the
   dialog → status badge flips to "Archived" and the student drops out
   of the default (active) list view; switch the status filter to "All
   statuses" to see them again, and "Restore" to bring them back.
6. **Adding staff:** Staff → Add staff → fill name/email/role → Invite —
   check the invited email address receives a Supabase invite email;
   clicking it lands on "Choose a new password", and after setting one
   the new account can log in and lands on the dashboard matching its
   role.
7. **Adding a class:** Classes → Add class → pick a name and an academic
   session (create one first under Settings if none exist yet) → save →
   class appears in the list and its detail page.
8. **Adding a subject:** Subjects → Add subject → name (+ optional code)
   → appears in the list immediately.
9. **Assigning a teacher:** Teacher Assignments → Add assignment → pick
   a teacher, subject, class, and session → appears in the table; also
   confirm assigning the *same* teacher/subject/class/session combination
   twice is rejected with a clear error (the database's unique
   constraint).
10. **Cross-role access:** log in as a teacher or staff account (once
    one exists) and confirm `/admin`, `/admin/students`, etc. all
    redirect away rather than rendering — this is the middleware guard,
    but also try calling one of the `/admin` Server Actions' underlying
    tables directly as that user from the Supabase SQL editor ("Run as")
    to confirm RLS blocks the write independent of the UI.
11. **Responsive layout:** resize the browser — the sidebar collapses to
    a top menu below the `md` breakpoint, tables scroll horizontally
    instead of overflowing, forms stack to one column.
12. **Recording attendance:** as admin, go to Attendance → pick a
    session, term, class with students, and today's date → every
    student defaults to Present → mark a couple Absent/Late/Excused →
    confirm the stat cards update live → Save → refresh the page and
    confirm the same statuses are still shown (proving it persisted and
    an unrelated re-save won't duplicate rows).
13. **Teacher attendance scope:** assign a teacher to a class (Teacher
    Assignments), log in as that teacher, confirm `/teacher/attendance`
    only lists classes they're actually assigned to or are the class
    teacher for — not every class in the school.
14. **Entering results:** as admin, go to Results → pick session, term,
    class, and a subject that's been assigned to that class → enter CA
    and Exam scores for a student → confirm Total and Grade update as
    you type, using whatever grade boundaries are configured → Save →
    confirm it persists on reload.
15. **Results validation:** try entering a negative score, or a score
    above the configured CA/Exam maximum (Admin → Settings → Score
    settings) → confirm Save is rejected with a clear message and
    nothing is written.
16. **Teacher results scope:** as a teacher, confirm the subject dropdown
    on `/teacher/results` only offers subjects assigned to them for the
    selected class — not every subject in the school.
17. **Configurable grading:** Admin → Settings → Grading → edit a grade
    boundary's score range (or add a new grade) → go back to Results for
    a class/subject with existing scores → confirm the displayed Grade
    reflects the updated boundaries.
18. **Staff permission gating:** as admin, open a staff (non-teacher,
    non-admin) account's profile → confirm "Manage results" is off by
    default and that account cannot load `/admin/results` (it's blocked
    from `/admin` entirely) — this step is really about confirming the
    RLS policy exists; grant the permission, then verify with a direct
    Supabase query (SQL editor, "Run as" that user) that
    `select * from results` now returns rows instead of an empty set.
19. **Result report:** open a student's profile → "Report card" → confirm
    it shows the student's info, class, session/term, and every subject
    result entered so far with CA/Exam/Total/Grade/Remark → click Print
    → confirm the header/sidebar disappear from the print preview and
    only the report content remains.

Don't move on to Phase 4 until all of the above behave as described.

20. **Timetable — admin CRUD:** Admin → Timetable → Add entry → pick
    class, day, period, subject, teacher, room, session → save → the
    entry appears in the correct grid cell. Edit it by clicking the
    cell, change the room, save → the cell updates. Delete it from the
    same dialog → cell goes back to empty.
21. **Timetable — class conflict:** try adding a second entry for the
    same class/day/period/session → rejected with a clear message
    ("already has a lesson scheduled in that period").
22. **Timetable — teacher conflict:** assign the same teacher to two
    different classes in the same day/period/session → the second save
    is rejected, naming the class they're already scheduled for.
23. **Timetable — filters:** use the class/teacher/day/session filters
    on `/admin/timetable` → the grid narrows accordingly; clearing a
    filter restores the full grid.
24. **Timetable — teacher scope:** log in as a teacher who has entries →
    `/teacher/timetable` shows only their own periods (or a class
    they're the class teacher for) — never another teacher's full
    schedule.
25. **Teacher dashboard:** log in as a teacher with assigned classes,
    subjects, and at least one timetable entry for today → `/teacher`
    shows their name, assigned classes and subjects as chips, today's
    timetable entries in period order, and an attendance status per
    class that updates from "Not started" to "In progress"/"Taken" as
    attendance is recorded for today.
26. **Teacher — students:** `/teacher/students` → switching the class
    filter shows only students in classes this teacher is assigned to;
    a class they don't teach never appears as an option.
27. **Announcements — audiences:** Admin → Announcements → New
    announcement → create one each for "All Staff", "Teachers", "Staff",
    and "Specific Class" (choosing a class for the last one) → all four
    appear in the admin list with the right audience badge. Log in as a
    teacher: `/teacher/announcements` and the dashboard's "Recent
    announcements" panel show "All Staff", "Teachers", and only the
    "Specific Class" one for a class they teach or are the class teacher
    for — never a different class's. Log in as staff:
    `/staff/announcements` and `/staff` show "All Staff" and "Staff"
    only. Confirm a non-admin cannot create/edit (no create UI is
    reachable outside `/admin`).
28. **Announcements — scheduling/expiry/archive:** create an
    announcement with a `publish_at` a few minutes in the future →
    admin list shows it as "Scheduled" and it does **not** yet appear on
    `/teacher/announcements`; wait (or edit the publish date to the
    past) and refresh → it becomes "Active" and appears. Create another
    with an `expires_at` in the near past → it shows "Expired" for the
    admin and is absent from teacher/staff views. Archive an active
    announcement → it shows "Archived" for the admin, disappears from
    teacher/staff views immediately (regardless of its publish/expiry
    window), and "Restore" brings it back.
29. **Announcement edit/delete:** edit an existing announcement's
    title, message, audience, or dates → the change is reflected
    everywhere it's visible. Delete one → confirmation dialog appears;
    confirming removes it from every view.
30. **Documents — upload, view, download:** Admin → Documents → Upload
    document → pick a PDF (or DOC/DOCX/JPG/PNG), set a title and
    audience → it appears in the admin list with file name, type, and
    size. Click "View" → opens the file in a new tab. Click "Download"
    → downloads with the original file name. Try uploading a
    disallowed file type (e.g. `.zip`) or a file over 10MB → rejected
    with a clear error before any upload happens.
31. **Documents — audiences & specific class:** upload one document
    each for "All Staff", "Teachers", "Staff", and "Specific Class" →
    as in the announcements test, confirm each role only sees the
    documents addressed to it, and a "Specific Class" document only
    appears for a teacher who teaches (or is the class teacher for)
    that exact class.
32. **Documents — access control at the Storage layer, not just the
    UI:** as a signed-in teacher or staff member, copy a document's
    signed "View" URL from an audience you *can* see, then try
    constructing a request for a different document's Storage path
    directly (e.g. by editing the path in a copied signed URL) — it
    should fail, since a fresh signed URL can only be minted
    server-side after the `documents` row's RLS confirms visibility,
    and the bucket's own `storage.objects` policy re-checks the same
    condition.
33. **Documents — search, filter, delete:** Admin → Documents → use the
    search box (matches title or file name), and the audience/class/file
    type filters, individually and combined → the list narrows
    correctly and pagination reflects the filtered count. Delete a
    document (confirmation dialog required) → it disappears from the
    admin list and every dashboard/teacher/staff view, and re-uploading
    a file with the same name afterwards works (no leftover Storage
    conflict).
34. **Responsive timetable:** resize the browser to a phone width on
    both `/admin/timetable` and `/teacher/timetable` → the grid scrolls
    horizontally inside its own container rather than breaking the page
    layout, and the add/edit dialog remains usable.

That's the full Phase 4 + 4b surface — once it all behaves as
described, the teacher/staff dashboards, timetable, announcements, and
documents are ready for real use.
