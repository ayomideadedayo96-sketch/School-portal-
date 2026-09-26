'use client'

import { useEffect } from 'react'
import './globals.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Server-side visibility (shows up in Netlify function logs) without
    // ever putting the raw error on screen for the user.
    console.error(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
          <h1 className="font-display text-2xl font-semibold text-navy-800">Something went wrong</h1>
          <p className="max-w-sm text-sm text-navy-500">
            We hit an unexpected error loading this page. This has been logged — please try again, and contact your
            administrator if it keeps happening.
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
