import type { GradeBoundary } from '@/types/database.types'

/**
 * Finds the matching grade boundary for a total score. Boundaries are
 * admin-configurable (Admin > Settings > Grading) rather than hard-coded,
 * so callers always pass the current list fetched from the database.
 */
export function computeGrade(
  total: number,
  boundaries: Pick<GradeBoundary, 'grade' | 'min_score' | 'max_score' | 'remark'>[]
): { grade: string | null; remark: string | null } {
  const match = boundaries.find((b) => total >= b.min_score && total <= b.max_score)
  return { grade: match?.grade ?? null, remark: match?.remark ?? null }
}
