'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/auth/requireAdmin'
import { logActivity } from '@/lib/utils/activity'
import { ALL_DAYS } from '@/lib/utils/schedule'

interface ActionResult {
  success: boolean
  error?: string
}

function parseEntry(formData: FormData) {
  const class_id = String(formData.get('class_id') ?? '')
  const academic_session_id = String(formData.get('academic_session_id') ?? '')
  const day_of_week = String(formData.get('day_of_week') ?? '')
  const period = Number(formData.get('period'))
  const subject_id = String(formData.get('subject_id') ?? '')
  const teacher_id = String(formData.get('teacher_id') ?? '')
  const room = String(formData.get('room') ?? '').trim()

  if (!class_id || !academic_session_id || !day_of_week || !subject_id || !teacher_id) {
    return { error: 'Class, session, day, subject, and teacher are all required.' } as const
  }
  if (!ALL_DAYS.includes(day_of_week as any)) {
    return { error: 'Invalid day of week.' } as const
  }
  if (!Number.isInteger(period) || period < 1 || period > 12) {
    return { error: 'Period must be a number between 1 and 12.' } as const
  }

  return {
    data: {
      class_id,
      academic_session_id,
      day_of_week,
      period,
      subject_id,
      teacher_id,
      room: room || null,
    },
  } as const
}

/**
 * A class can only have one lesson per period per day (enforced by a DB
 * unique constraint, caught below). A teacher, on the other hand, cannot
 * be in two classes at once — that has no single-column unique constraint
 * to lean on, so it's checked here explicitly before writing.
 */
async function findTeacherConflict(params: {
  teacher_id: string
  academic_session_id: string
  day_of_week: string
  period: number
  excludeId?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('timetable_entries')
    .select('id, class:classes(name)')
    .eq('teacher_id', params.teacher_id)
    .eq('academic_session_id', params.academic_session_id)
    .eq('day_of_week', params.day_of_week)
    .eq('period', params.period)

  if (params.excludeId) query = query.neq('id', params.excludeId)

  const { data } = await query.maybeSingle()
  return data as { id: string; class: { name: string } | null } | null
}

export async function createTimetableEntry(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = parseEntry(formData)
  if ('error' in parsed) return { success: false, error: parsed.error }

  const conflict = await findTeacherConflict(parsed.data)
  if (conflict) {
    return {
      success: false,
      error: `That teacher is already scheduled for ${conflict.class?.name ?? 'another class'} in this period.`,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('timetable_entries').insert(parsed.data)

  if (error) {
    const message =
      error.code === '23505' ? 'This class already has a lesson scheduled in that period.' : error.message
    return { success: false, error: message }
  }

  const [{ data: cls }, { data: subject }, { data: teacher }] = await Promise.all([
    supabase.from('classes').select('name').eq('id', parsed.data.class_id).single(),
    supabase.from('subjects').select('name').eq('id', parsed.data.subject_id).single(),
    supabase.from('profiles').select('full_name').eq('id', parsed.data.teacher_id).single(),
  ])

  await logActivity({
    action: 'create',
    entityType: 'timetable_entry',
    description: `Scheduled ${subject?.name ?? 'a subject'} with ${teacher?.full_name ?? 'a teacher'} for ${cls?.name ?? 'a class'} on ${parsed.data.day_of_week} (period ${parsed.data.period})`,
  })

  revalidatePath('/admin/timetable')
  revalidatePath('/teacher/timetable')
  revalidatePath('/teacher')
  return { success: true }
}

export async function updateTimetableEntry(entryId: string, formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = parseEntry(formData)
  if ('error' in parsed) return { success: false, error: parsed.error }

  const conflict = await findTeacherConflict({ ...parsed.data, excludeId: entryId })
  if (conflict) {
    return {
      success: false,
      error: `That teacher is already scheduled for ${conflict.class?.name ?? 'another class'} in this period.`,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('timetable_entries').update(parsed.data).eq('id', entryId)

  if (error) {
    const message =
      error.code === '23505' ? 'This class already has a lesson scheduled in that period.' : error.message
    return { success: false, error: message }
  }

  revalidatePath('/admin/timetable')
  revalidatePath('/teacher/timetable')
  revalidatePath('/teacher')
  return { success: true }
}

export async function deleteTimetableEntry(entryId: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase.from('timetable_entries').delete().eq('id', entryId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/timetable')
  revalidatePath('/teacher/timetable')
  revalidatePath('/teacher')
  return { success: true }
}
