'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { changeUserRole } from './actions'
import type { UserRole } from '@/types/database.types'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'staff', label: 'Staff' },
]

export default function RoleChangeControl({
  profileId,
  currentRole,
  isSelf,
}: {
  profileId: string
  currentRole: UserRole
  isSelf: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [selected, setSelected] = useState<UserRole>(currentRole)
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (isSelf) {
    return (
      <p className="text-xs text-navy-400">
        You can&apos;t change your own role. Ask another administrator to do this.
      </p>
    )
  }

  function handleSave() {
    startTransition(async () => {
      const result = await changeUserRole(profileId, selected)
      setConfirming(false)
      if (result.success) {
        toast.success('Role updated.')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Something went wrong.')
        setSelected(currentRole)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as UserRole)}
        disabled={isPending}
        className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500 disabled:opacity-60"
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {selected !== currentRole && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md bg-navy-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-navy-800"
        >
          Save role
        </button>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-navy-800">Change this user&apos;s role?</h2>
            <p className="mt-2 text-sm text-navy-500">
              Their role will change from <span className="font-medium capitalize">{currentRole}</span> to{' '}
              <span className="font-medium capitalize">{selected}</span>. This immediately changes what they can
              access.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  setSelected(currentRole)
                }}
                disabled={isPending}
                className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-2 rounded-md bg-navy-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
              >
                {isPending && <Spinner className="h-3.5 w-3.5 text-white" />}
                Confirm change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
