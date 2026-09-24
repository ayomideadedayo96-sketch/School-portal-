'use client'

import DebouncedSearchInput from '@/components/admin/DebouncedSearchInput'
import SelectFilter from '@/components/admin/SelectFilter'

export default function ClassesFilterBar() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="sm:w-64">
        <DebouncedSearchInput placeholder="Search by class name…" />
      </div>
      <SelectFilter
        paramName="status"
        options={[
          { value: 'all', label: 'All statuses' },
          { value: 'archived', label: 'Archived only' },
        ]}
        placeholder="Active classes"
      />
    </div>
  )
}
