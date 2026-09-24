import type { TimetableEntryWithDetails } from '@/types/database.types'

export default function TimetableGrid({
  entries,
  days,
  periods,
  showClass = false,
  showTeacher = true,
  onEditEntry,
}: {
  entries: TimetableEntryWithDetails[]
  days: readonly string[]
  periods: readonly number[]
  /** Show the class name in each cell — useful for a teacher's own weekly view, which spans classes. */
  showClass?: boolean
  /** Show the teacher name in each cell — usually hidden on a teacher's own timetable. */
  showTeacher?: boolean
  /** If provided, cells become clickable buttons (admin edit flow). */
  onEditEntry?: (entry: TimetableEntryWithDetails) => void
}) {
  const byDayPeriod = new Map<string, TimetableEntryWithDetails>()
  entries.forEach((e) => byDayPeriod.set(`${e.day_of_week}-${e.period}`, e))

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white shadow-sm">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-navy-100 bg-navy-50/60 text-xs uppercase tracking-wide text-navy-400">
            <th className="w-20 px-3 py-3 font-medium">Period</th>
            {days.map((day) => (
              <th key={day} className="px-3 py-3 font-medium">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {periods.map((period) => (
            <tr key={period}>
              <td className="whitespace-nowrap px-3 py-3 align-top font-medium text-navy-600">
                Period {period}
              </td>
              {days.map((day) => {
                const entry = byDayPeriod.get(`${day}-${period}`)
                return (
                  <td key={day} className="min-w-[140px] px-2 py-2 align-top">
                    {entry ? (
                      onEditEntry ? (
                        <button
                          type="button"
                          onClick={() => onEditEntry(entry)}
                          className="w-full rounded-md border border-navy-100 bg-navy-50/60 px-2.5 py-2 text-left transition hover:border-navy-300 hover:bg-navy-50"
                        >
                          <Cell entry={entry} showClass={showClass} showTeacher={showTeacher} />
                        </button>
                      ) : (
                        <div className="rounded-md border border-navy-100 bg-navy-50/60 px-2.5 py-2">
                          <Cell entry={entry} showClass={showClass} showTeacher={showTeacher} />
                        </div>
                      )
                    ) : (
                      <div className="px-2.5 py-2 text-navy-200">—</div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Cell({
  entry,
  showClass,
  showTeacher,
}: {
  entry: TimetableEntryWithDetails
  showClass: boolean
  showTeacher: boolean
}) {
  return (
    <>
      <p className="truncate text-sm font-medium text-ink">{entry.subject?.name ?? 'Subject'}</p>
      {showClass && <p className="truncate text-xs text-navy-500">{entry.class?.name}</p>}
      {showTeacher && <p className="truncate text-xs text-navy-500">{entry.teacher?.full_name}</p>}
      {entry.room && <p className="truncate text-xs text-navy-400">Room {entry.room}</p>}
    </>
  )
}
