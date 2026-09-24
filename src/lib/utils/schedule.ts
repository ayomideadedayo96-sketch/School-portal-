import { DAYS_OF_WEEK, type DayOfWeek } from '@/types/database.types'

// Standard teaching week (Mon–Fri) and a generous default period count.
// Admins can still create entries on Saturday if the school schedules
// weekend classes — DAYS_OF_WEEK in database.types.ts allows it — but the
// grid and "add entry" defaults focus on the Mon–Fri teaching week.
export const TEACHING_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
export const ALL_DAYS: DayOfWeek[] = [...DAYS_OF_WEEK]
export const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1)

/** Returns today's weekday name in the shape stored in `day_of_week`. */
export function getTodayDayName(): DayOfWeek {
  const names: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return names[new Date().getDay()]
}
