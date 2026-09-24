'use client'

import type { AttendanceStatus } from '@/types/database.types'

const CONFIG: Record<AttendanceStatus, { label: string; active: string }> = {
  present: { label: 'Present', active: 'bg-emerald-600 text-white border-emerald-600' },
  absent: { label: 'Absent', active: 'bg-red-600 text-white border-red-600' },
  late: { label: 'Late', active: 'bg-gold-400 text-white border-gold-400' },
  excused: { label: 'Excused', active: 'bg-navy-500 text-white border-navy-500' },
}

export default function AttendanceStatusButton({
  status,
  active,
  onClick,
}: {
  status: AttendanceStatus
  active: boolean
  onClick: () => void
}) {
  const cfg = CONFIG[status]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        active ? cfg.active : 'border-navy-200 text-navy-500 hover:bg-navy-50'
      }`}
    >
      {cfg.label}
    </button>
  )
}
