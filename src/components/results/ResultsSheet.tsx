'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { saveResults } from '@/lib/actions/results'
import { computeGrade } from '@/lib/grading'
import { initials } from '@/lib/utils/format'
import type { GradeBoundary } from '@/types/database.types'

interface StudentRow {
  id: string
  full_name: string
  admission_number: string
}

interface ExistingResult {
  ca_score: number
  exam_score: number
  remark: string | null
}

interface RowState {
  ca: string
  exam: string
  remark: string
}

export default function ResultsSheet({
  classId,
  subjectId,
  academicSessionId,
  termId,
  students,
  existing,
  caMax,
  examMax,
  boundaries,
  revalidatePathName,
}: {
  classId: string
  subjectId: string
  academicSessionId: string
  termId: string
  students: StudentRow[]
  existing: Record<string, ExistingResult>
  caMax: number
  examMax: number
  boundaries: GradeBoundary[]
  revalidatePathName: string
}) {
  const router = useRouter()
  const toast = useToast()
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const initial: Record<string, RowState> = {}
    students.forEach((s) => {
      const e = existing[s.id]
      initial[s.id] = {
        ca: e ? String(e.ca_score) : '',
        exam: e ? String(e.exam_score) : '',
        remark: e?.remark ?? '',
      }
    })
    return initial
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateRow(studentId: string, field: keyof RowState, value: string) {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  const computed = useMemo(() => {
    const map: Record<string, { total: number; grade: string | null }> = {}
    students.forEach((s) => {
      const ca = Number(rows[s.id]?.ca) || 0
      const exam = Number(rows[s.id]?.exam) || 0
      const total = ca + exam
      const { grade } = computeGrade(total, boundaries)
      map[s.id] = { total, grade }
    })
    return map
  }, [rows, students, boundaries])

  function handleSave() {
    setError(null)

    for (const s of students) {
      const ca = Number(rows[s.id]?.ca) || 0
      const exam = Number(rows[s.id]?.exam) || 0
      if (ca < 0 || exam < 0) {
        setError(`${s.full_name}: scores cannot be negative.`)
        return
      }
      if (ca > caMax) {
        setError(`${s.full_name}: CA score cannot exceed ${caMax}.`)
        return
      }
      if (exam > examMax) {
        setError(`${s.full_name}: Exam score cannot exceed ${examMax}.`)
        return
      }
    }

    startTransition(async () => {
      const result = await saveResults({
        classId,
        subjectId,
        academicSessionId,
        termId,
        records: students.map((s) => ({
          studentId: s.id,
          caScore: Number(rows[s.id]?.ca) || 0,
          examScore: Number(rows[s.id]?.exam) || 0,
          remark: rows[s.id]?.remark || null,
        })),
        revalidatePathName,
      })

      if (result.success) {
        toast.success('Results saved.')
        router.refresh()
      } else {
        setError(result.error ?? 'Failed to save results.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">CA (max {caMax})</th>
              <th className="px-4 py-3 font-medium">Exam (max {examMax})</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Grade</th>
              <th className="px-4 py-3 font-medium">Remark</th>
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
                  <input
                    type="number"
                    min={0}
                    max={caMax}
                    step="0.5"
                    value={rows[s.id]?.ca ?? ''}
                    onChange={(e) => updateRow(s.id, 'ca', e.target.value)}
                    className="w-20 rounded-md border border-navy-200 px-2 py-1.5 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    max={examMax}
                    step="0.5"
                    value={rows[s.id]?.exam ?? ''}
                    onChange={(e) => updateRow(s.id, 'exam', e.target.value)}
                    className="w-20 rounded-md border border-navy-200 px-2 py-1.5 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-ink">{computed[s.id]?.total ?? 0}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-700">
                    {computed[s.id]?.grade ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    value={rows[s.id]?.remark ?? ''}
                    onChange={(e) => updateRow(s.id, 'remark', e.target.value)}
                    placeholder="Optional"
                    className="w-36 rounded-md border border-navy-200 px-2 py-1.5 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                  />
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
          Save results
        </button>
      </div>
    </div>
  )
}
