# Deployment Guide — Netlify

## 1. Required environment variables

Set these in **Netlify → Site settings → Environment variables**. None
of the actual secret values are in this document — get them fresh from
your own Supabase project (**Settings → API**) each time you set up a
new environment.

| Variable | Where to find it in Supabase | Exposed to browser? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL | Yes (by design) | Safe to expose — access is controlled by RLS, not by hiding this URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → Project API keys → `anon` `public` | Yes (by design) | Also safe to expose for the same reason. |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → Project API keys → `service_role` | **No — server only** | Bypasses RLS entirely. Mark "Contains secret values" when adding it in Netlify. Only ever read by `src/lib/supabase/admin.ts` and `src/lib/utils/lastLogin.ts` — never import either from a `'use client'` file. |
| `NEXT_PUBLIC_SITE_URL` | (your own choice) | Yes | Optional — your deployed URL, e.g. `https://your-school-portal.netlify.app`. If unset, the app derives it from the request's Host header automatically. |

A template with placeholder (non-secret) values is kept in
`.env.local.example` at the project root for local development.

## 2. Supabase project setup (do this before the first deploy)

1. Create a project at supabase.com.
2. **SQL Editor** → run every file in `supabase/migrations/`, in exact
   numeric order (0001 through 0006). Each must finish with "Success"
   before you run the next one.
3. **Authentication → Sign In / Providers** → confirm **Email** is
   enabled.
4. **Authentication → URL Configuration**:
   - **Site URL** → your deployed Netlify URL (not `localhost`, once
     you're live).
   - **Redirect URLs** → add `https://your-domain.netlify.app/**`.
5. Create your **first admin account** by hand (see README.md §2,
   step 6, for the exact steps and the trigger-disable workaround
   needed the very first time — no admin exists yet to do this the
   normal way).

## 3. Netlify setup

1. Push this project to a GitHub repository (folder structure intact —
   `src/`, `supabase/`, `package.json` etc. at the top level, not
   nested inside another folder).
2. Netlify → **Add new site → Import an existing project → Deploy with
   GitHub** → select the repo.
3. Netlify auto-detects this as a Next.js project via
   `@netlify/plugin-nextjs` (already configured in `netlify.toml`) — no
   build settings need to be changed.
4. Add the environment variables from §1 **before or immediately
   after** the first deploy (changing them later always requires a
   manual redeploy — env var changes don't auto-trigger one).
5. Deploy. Check the deploy log for a green "Site is live" line.

## 4. After first deploy — verify, don't assume

- Visit the live URL's `/login` page and confirm it loads (not a
  Supabase connection error — that means an env var is wrong or from
  the wrong project).
- Log in as the admin account you created in §2.
- Check `/admin/users`, `/admin/activity`, and `/admin/settings` all
  load without errors.

## 5. Common deploy failures and their fixes (hit during this project's own deployment)

| Symptom | Cause | Fix |
|---|---|---|
| Build fails: "next/headers ... only allowed in Server Components" | A Client Component imports a file that also imports the server-only Supabase client | Split shared constants into a separate file with zero imports, so the client file never pulls in server-only code transitively |
| Build fails: TypeScript error on `setAll(cookiesToSet)` | Missing type annotation on the cookie-setter parameter in `lib/supabase/server.ts` / `middleware.ts` | Import `type CookieOptions` from `@supabase/ssr` and annotate the parameter |
| Site loads but shows "Invalid supabaseUrl" | `NEXT_PUBLIC_SUPABASE_URL` env var is missing/empty on Netlify | Set it, then trigger a manual redeploy |
| Login always fails with a generic error, password is definitely correct | The URL and keys in Netlify's env vars belong to **different Supabase projects** (easy mistake if you have more than one project open) | Copy all three values fresh, from the same Settings → API screen, in one sitting |
| Password reset link opens `localhost:3000` in production | Supabase's **Site URL** under Authentication → URL Configuration still points at localhost | Update it to your live Netlify URL, then request a new reset link (old links keep the stale domain) |
| SQL Editor role update fails: "Only administrators can change a user role" | The `prevent_role_self_escalation` trigger has no authenticated session to check when run from SQL Editor directly | Wrap the one-time bootstrap update in `alter table ... disable trigger` / `update` / `alter table ... enable trigger` (see README.md) |
