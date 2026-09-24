import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-lg border border-navy-100 bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-xl font-semibold text-navy-800">No access yet</h1>
        <p className="mt-2 text-sm text-navy-400">
          Your account isn&apos;t linked to a role in the school portal. Contact your
          administrator to have one assigned.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <LogoutButton />
          <Link href="/login" className="text-xs font-medium text-navy-500 hover:text-navy-700">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
