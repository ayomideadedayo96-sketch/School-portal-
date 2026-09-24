'use client'

import DebouncedSearchInput from '@/components/admin/DebouncedSearchInput'
import SelectFilter from '@/components/admin/SelectFilter'
import { AUDIENCE_LABELS, type Audience } from '@/types/database.types'

export default function DocumentsFilterBar({
  classOptions,
}: {
  classOptions: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="sm:w-64">
        <DebouncedSearchInput placeholder="Search by title or file name…" />
      </div>
      <SelectFilter
        paramName="audience"
        options={(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => ({
          value: a,
          label: AUDIENCE_LABELS[a],
        }))}
        placeholder="All audiences"
      />
      <SelectFilter paramName="class" options={classOptions} placeholder="All classes" />
      <SelectFilter
        paramName="type"
        options={[
          { value: 'pdf', label: 'PDF' },
          { value: 'doc', label: 'DOC' },
          { value: 'docx', label: 'DOCX' },
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
        ]}
        placeholder="All file types"
      />
    </div>
  )
}
