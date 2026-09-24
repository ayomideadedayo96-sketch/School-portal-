'use client'

import DebouncedSearchInput from '@/components/admin/DebouncedSearchInput'
import SelectFilter from '@/components/admin/SelectFilter'

export default function StudentsFilterBar({
  classOptions,
}: {
  classOptions: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="sm:w-64">
        <DebouncedSearchInput placeholder="Search by name or student ID…" />
      </div>
      <SelectFilter paramName="class" options={classOptions} placeholder="All classes" />
      <SelectFilter
        paramName="gender"
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ]}
        placeholder="All genders"
      />
      <SelectFilter
        paramName="status"
        options={[
          { value: 'all', label: 'All statuses' },
          { value: 'archived', label: 'Archived only' },
        ]}
        placeholder="Active students"
      />
    </div>
  )
}
