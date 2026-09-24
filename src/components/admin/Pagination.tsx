import Link from 'next/link'

export default function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number
  pageSize: number
  total: number
  basePath: string
  searchParams: Record<string, string | undefined>
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams()
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== 'page') params.set(key, value)
    })
    params.set('page', String(targetPage))
    return `${basePath}?${params.toString()}`
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between border-t border-navy-100 px-4 py-3 text-sm text-navy-500">
      <p>
        Showing <span className="font-medium text-navy-700">{from}</span>–
        <span className="font-medium text-navy-700">{to}</span> of{' '}
        <span className="font-medium text-navy-700">{total}</span>
      </p>
      <div className="flex gap-2">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`rounded-md border border-navy-200 px-3 py-1.5 font-medium ${
            page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-navy-50'
          }`}
        >
          Previous
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`rounded-md border border-navy-200 px-3 py-1.5 font-medium ${
            page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-navy-50'
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  )
}
