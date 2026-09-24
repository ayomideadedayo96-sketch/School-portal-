import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database.types'

/**
 * Every attendance/results Server Action calls this first. Unlike
 * requireAdminProfile, this accepts any authenticated role — the
 * fine-grained authorization (is this teacher assigned to this class?
 * does this staff member hold the right permission?) happens per-action
 * against the database, and is enforced for real by RLS regardless of
 * what this check decides. This only exists to return a clean error
 * message instead of a raw Postgres one.
 */
export async function requireProfile(): Promise<
  { ok: true; profile: Profile } | { ok: false; error: string }
> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'You must be signed in.' }

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()

  if (!profile) return { ok: false, error: 'No profile found for this account.' }

  return { ok: true, profile: profile as Profile }
}
