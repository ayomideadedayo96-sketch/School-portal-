'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { createClass, updateClass } from './actions'
import type { Class } from '@/types/database.types'

const inputClass =
  'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500'

export default function ClassForm({
  mode,
  cls,
  sessions,
  teachers,
}: {
  mode: 'create' | 'edit'
  cls?: Class
  sessions: { id: string; name: string }[]
  teachers: { id: string; full_name: string }[]
}) {
  const router = useRouter()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      const result = mode === 'create' ? await createClass(formData) : await updateClass(cls!.id, formData)

      if (!result.success) {
        setError(result.error ?? 'Something went wrong. Please try again.')
        return
      }

      toast.success(mode === 'create' ? 'Class created.' : 'Class updated.')
      router.push(`/admin/classes/${result.classId}`)
      router.refresh()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-navy-700">
            Class name <span className="text-red-500">*</span>
          </label>
          <input name="name" required defaultValue={cls?.name} placeholder="e.g. JSS 1A" className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-navy-700">Level</label>
          <input name="level" defaultValue={cls?.level ?? ''} placeholder="e.g. JSS1" className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-navy-700">
            Academic session <span className="text-red-500">*</span>
          </label>
          <select name="academic_session_id" required defaultValue={cls?.academic_session_id ?? ''} className={inputClass}>
            <option value="">Select session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-navy-700">Class teacher</label>
          <select name="class_teacher_id" defaultValue={cls?.class_teacher_id ?? ''} className={inputClass}>
            <option value="">Unassigned</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          {isPending && <Spinner className="h-4 w-4 text-white" />}
          {mode === 'create' ? 'Create class' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
