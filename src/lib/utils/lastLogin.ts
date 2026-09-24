import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns a map of auth user_id -> last_sign_in_at (ISO string, or null
 * if they've never signed in) for every user in the project.
 *
 * This requires the service-role key (SUPABASE_SERVICE_ROLE_KEY), since
 * last_sign_in_at lives on auth.users, which normal RLS-scoped clients
 * cannot read. If the key isn't configured, this fails soft — callers
 * should treat a missing entry as "unknown" rather than "never", since
 * that's a server configuration gap, not a fact about the user.
 *
 * Paginates through every page of auth.users (Supabase caps each page
 * at 1000). Fine for a single school's user base; if this ever needs to
 * scale to a multi-tenant deployment with many more users, switch to
 * looking up only the ids actually shown on the current page instead of
 * fetching everyone.
 */
export async function getLastLoginMap(): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()

  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return map
  }

  let page = 1
  const perPage = 1000
  for (;;) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error || !data) break

    for (const u of data.users) {
      map.set(u.id, u.last_sign_in_at ?? null)
    }

    if (data.users.length < perPage) break
    page += 1
    // Safety cap so a misbehaving Auth API can't loop forever.
    if (page > 20) break
  }

  return map
}

/** Single-user version of getLastLoginMap, for detail pages. */
export async function getLastLogin(userId: string): Promise<string | null | undefined> {
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return undefined
  }

  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error || !data.user) return undefined
  return data.user.last_sign_in_at ?? null
}
