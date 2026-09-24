'use client'

import SelectFilter from '@/components/admin/SelectFilter'
import { ALL_DAYS } from '@/lib/utils/schedule'

export default function TimetableFilterBar({
  classes,
  teachers,
}: {
  classes: { id: string; name: string }[]
  teachers: { id: string; full_name: string }[]
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SelectFilter paramName="class" options={classes.map((c) => ({ value: c.id, label: c.name }))} placeholder="All classes" />
      <SelectFilter
        paramName="teacher"
        options={teachers.map((t) => ({ value: t.id, label: t.full_name }))}
        placeholder="All teachers"
      />
      <SelectFilter paramName="day" options={ALL_DAYS.map((d) => ({ value: d, label: d }))} placeholder="All days" />
    </div>
  )
}
