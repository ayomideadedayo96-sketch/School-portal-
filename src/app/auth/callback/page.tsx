'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Handles the redirect from every Supabase auth email — invites,
 * password resets, magic links.
 *
 * This MUST be a client page, not a server route. Supabase's default
 * email templates redirect using the hash-fragment / implicit flow —
 * e.g. `.../auth/callback?next=/update-password#access_token=...&type=recovery`
 * — and a URL fragment (everything after `#`) is never sent to the
 * server in an HTTP request, only ever visible to client-side
 * JavaScript. A server route checking `searchParams.get('code')` (the
 * separate PKCE flow) can never see it and always falls through to
 * "failed", which is exactly the bug this file replaces: every invite
 * and password-reset link silently bounced back to /login.
 *
 * The browser Supabase client (createBrowserClient) has
 * detectSessionInUrl on by default, so simply constructing it on this
 * page is enough for it to parse the hash and establish the session —
 * we just need to wait for that and then move on. The `?code=` branch
 * is kept as a fallback in case Supabase's flow type ever changes.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const next = searchParams.get('next') ?? '/'
    const code = searchParams.get('code')
    let finished = false

    async function finish() {
      if (finished) return
      finished = true
      router.replace(next)
    }

    async function fail() {
      if (finished) return
      finished = true
      setError(true)
      setTimeout(() => router.replace('/login?error=auth_callback_failed'), 2000)
    }

    // Fallback path: an explicit ?code= param (PKCE flow).
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) fail()
        else finish()
      })
      return
    }

    // Primary path: hash-fragment tokens, parsed automatically by the
    // browser client. Either an auth state change fires, or a session
    // is already there by the time we check.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
        finish()
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish()
    })

    // If nothing happened within a few seconds, the link was genuinely
    // invalid/expired — send the user back rather than leaving them on
    // a blank page forever.
    const timeout = setTimeout(fail, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center">
      {error ? (
        <>
          <h1 className="font-display text-xl font-semibold text-navy-800">That link didn&apos;t work</h1>
          <p className="max-w-sm text-sm text-navy-500">
            It may have expired or already been used. Redirecting you back to login&hellip;
          </p>
        </>
      ) : (
        <p className="text-sm text-navy-500">Signing you in&hellip;</p>
      )}
    </div>
  )
}
