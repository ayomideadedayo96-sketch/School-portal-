'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Catches a crash on any single admin page while keeping the admin
// sidebar/shell on screen, so one failing page never strands the admin.
// The `digest` is a short reference Next.js generates for server-side
// errors (their real text is deliberately hidden in production); it can
// be matched against the site's server logs to find the exact cause.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <h1 className="font-display text-xl font-semibold text-navy-800">This page couldn&apos;t load</h1>
      <p className="text-sm text-navy-500">
        Something went wrong while loading this page. Your data is safe. Try again, or head back to the dashboard.
      </p>
      {error.digest && <p className="font-mono text-xs text-navy-300">Reference: {error.digest}</p>}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="rounded-md border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
