import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-navy-800">Page not found</h1>
      <p className="max-w-sm text-sm text-navy-500">
        The page or record you&apos;re looking for doesn&apos;t exist, may have been moved, or you may not have access to it.
      </p>
      <Link
        href="/"
        className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
      >
        Go back home
      </Link>
    </div>
  )
}
