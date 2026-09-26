'use server'

import { toFriendlyError } from '@/lib/utils/errors'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/auth/requireAdmin'
import { logActivity } from '@/lib/utils/activity'

interface ActionResult {
  success: boolean
  error?: string
}

export async function createTeacherAssignment(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const teacher_id = String(formData.get('teacher_id') ?? '')
  const subject_id = String(formData.get('subject_id') ?? '')
  const class_id = String(formData.get('class_id') ?? '')
  const academic_session_id = String(formData.get('academic_session_id') ?? '')

  if (!teacher_id || !subject_id || !class_id || !academic_session_id) {
    return { success: false, error: 'Teacher, subject, class, and academic session are all required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('teacher_assignments')
    .insert({ teacher_id, subject_id, class_id, academic_session_id })

  if (error) {
    const message = error.code === '23505' ? 'That teacher is already assigned to this subject and class.' : error.message
    return { success: false, error: message }
  }

  const [{ data: teacher }, { data: subject }, { data: cls }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', teacher_id).single(),
    supabase.from('subjects').select('name').eq('id', subject_id).single(),
    supabase.from('classes').select('name').eq('id', class_id).single(),
  ])

  await logActivity({
    action: 'create',
    entityType: 'teacher_assignment',
    description: `Assigned ${teacher?.full_name ?? 'a teacher'} to teach ${subject?.name ?? 'a subject'} in ${cls?.name ?? 'a class'}`,
  })

  revalidatePath('/admin/teacher-assignments')
  return { success: true }
}

export async function deleteTeacherAssignment(assignmentId: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase.from('teacher_assignments').delete().eq('id', assignmentId)

  
  if (error) {

    console.error(error)

    return { success: false, error: toFriendlyError(error) }

  }

  revalidatePath('/admin/teacher-assignments')
  return { success: true }
}
