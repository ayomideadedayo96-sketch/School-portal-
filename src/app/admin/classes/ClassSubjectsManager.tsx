'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { addClassSubject, removeClassSubject } from './actions'

interface AssignedSubject {
  classSubjectId: string
  subjectId: string
  name: string
}

export default function ClassSubjectsManager({
  classId,
  academicSessionId,
  assigned,
  available,
}: {
  classId: string
  academicSessionId: string
  assigned: AssignedSubject[]
  available: { id: string; name: string }[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [selected, setSelected] = useState('')
  const [isPending, startTransition] = useTransition()

  const unassigned = available.filter((s) => !assigned.some((a) => a.subjectId === s.id))

  function handleAdd() {
    if (!selected) return
    startTransition(async () => {
      const result = await addClassSubject(classId, selected, academicSessionId)
      if (result.success) {
        toast.success('Subject added to class.')
        setSelected('')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to add subject.')
      }
    })
  }

  function handleRemove(classSubjectId: string) {
    startTransition(async () => {
      const result = await removeClassSubject(classSubjectId, classId)
      if (result.success) {
        toast.success('Subject removed from class.')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to remove subject.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {assigned.length === 0 ? (
        <p className="text-sm text-navy-400">No subjects assigned to this class yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {assigned.map((s) => (
            <li
              key={s.classSubjectId}
              className="flex items-center gap-2 rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-sm text-navy-700"
            >
              {s.name}
              <button
                type="button"
                onClick={() => handleRemove(s.classSubjectId)}
                disabled={isPending}
                className="text-navy-400 hover:text-red-600"
                aria-label={`Remove ${s.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {unassigned.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
          >
            <option value="">Add a subject…</option>
            {unassigned.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selected || isPending}
            className="flex items-center gap-2 rounded-md border border-navy-200 px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-60"
          >
            {isPending && <Spinner className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      )}
    </div>
  )
}
