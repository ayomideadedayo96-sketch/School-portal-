'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const inputClass =
  'rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500'

export default function AttendanceFilterBar({
  basePath,
  sessions,
  terms,
  classes,
}: {
  basePath: string
  sessions: { id: string; name: string }[]
  terms: { id: string; name: string; academic_session_id: string }[]
  classes: { id: string; name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const session = searchParams.get('session') ?? ''
  const term = searchParams.get('term') ?? ''
  const classId = searchParams.get('class') ?? ''
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  const visibleTerms = terms.filter((t) => !session || t.academic_session_id === session)

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <select
        value={session}
        onChange={(e) => update({ session: e.target.value, term: '' })}
        className={inputClass}
      >
        <option value="">Select session</option>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <select value={term} onChange={(e) => update({ term: e.target.value })} className={inputClass} disabled={!session}>
        <option value="">Select term</option>
        {visibleTerms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <select value={classId} onChange={(e) => update({ class: e.target.value })} className={inputClass}>
        <option value="">Select class</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={date}
        onChange={(e) => update({ date: e.target.value })}
        className={inputClass}
      />
    </div>
  )
}
