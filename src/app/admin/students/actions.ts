'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/auth/requireAdmin'
import { logActivity } from '@/lib/utils/activity'
import type { Gender } from '@/types/database.types'

interface ActionResult {
  success: boolean
  error?: string
  studentId?: string
}

function readStudentFields(formData: FormData) {
  return {
    admission_number: String(formData.get('admission_number') ?? '').trim(),
    first_name: String(formData.get('first_name') ?? '').trim(),
    middle_name: String(formData.get('middle_name') ?? '').trim() || null,
    last_name: String(formData.get('last_name') ?? '').trim(),
    date_of_birth: String(formData.get('date_of_birth') ?? '') || null,
    gender: (String(formData.get('gender') ?? '') || null) as Gender | null,
    class_id: String(formData.get('class_id') ?? '') || null,
    guardian_name: String(formData.get('guardian_name') ?? '').trim() || null,
    guardian_phone: String(formData.get('guardian_phone') ?? '').trim() || null,
    address: String(formData.get('address') ?? '').trim() || null,
    admission_date: String(formData.get('admission_date') ?? '') || new Date().toISOString().slice(0, 10),
  }
}

async function uploadPhotoIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  formData: FormData
): Promise<{ photoPath?: string; error?: string }> {
  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) return {}

  if (!file.type.startsWith('image/')) {
    return { error: 'Photo must be an image file.' }
  }
  if (file.size > 4 * 1024 * 1024) {
    return { error: 'Photo must be smaller than 4MB.' }
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${studentId}/photo-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('student-photos').upload(path, file, {
    upsert: false,
  })

  if (uploadError) {
    return { error: 'Failed to upload photo. The student record was still saved.' }
  }

  return { photoPath: path }
}

export async function createStudent(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const fields = readStudentFields(formData)

  if (!fields.admission_number || !fields.first_name || !fields.last_name) {
    return { success: false, error: 'Student ID, first name, and last name are required.' }
  }

  const supabase = await createClient()

  const { data: inserted, error: insertError } = await supabase
    .from('students')
    .insert(fields)
    .select('id')
    .single()

  if (insertError) {
    const message = insertError.code === '23505' ? 'That Student ID is already in use.' : insertError.message
    return { success: false, error: message }
  }

  const { photoPath, error: photoError } = await uploadPhotoIfPresent(supabase, inserted.id, formData)
  if (photoPath) {
    await supabase.from('students').update({ photo_url: photoPath }).eq('id', inserted.id)
  }

  await logActivity({
    action: 'create',
    entityType: 'student',
    entityId: inserted.id,
    description: `Added student ${fields.first_name} ${fields.last_name} (${fields.admission_number})`,
  })

  revalidatePath('/admin/students')
  revalidatePath('/admin')

  if (photoError) return { success: true, studentId: inserted.id, error: photoError }
  return { success: true, studentId: inserted.id }
}

export async function updateStudent(studentId: string, formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const fields = readStudentFields(formData)

  if (!fields.admission_number || !fields.first_name || !fields.last_name) {
    return { success: false, error: 'Student ID, first name, and last name are required.' }
  }

  const supabase = await createClient()

  const { error: updateError } = await supabase.from('students').update(fields).eq('id', studentId)

  if (updateError) {
    const message = updateError.code === '23505' ? 'That Student ID is already in use.' : updateError.message
    return { success: false, error: message }
  }

  const file = formData.get('photo')
  if (file instanceof File && file.size > 0) {
    const { data: existing } = await supabase.from('students').select('photo_url').eq('id', studentId).single()
    const { photoPath, error: photoError } = await uploadPhotoIfPresent(supabase, studentId, formData)

    if (photoPath) {
      await supabase.from('students').update({ photo_url: photoPath }).eq('id', studentId)
      if (existing?.photo_url) {
        await supabase.storage.from('student-photos').remove([existing.photo_url])
      }
    }
    if (photoError) {
      revalidatePath(`/admin/students/${studentId}`)
      return { success: true, studentId, error: photoError }
    }
  }

  await logActivity({
    action: 'update',
    entityType: 'student',
    entityId: studentId,
    description: `Updated student ${fields.first_name} ${fields.last_name} (${fields.admission_number})`,
  })

  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${studentId}`)

  return { success: true, studentId }
}

export async function setStudentStatus(studentId: string, status: 'active' | 'archived'): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { data: student, error } = await supabase
    .from('students')
    .update({ status })
    .eq('id', studentId)
    .select('full_name, admission_number')
    .single()

  if (error) return { success: false, error: error.message }

  await logActivity({
    action: status === 'archived' ? 'archive' : 'restore',
    entityType: 'student',
    entityId: studentId,
    description: `${status === 'archived' ? 'Archived' : 'Restored'} student ${student.full_name} (${student.admission_number})`,
  })

  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${studentId}`)
  revalidatePath('/admin')

  return { success: true }
}
