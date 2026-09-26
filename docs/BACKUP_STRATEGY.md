# Backup Strategy

## What's already built

`.github/workflows/backup.yml` runs a full database dump (`pg_dump`)
every day at 02:00 UTC automatically, and keeps 30 days of backups as
downloadable GitHub Actions artifacts. It costs nothing extra and needs
no paid Supabase tier — it needs exactly **one thing from you**:

## One-time setup (you need to do this — I can't add secrets to your
## GitHub repo on your behalf)

1. Go to Supabase → **Settings → Database**
2. Find **Connection string** → copy the **URI** format (looks like
   `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
3. Replace `[YOUR-PASSWORD]` with your actual database password (set
   when you created the project, or resettable from that same page)
4. Go to your GitHub repo → **Settings → Secrets and variables →
   Actions → New repository secret**
5. Name: `DATABASE_URL`, Value: the connection string from step 3
6. Save

That's it — the workflow will start running on its own schedule. You
can also trigger one manually any time: **Actions tab → Database
backup → Run workflow**.

## How to actually restore from a backup (test this once, don't wait
## for an emergency to find out it doesn't work)

1. Go to your repo's **Actions** tab → find the backup run you want →
   download the `db-backup-...` artifact (it's a `.zip` containing the
   `.dump` file)
2. On a machine with `postgresql-client` installed:
   ```
   pg_restore --clean --if-exists --dbname="$DATABASE_URL" backup-2026-XX-XX.dump
   ```
   Use the same connection string format as above. `--clean --if-exists`
   drops existing objects first so the restore doesn't conflict with
   what's already there — **only run this against a database you
   actually intend to overwrite** (e.g. a fresh test project), never
   directly against production without a plan.
3. For a safer test: create a second, throwaway Supabase project first
   and restore into that one, to confirm the dump is valid, before ever
   needing to restore into production for real.

## Alternative: Supabase's own Point-in-Time Recovery

If you're on a paid Supabase tier, **Database → Backups → Point in Time
Recovery** is Supabase's own built-in option and can restore to any
specific minute, not just once a day. The GitHub Actions approach above
is the free-tier-compatible alternative — you can run both at once if
you want belt-and-suspenders coverage.
