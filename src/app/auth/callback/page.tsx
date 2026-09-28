'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const query = new URLSearchParams(window.location.search)
    const next = query.get('next') ?? '/'
    const code = query.get('code')
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

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) fail()
        else finish()
      })
      return
    }

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

    const timeout = setTimeout(fail, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

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
