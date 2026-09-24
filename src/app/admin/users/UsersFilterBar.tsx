'use client'

import DebouncedSearchInput from '@/components/admin/DebouncedSearchInput'
import SelectFilter from '@/components/admin/SelectFilter'

export default function UsersFilterBar() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="sm:w-64">
        <DebouncedSearchInput placeholder="Search by name or email…" />
      </div>
      <SelectFilter
        paramName="role"
        options={[
          { value: 'admin', label: 'Admin' },
          { value: 'teacher', label: 'Teacher' },
          { value: 'staff', label: 'Staff' },
        ]}
        placeholder="All roles"
      />
      <SelectFilter
        paramName="status"
        options={[
          { value: 'all', label: 'All statuses' },
          { value: 'inactive', label: 'Inactive only' },
        ]}
        placeholder="Active users"
      />
    </div>
  )
}
