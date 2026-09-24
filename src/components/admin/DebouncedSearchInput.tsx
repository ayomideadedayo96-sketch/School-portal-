'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function DebouncedSearchInput({
  placeholder = 'Search…',
  paramName = 'q',
}: {
  placeholder?: string
  paramName?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get(paramName) ?? '')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setValue(searchParams.get(paramName) ?? '')
    // Only resync when the URL itself changes (e.g. browser back button).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get(paramName)])

  function handleChange(next: string) {
    setValue(next)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (next) {
        params.set(paramName, next)
      } else {
        params.delete(paramName)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    }, 350)
  }

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-navy-200 bg-white py-2 pl-9 pr-3 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
      />
    </div>
  )
}
