'use client'

import { useEffect } from 'react'

/**
 * Safety net for Supabase auth emails (invite / password reset).
 *
 * Supabase sends the sign-in token in the URL *fragment* (`#access_token=…`).
 * If the link's redirect address isn't on the project's allow-list,
 * Supabase falls back to the Site URL (the home page), and the visitor
 * would otherwise just be bounced to /login with the token ignored — which
 * looks like "I clicked the invite and nothing happened".
 *
 * Browsers keep the fragment across redirects, so this component (mounted
 * once in the root layout) can spot a token on ANY page and hand it to the
 * proper handler at /auth/callback. It also turns a Supabase error fragment
 * (expired / already-used link) into a clear message on the login page.
 */
export default function AuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash.length < 2) return
    if (window.location.pathname.startsWith('/auth/callback')) return

    const params = new URLSearchParams(hash.slice(1))

    // Guard against any chance of a redirect loop.
    try {
      const last = Number(sessionStorage.getItem('authHashHandledAt') ?? 0)
      if (Date.now() - last < 15000) return
    } catch {
      // sessionStorage unavailable — carry on.
    }
    const markHandled = () => {
      try {
        sessionStorage.setItem('authHashHandledAt', String(Date.now()))
      } catch {
        // ignore
      }
    }

    if (params.get('access_token')) {
      const type = params.get('type')
      const next = type === 'invite' || type === 'recovery' ? '/update-password' : '/'
      markHandled()
      window.location.replace(`/auth/callback?next=${encodeURIComponent(next)}${hash}`)
      return
    }

    if (params.get('error') || params.get('error_code')) {
      markHandled()
      window.location.replace('/login?error=link_expired')
    }
  }, [])

  return null
}
