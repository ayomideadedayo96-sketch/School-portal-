# Administrator Setup Guide

This guide walks a school administrator through getting the portal ready
for day-to-day use, in the order that actually works (some steps depend
on earlier ones — e.g. you can't assign a teacher to a class before both
exist).

All of the steps below happen inside the portal at `/admin/...` once
you're signed in with an Admin account. If you don't have one yet, see
**"First admin account"** at the end of this guide.

---

## 1. Create users

Go to **Users** (`/admin/users`) or **Staff** (`/admin/staff`) — both
show the same accounts; Users is the quick view for roles/access, Staff
is where you manage employment details.

1. Click **Invite user**.
2. Enter their full name, email, and choose a role: **Admin**,
   **Teacher**, or **Staff**.
3. Click **Invite staff member**. They'll receive an email to set their
   own password — you never set or see anyone's password.

You can invite as many admins, teachers, and staff as you need. A
normal (non-admin) user can never grant themselves admin — role changes
are admin-only, enforced both in the UI and at the database level, and
even an admin cannot change their own role (to prevent accidental
lockout — ask a second admin if a role really needs to change on your
own account).

## 2. Add classes

Go to **Classes** (`/admin/classes`) → **Add class**. Give it a name
(e.g. "JSS 1A") and select the academic session it belongs to. You can
optionally set a class teacher once teachers exist (step 4).

## 3. Add subjects

Go to **Subjects** (`/admin/subjects`) → **Add subject**. Subjects are
shared across classes and sessions — you create each one once and then
attach it to whichever classes offer it.

## 4. Add teachers

Teachers are just users with the **Teacher** role — see step 1. When
inviting one, set their role to Teacher and fill in department/position
if useful for your records.

## 5. Assign teachers

Go to **Teacher Assignments** (`/admin/teacher-assignments`) → **New
assignment**. Choose the teacher, the subject, the class, and the
academic session (and term, if relevant). This is what determines which
classes a teacher can take attendance for and enter results for — a
teacher only sees data for classes they're assigned to.

## 6. Add students

Go to **Students** (`/admin/students`) → **Add student**. Fill in the
student's details and assign them to a class. Students are never
permanently deleted from here — if a student leaves, use **Archive**
instead, which keeps their historical records (attendance, results)
intact while removing them from active class lists.

## 7. Configure terms

Go to **Settings** (`/admin/settings`):

- **Academic sessions** — add a session (e.g. "2025/2026") with its
  start and end dates, then click **Set as current** once it's the
  session actually running. Only one session can be current at a time.
- **Terms** — add terms within a session (e.g. "First Term") the same
  way, and set the current one.
- While you're here, also set the **School profile** (name, logo,
  address, phone, email, website) — this appears across the portal and
  on printed documents — and check the **Score settings** and
  **Grading** scale match how your school grades results.

## 8. Upload documents

Go to **Documents** (`/admin/documents`) → **Upload document**. Choose a
title, an audience (all staff, teachers only, staff only, or a specific
class), and the file (PDF, DOC/DOCX, JPG, or PNG, up to 10MB). Only
people in the chosen audience will be able to see and download it.

## 9. Create announcements

Go to **Announcements** (`/admin/announcements`) → **New announcement**.
Write a title and body, choose an audience the same way as documents,
and optionally set a future publish date or an expiry date. You can
archive an announcement later instead of deleting it if you want to
keep a record of what was communicated.

---

## Other admin tools

- **Activity Log** (`/admin/activity`) — a read-only audit trail of
  important actions across the portal (accounts created, roles changed,
  results entered, documents uploaded, etc.), visible to admins only.
  Useful for accountability and for investigating "who changed this?"
- **Timetable** (`/admin/timetable`) — build the weekly class schedule
  once classes, subjects, and teacher assignments exist.
- **Attendance** and **Results** (`/admin/attendance`,
  `/admin/results`) — admins can view and, if needed, correct any
  class's records; day-to-day entry is normally done by teachers (and
  by staff who've been granted the "Manage results" permission from
  their user detail page).

## Data safety notes

- Students and staff are never hard-deleted from the UI — they're
  marked **active / inactive / archived** instead, so historical
  records stay intact and nothing is lost by mistake.
- Every destructive or status-changing action (deactivating a user,
  archiving a student, deleting a document) asks for confirmation
  before it happens.
- Only administrators can view the Activity Log, change a role, or
  deactivate/reactivate an account.

## First admin account

If this is a brand-new deployment with no admin yet, the very first
admin has to be created directly in Supabase (there's no one to invite
them yet): in the Supabase dashboard, go to **Authentication → Users →
Invite user**, and set the user metadata to
`{ "full_name": "Your Name", "role": "admin" }`. After that, use the
portal's own **Users** page for every account going forward.
