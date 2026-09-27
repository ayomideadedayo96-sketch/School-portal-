'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackInner() {
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
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center">
      {error ? (
        <>
          <h1 className="font-display text-xl font-semibold text-navy-800">That link didn't work</h1>
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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p className="text-sm text-navy-500">Loading&hellip;</p>}>
      <AuthCallbackInner />
    </Suspense>
  )
}
