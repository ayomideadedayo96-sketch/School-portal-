'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { createStaffAccount, updateStaff } from './actions'
import type { StaffWithProfile } from '@/types/database.types'

const inputClass =
  'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500 disabled:bg-navy-50 disabled:text-navy-400'

export default function StaffForm({
  mode,
  staff,
}: {
  mode: 'create' | 'edit'
  staff?: StaffWithProfile
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
      const result =
        mode === 'create' ? await createStaffAccount(formData) : await updateStaff(staff!.id, formData)

      if (!result.success) {
        setError(result.error ?? 'Something went wrong. Please try again.')
        return
      }

      toast.success(
        mode === 'create' ? 'Staff invited — they will receive an email to set their password.' : 'Staff updated.'
      )
      router.push(`/admin/staff/${result.staffId}`)
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
        <Field label="Full name" name="full_name" required defaultValue={staff?.profile.full_name} />

        <Field label="Email" required>
          <input
            type="email"
            name="email"
            required
            disabled={mode === 'edit'}
            defaultValue={staff?.profile.email}
            className={inputClass}
          />
          {mode === 'create' && (
            <p className="mt-1 text-xs text-navy-400">
              They&apos;ll receive an email invite to set their own password.
            </p>
          )}
        </Field>

        <Field label="Phone" name="phone" defaultValue={staff?.profile.phone ?? ''} />

        <Field label="Role" required>
          <select name="role" required defaultValue={staff?.profile.role ?? 'staff'} className={inputClass}>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="staff">Staff</option>
          </select>
        </Field>

        <Field label="Department" name="department" defaultValue={staff?.department ?? ''} />
        <Field label="Position" name="position" defaultValue={staff?.position ?? ''} />
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
          {mode === 'create' ? 'Invite staff member' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

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
