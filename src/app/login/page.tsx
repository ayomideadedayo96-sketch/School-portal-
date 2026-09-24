import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-navy-700 font-display text-base font-semibold text-gold-200">
            SP
          </div>
          <h1 className="font-display text-2xl font-semibold text-navy-800">School Portal</h1>
          <p className="mt-1 text-sm text-navy-400">Sign in with the email your school gave you</p>
        </div>

        <div className="rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
          <Suspense fallback={<div className="text-sm text-navy-400">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-navy-400">
          Accounts are created by your school administrator.
        </p>
      </div>
    </div>
  )
}
