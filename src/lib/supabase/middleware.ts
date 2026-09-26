import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  teacher: '/teacher',
  staff: '/staff',
}

const PROTECTED_PREFIXES = ['/admin', '/teacher', '/staff']

/**
 * Runs on every request (see matcher in src/middleware.ts).
 * 1. Refreshes the Supabase auth session so it never silently expires.
 * 2. Blocks unauthenticated users from /admin, /teacher, /staff.
 * 3. Confines each authenticated user to the dashboard for their role,
 *    so a teacher cannot simply type /admin into the address bar.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not remove this call — it refreshes the session token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!user && isProtected) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (isProtected || pathname === '/login')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role

    if (isProtected) {
      if (!role || !(role in ROLE_HOME)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
      if (!pathname.startsWith(ROLE_HOME[role])) {
        return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
      }
    }

    if (pathname === '/login' && role && role in ROLE_HOME) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
    }
  }

  return response
}
