'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import AttendanceStatusButton from './AttendanceStatusButton'
import { saveAttendance } from '@/lib/actions/attendance'
import { initials } from '@/lib/utils/format'
import type { AttendanceStatus } from '@/types/database.types'

interface StudentRow {
  id: string
  full_name: string
  admission_number: string
}

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

export default function AttendanceSheet({
  classId,
  academicSessionId,
  termId,
  date,
  students,
  existing,
  revalidatePathName,
}: {
  classId: string
  academicSessionId: string
  termId: string | null
  date: string
  students: StudentRow[]
  existing: Record<string, AttendanceStatus>
  revalidatePathName: string
}) {
  const router = useRouter()
  const toast = useToast()
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {}
    students.forEach((s) => {
      initial[s.id] = existing[s.id] ?? 'present'
    })
    return initial
  })
  const [isPending, startTransition] = useTransition()

  const stats = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 }
    Object.values(statuses).forEach((s) => counts[s]++)
    const total = students.length || 1
    const percentage = Math.round((counts.present / total) * 100)
    return { counts, percentage }
  }, [statuses, students.length])

  function handleSave() {
    startTransition(async () => {
      const result = await saveAttendance({
        classId,
        academicSessionId,
        termId,
        date,
        records: students.map((s) => ({ studentId: s.id, status: statuses[s.id] })),
        revalidatePathName,
      })
      if (result.success) {
        toast.success('Attendance saved.')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to save attendance.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Present" value={stats.counts.present} />
        <StatCard label="Absent" value={stats.counts.absent} />
        <StatCard label="Late" value={stats.counts.late} />
        <StatCard label="Excused" value={stats.counts.excused} />
        <StatCard label="Attendance %" value={`${stats.percentage}%`} accent />
      </div>

      <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-600">
                      {initials(s.full_name)}
                    </div>
                    <div>
                      <p className="font-medium text-ink">{s.full_name}</p>
                      <p className="text-xs text-navy-400">{s.admission_number}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((status) => (
                      <AttendanceStatusButton
                        key={status}
                        status={status}
                        active={statuses[s.id] === status}
                        onClick={() => setStatuses((prev) => ({ ...prev, [s.id]: status }))}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          {isPending && <Spinner className="h-4 w-4 text-white" />}
          Save attendance
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-navy-400">{label}</p>
      <p className={`mt-1 font-display text-xl font-semibold ${accent ? 'text-gold-600' : 'text-navy-800'}`}>
        {value}
      </p>
    </div>
  )
}
