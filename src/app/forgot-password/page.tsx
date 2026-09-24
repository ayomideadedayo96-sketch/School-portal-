'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FormError from '@/components/FormError'
import FormSuccess from '@/components/FormSuccess'
import Spinner from '@/components/Spinner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    })

    setLoading(false)

    if (resetError) {
      setError('Something went wrong sending the reset email. Please try again.')
      return
    }

    // Always show a generic success message, whether or not the email
    // exists, so the form cannot be used to discover registered accounts.
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-navy-800">Reset your password</h1>
          <p className="mt-1 text-sm text-navy-400">
            We&apos;ll email you a link to choose a new password.
          </p>
        </div>

        <div className="rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
          {sent ? (
            <FormSuccess message="If an account exists for that email, a reset link is on its way." />
          ) : (
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

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-md bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
              >
                {loading && <Spinner className="h-4 w-4 text-white" />}
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-navy-400">
          <Link href="/login" className="font-medium text-navy-500 hover:text-navy-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
