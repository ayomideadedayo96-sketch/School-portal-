import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database.types'

/**
 * Every admin Server Action calls this first. RLS is the real
 * enforcement boundary (a non-admin's writes are rejected by Postgres
 * regardless), but checking here lets us return a clean error message
 * instead of a raw database error, and avoids doing wasted work
 * (like uploading a photo) before failing.
 */
export async function requireAdminProfile(): Promise<
  { ok: true; profile: Profile } | { ok: false; error: string }
> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()

  if (!profile || profile.role !== 'admin') {
    return { ok: false, error: 'Administrator access is required for this action.' }
  }

  return { ok: true, profile: profile as Profile }
}
