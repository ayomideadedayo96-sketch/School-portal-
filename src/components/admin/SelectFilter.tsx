'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function SelectFilter({
  paramName,
  options,
  placeholder = 'All',
}: {
  paramName: string
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get(paramName) ?? ''

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next) {
      params.set(paramName, next)
    } else {
      params.delete(paramName)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
