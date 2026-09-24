'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { createStudent, updateStudent } from './actions'
import type { Student } from '@/types/database.types'

interface ClassOption {
  id: string
  name: string
  level: string | null
}

export default function StudentForm({
  mode,
  classes,
  student,
  photoUrl,
}: {
  mode: 'create' | 'edit'
  classes: ClassOption[]
  student?: Student
  photoUrl?: string | null
}) {
  const router = useRouter()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(photoUrl ?? null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      const result =
        mode === 'create' ? await createStudent(formData) : await updateStudent(student!.id, formData)

      if (!result.success) {
        setError(result.error ?? 'Something went wrong. Please try again.')
        return
      }

      if (result.error) {
        // Saved, but the photo upload itself failed — still a partial success.
        toast.error(result.error)
      } else {
        toast.success(mode === 'create' ? 'Student added.' : 'Student updated.')
      }

      router.push(`/admin/students/${result.studentId}`)
      router.refresh()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-32 w-32 overflow-hidden rounded-full border border-navy-100 bg-navy-50">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Student photo preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-navy-300">
                No photo
              </div>
            )}
          </div>
          <label className="cursor-pointer rounded-md border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50">
            Choose photo
            <input type="file" name="photo" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Student ID" name="admission_number" required defaultValue={student?.admission_number} />
          <Field label="Class">
            <select
              name="class_id"
              defaultValue={student?.class_id ?? ''}
              className={inputClass}
            >
              <option value="">Unassigned</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="First name" name="first_name" required defaultValue={student?.first_name} />
          <Field label="Middle name" name="middle_name" defaultValue={student?.middle_name ?? ''} />
          <Field label="Last name" name="last_name" required defaultValue={student?.last_name} />

          <Field label="Date of birth">
            <input
              type="date"
              name="date_of_birth"
              defaultValue={student?.date_of_birth ?? ''}
              className={inputClass}
            />
          </Field>

          <Field label="Gender">
            <select name="gender" defaultValue={student?.gender ?? ''} className={inputClass}>
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>

          <Field label="Admission date">
            <input
              type="date"
              name="admission_date"
              defaultValue={student?.admission_date ?? new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </Field>

          <Field label="Guardian name" name="guardian_name" defaultValue={student?.guardian_name ?? ''} />
          <Field label="Guardian phone" name="guardian_phone" defaultValue={student?.guardian_phone ?? ''} />

          <div className="sm:col-span-2">
            <Field label="Address">
              <textarea
                name="address"
                rows={2}
                defaultValue={student?.address ?? ''}
                className={inputClass}
              />
            </Field>
          </div>
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
          {mode === 'create' ? 'Add student' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

const inputClass =
  'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500'

function Field({
  label,
  name,
  required,
  defaultValue,
  children,
}: {
  label: string
  name?: string
  required?: boolean
  defaultValue?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-navy-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children ?? (
        <input name={name} required={required} defaultValue={defaultValue} className={inputClass} />
      )}
    </div>
  )
}
