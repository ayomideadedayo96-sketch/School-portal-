'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FormError from '@/components/FormError'
import Spinner from '@/components/Spinner'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('Something went wrong updating your password. Please request a new reset link.')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-navy-800">Choose a new password</h1>
          <p className="mt-1 text-sm text-navy-400">Use at least 8 characters.</p>
        </div>

        <div className="rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <FormError message={error} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-navy-700">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-navy-700">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-md bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
            >
              {loading && <Spinner className="h-4 w-4 text-white" />}
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
