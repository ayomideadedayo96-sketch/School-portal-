'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { createTeacherAssignment } from './actions'

const inputClass =
  'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500'

export default function AssignmentDialog({
  teachers,
  subjects,
  classes,
  sessions,
  defaultSessionId,
}: {
  teachers: { id: string; full_name: string }[]
  subjects: { id: string; name: string }[]
  classes: { id: string; name: string }[]
  sessions: { id: string; name: string }[]
  defaultSessionId?: string
}) {
  const router = useRouter()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      const result = await createTeacherAssignment(formData)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      toast.success('Assignment created.')
      setOpen(false)
      formRef.current?.reset()
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
      >
        Add assignment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-navy-800">Assign teacher</h2>

            <form ref={formRef} onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Teacher</label>
                <select name="teacher_id" required className={inputClass} defaultValue="">
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
                <label className="text-sm font-medium text-navy-700">Subject</label>
                <select name="subject_id" required className={inputClass} defaultValue="">
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
                <label className="text-sm font-medium text-navy-700">Class</label>
                <select name="class_id" required className={inputClass} defaultValue="">
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
                <label className="text-sm font-medium text-navy-700">Academic session</label>
                <select name="academic_session_id" required className={inputClass} defaultValue={defaultSessionId ?? ''}>
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

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-md bg-navy-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
                >
                  {isPending && <Spinner className="h-3.5 w-3.5 text-white" />}
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
