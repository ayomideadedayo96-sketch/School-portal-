'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import TimetableGrid from '@/components/timetable/TimetableGrid'
import { ALL_DAYS, PERIODS } from '@/lib/utils/schedule'
import type { TimetableEntryWithDetails } from '@/types/database.types'
import { createTimetableEntry, deleteTimetableEntry, updateTimetableEntry } from './actions'

const inputClass =
  'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500'

export default function TimetableManager({
  entries,
  classes,
  subjects,
  teachers,
  sessions,
  defaultSessionId,
}: {
  entries: TimetableEntryWithDetails[]
  classes: { id: string; name: string }[]
  subjects: { id: string; name: string }[]
  teachers: { id: string; full_name: string }[]
  sessions: { id: string; name: string }[]
  defaultSessionId?: string
}) {
  const router = useRouter()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TimetableEntryWithDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setError(null)
    setOpen(true)
  }

  function openEdit(entry: TimetableEntryWithDetails) {
    setEditing(entry)
    setError(null)
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      const result = editing
        ? await updateTimetableEntry(editing.id, formData)
        : await createTimetableEntry(formData)

      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      toast.success(editing ? 'Timetable entry updated.' : 'Timetable entry added.')
      setOpen(false)
      setEditing(null)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!editing) return
    startDeleteTransition(async () => {
      const result = await deleteTimetableEntry(editing.id)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      toast.success('Timetable entry removed.')
      setOpen(false)
      setEditing(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          Add entry
        </button>
      </div>

      <TimetableGrid entries={entries} days={ALL_DAYS} periods={PERIODS} showClass onEditEntry={openEdit} />

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-navy-800">
              {editing ? 'Edit timetable entry' : 'Add timetable entry'}
            </h2>

            <form ref={formRef} onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-700">Class</label>
                  <select name="class_id" required className={inputClass} defaultValue={editing?.class_id ?? ''}>
                    <option value="" disabled>
                      Select class
                    </option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-700">Day</label>
                  <select name="day_of_week" required className={inputClass} defaultValue={editing?.day_of_week ?? ''}>
                    <option value="" disabled>
                      Select day
                    </option>
                    {ALL_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-700">Period</label>
                  <select
                    name="period"
                    required
                    className={inputClass}
                    defaultValue={editing?.period ? String(editing.period) : ''}
                  >
                    <option value="" disabled>
                      Select period
                    </option>
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>
                        Period {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-700">Room</label>
                  <input
                    name="room"
                    type="text"
                    placeholder="e.g. Block A-3"
                    className={inputClass}
                    defaultValue={editing?.room ?? ''}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Subject</label>
                <select name="subject_id" required className={inputClass} defaultValue={editing?.subject_id ?? ''}>
                  <option value="" disabled>
                    Select subject
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Teacher</label>
                <select name="teacher_id" required className={inputClass} defaultValue={editing?.teacher_id ?? ''}>
                  <option value="" disabled>
                    Select teacher
                  </option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Academic session</label>
                <select
                  name="academic_session_id"
                  required
                  className={inputClass}
                  defaultValue={editing?.academic_session_id ?? defaultSessionId ?? ''}
                >
                  <option value="" disabled>
                    Select session
                  </option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                {editing ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending || isDeleting}
                    className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    {isDeleting && <Spinner className="h-3.5 w-3.5 text-red-600" />}
                    Delete
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      setEditing(null)
                    }}
                    disabled={isPending || isDeleting}
                    className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || isDeleting}
                    className="flex items-center gap-2 rounded-md bg-navy-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
                  >
                    {isPending && <Spinner className="h-3.5 w-3.5 text-white" />}
                    {editing ? 'Save changes' : 'Add entry'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
