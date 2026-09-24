import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client for use in Server Components, Server Actions, and
 * Route Handlers. Reads/writes the session via Next.js cookies.
 * Uses the public anon key only — RLS policies enforce all access control.
 *
 * Deliberately NOT parameterized with the hand-written Database type —
 * see the comment in src/lib/supabase/client.ts for why.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll was called from a Server Component. This can be
            // ignored as long as middleware.ts is refreshing sessions.
          }
        },
      },
    }
  )
}
