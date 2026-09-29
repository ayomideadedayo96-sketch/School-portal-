'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Landing page for every Supabase auth email (invites, password resets).
 *
 * Two link styles exist and both are handled here:
 *  1. Hash-token links — `/auth/callback?next=…#access_token=…&refresh_token=…`.
 *     Admin invites always arrive this way. The fragment (#…) never reaches
 *     the server, so it must be read in the browser. We read it ourselves and
 *     call setSession(): the browser client from @supabase/ssr is configured
 *     for the PKCE flow and refuses to auto-detect this style of link.
 *  2. Code links — `/auth/callback?code=…` (password resets started from the
 *     "Forgot password" page), exchanged for a session.
 *
 * An expired or already-used link arrives as `#error=…&error_code=otp_expired`
 * and is reported straight away.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const query = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const next = query.get('next') ?? '/'
    const code = query.get('code')

    let done = false
    const finish = () => {
      if (done) return
      done = true
      router.replace(next)
    }
    const fail = (reason: 'link_expired' | 'auth_callback_failed') => {
      if (done) return
      done = true
      setFailed(true)
      setTimeout(() => router.replace(`/login?error=${reason}`), 2500)
    }

    async function run() {
      // Expired / already-used link.
      if (hash.get('error') || hash.get('error_code')) {
        fail('link_expired')
        return
      }

      // Style 1: tokens in the fragment.
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          fail('auth_callback_failed')
          return
        }
        // Remove the tokens from the address bar / history.
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        finish()
        return
      }

      // Style 2: ?code=…
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) fail('auth_callback_failed')
        else finish()
        return
      }

      // Nothing in the link — fine only if a session already exists.
      const { data } = await supabase.auth.getSession()
      if (data.session) finish()
      else fail('auth_callback_failed')
    }

    run()
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center">
      {failed ? (
        <>
          <h1 className="font-display text-xl font-semibold text-navy-800">That link didn&apos;t work</h1>
          <p className="max-w-sm text-sm text-navy-500">
            It may have expired or already been used. Taking you back to the login page&hellip;
          </p>
        </>
      ) : (
        <p className="text-sm text-navy-500">Signing you in&hellip;</p>
      )}
    </div>
  )
}
