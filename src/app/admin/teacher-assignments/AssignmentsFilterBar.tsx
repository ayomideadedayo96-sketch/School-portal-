'use client'

import SelectFilter from '@/components/admin/SelectFilter'

export default function AssignmentsFilterBar({
  teachers,
  subjects,
  classes,
}: {
  teachers: { id: string; full_name: string }[]
  subjects: { id: string; name: string }[]
  classes: { id: string; name: string }[]
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SelectFilter
        paramName="teacher"
        options={teachers.map((t) => ({ value: t.id, label: t.full_name }))}
        placeholder="All teachers"
      />
      <SelectFilter
        paramName="subject"
        options={subjects.map((s) => ({ value: s.id, label: s.name }))}
        placeholder="All subjects"
      />
      <SelectFilter
        paramName="class"
        options={classes.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="All classes"
      />
    </div>
  )
}
