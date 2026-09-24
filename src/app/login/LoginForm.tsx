'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FormError from '@/components/FormError'
import Spinner from '@/components/Spinner'
import type { UserRole } from '@/types/database.types'

function mapAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address before logging in.'
  }
  if (lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return 'Something went wrong signing you in. Please try again.'
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get('redirectedFrom')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(mapAuthError(signInError.message))
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Something went wrong signing you in. Please try again.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .single<{ role: UserRole }>()

    setLoading(false)

    if (profileError || !profile) {
      setError('No profile is set up for this account yet. Contact your administrator.')
      return
    }

    router.push(redirectedFrom || `/${profile.role}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-navy-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
          placeholder="you@school.edu"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-navy-700">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-medium text-navy-500 hover:text-navy-700">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-md bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
      >
        {loading && <Spinner className="h-4 w-4 text-white" />}
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
