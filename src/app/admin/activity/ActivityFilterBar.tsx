'use client'

import SelectFilter from '@/components/admin/SelectFilter'

const ACTIONS = [
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
  { value: 'archive', label: 'Archived' },
  { value: 'activate', label: 'Activated' },
  { value: 'deactivate', label: 'Deactivated' },
  { value: 'grant', label: 'Granted' },
  { value: 'revoke', label: 'Revoked' },
  { value: 'role_change', label: 'Role changed' },
]

export default function ActivityFilterBar({ entityTypes }: { entityTypes: string[] }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SelectFilter
        paramName="entity"
        options={entityTypes.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
        placeholder="All resource types"
      />
      <SelectFilter paramName="action" options={ACTIONS} placeholder="All actions" />
    </div>
  )
}
