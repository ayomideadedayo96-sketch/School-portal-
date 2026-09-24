'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/auth/requireAdmin'
import { logActivity } from '@/lib/utils/activity'

interface ActionResult {
  success: boolean
  error?: string
  classId?: string
}

export async function createClass(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const name = String(formData.get('name') ?? '').trim()
  const level = String(formData.get('level') ?? '').trim() || null
  const academic_session_id = String(formData.get('academic_session_id') ?? '') || null
  const class_teacher_id = String(formData.get('class_teacher_id') ?? '') || null

  if (!name || !academic_session_id) {
    return { success: false, error: 'Class name and academic session are required.' }
  }

  const supabase = await createClient()
  const { data: cls, error } = await supabase
    .from('classes')
    .insert({ name, level, academic_session_id, class_teacher_id })
    .select('id')
    .single()

  if (error) {
    const message = error.code === '23505' ? 'A class with that name already exists for this session.' : error.message
    return { success: false, error: message }
  }

  await logActivity({ action: 'create', entityType: 'class', entityId: cls.id, description: `Created class ${name}` })

  revalidatePath('/admin/classes')
  revalidatePath('/admin')

  return { success: true, classId: cls.id }
}

export async function updateClass(classId: string, formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const name = String(formData.get('name') ?? '').trim()
  const level = String(formData.get('level') ?? '').trim() || null
  const academic_session_id = String(formData.get('academic_session_id') ?? '') || null
  const class_teacher_id = String(formData.get('class_teacher_id') ?? '') || null

  if (!name || !academic_session_id) {
    return { success: false, error: 'Class name and academic session are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('classes')
    .update({ name, level, academic_session_id, class_teacher_id })
    .eq('id', classId)

  if (error) {
    const message = error.code === '23505' ? 'A class with that name already exists for this session.' : error.message
    return { success: false, error: message }
  }

  await logActivity({ action: 'update', entityType: 'class', entityId: classId, description: `Updated class ${name}` })

  revalidatePath('/admin/classes')
  revalidatePath(`/admin/classes/${classId}`)

  return { success: true, classId }
}

export async function setClassStatus(classId: string, status: 'active' | 'archived'): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { data: cls, error } = await supabase
    .from('classes')
    .update({ status })
    .eq('id', classId)
    .select('name')
    .single()

  if (error) return { success: false, error: error.message }

  await logActivity({
    action: status === 'archived' ? 'archive' : 'restore',
    entityType: 'class',
    entityId: classId,
    description: `${status === 'archived' ? 'Archived' : 'Restored'} class ${cls.name}`,
  })

  revalidatePath('/admin/classes')
  revalidatePath(`/admin/classes/${classId}`)
  revalidatePath('/admin')

  return { success: true }
}

export async function addClassSubject(classId: string, subjectId: string, academicSessionId: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('class_subjects')
    .insert({ class_id: classId, subject_id: subjectId, academic_session_id: academicSessionId })

  if (error) {
    const message = error.code === '23505' ? 'That subject is already assigned to this class.' : error.message
    return { success: false, error: message }
  }

  revalidatePath(`/admin/classes/${classId}`)
  return { success: true }
}

export async function removeClassSubject(classSubjectId: string, classId: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase.from('class_subjects').delete().eq('id', classSubjectId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/admin/classes/${classId}`)
  return { success: true }
}
