'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/requireProfile'
import { logActivity } from '@/lib/utils/activity'
import type { AttendanceStatus } from '@/types/database.types'

interface ActionResult {
  success: boolean
  error?: string
}

export async function saveAttendance(params: {
  classId: string
  academicSessionId: string
  termId: string | null
  date: string
  records: { studentId: string; status: AttendanceStatus }[]
  revalidatePathName: string
}): Promise<ActionResult> {
  const auth = await requireProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  if (!params.classId || !params.academicSessionId || !params.date) {
    return { success: false, error: 'Session, class, and date are required.' }
  }
  if (params.records.length === 0) {
    return { success: false, error: 'No students to save attendance for.' }
  }

  const supabase = await createClient()

  const rows = params.records.map((r) => ({
    student_id: r.studentId,
    class_id: params.classId,
    academic_session_id: params.academicSessionId,
    term_id: params.termId,
    date: params.date,
    status: r.status,
  }))

  // Upsert on (student_id, date) — this is what makes re-saving the
  // same class/date an edit rather than a rejected duplicate, while the
  // unique constraint still stops the same student being recorded twice
  // for one calendar day under two different classes.
  const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date' })

  if (error) {
    return { success: false, error: error.message }
  }

  await logActivity({
    action: 'record',
    entityType: 'attendance',
    description: `Recorded attendance for ${rows.length} student${rows.length === 1 ? '' : 's'} on ${params.date}`,
  })

  revalidatePath(params.revalidatePathName)
  return { success: true }
}
