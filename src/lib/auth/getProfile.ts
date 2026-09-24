import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database.types'
import type { User } from '@supabase/supabase-js'

/**
 * Server-side helper for Server Components: returns the current
 * authenticated user (if any) together with their `profiles` row.
 */
export async function getCurrentProfile(): Promise<{
  user: User | null
  profile: Profile | null
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return { user, profile: profile as Profile | null }
}
