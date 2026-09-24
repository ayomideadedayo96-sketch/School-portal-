import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * SERVER-ONLY. This client uses the service-role key and bypasses Row
 * Level Security entirely. It must never be imported into a file marked
 * 'use client', and SUPABASE_SERVICE_ROLE_KEY must never be exposed as a
 * NEXT_PUBLIC_* variable.
 *
 * Only use this for operations that genuinely require elevated privilege
 * (e.g. creating an auth user for a new staff account via
 * supabase.auth.admin.inviteUserByEmail). Every Server Action that calls
 * this must first verify the caller is an admin using the caller's own
 * session (see src/lib/auth/requireAdmin.ts) — this client has no idea
 * who is calling it.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it as a server-only environment variable (never NEXT_PUBLIC_*).'
    )
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
