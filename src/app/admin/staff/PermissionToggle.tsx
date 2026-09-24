'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { grantStaffPermission, revokeStaffPermission } from './actions'
import type { StaffPermissionName } from '@/types/database.types'

export default function PermissionToggle({
  profileId,
  permission,
  label,
  description,
  granted,
}: {
  profileId: string
  permission: StaffPermissionName
  label: string
  description: string
  granted: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = granted
        ? await revokeStaffPermission(profileId, permission)
        : await grantStaffPermission(profileId, permission)

      if (result.success) {
        toast.success(granted ? `${label} permission revoked.` : `${label} permission granted.`)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Something went wrong.')
      }
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-navy-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
          granted
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-navy-200 text-navy-600 hover:bg-navy-50'
        }`}
      >
        {isPending && <Spinner className="h-3 w-3" />}
        {granted ? 'Granted — click to revoke' : 'Not granted — click to grant'}
      </button>
    </div>
  )
}
