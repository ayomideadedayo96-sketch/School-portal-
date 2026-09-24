'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/auth/requireAdmin'
import { logActivity } from '@/lib/utils/activity'

interface ActionResult {
  success: boolean
  error?: string
}

export async function createSubject(name: string, code: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const trimmedName = name.trim()
  if (!trimmedName) return { success: false, error: 'Subject name is required.' }

  const supabase = await createClient()
  const { data: subject, error } = await supabase
    .from('subjects')
    .insert({ name: trimmedName, code: code.trim() || null })
    .select('id')
    .single()

  if (error) {
    const message = error.code === '23505' ? 'A subject with that code already exists.' : error.message
    return { success: false, error: message }
  }

  await logActivity({
    action: 'create',
    entityType: 'subject',
    entityId: subject.id,
    description: `Added subject ${trimmedName}`,
  })

  revalidatePath('/admin/subjects')
  return { success: true }
}

export async function updateSubject(subjectId: string, name: string, code: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const trimmedName = name.trim()
  if (!trimmedName) return { success: false, error: 'Subject name is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('subjects')
    .update({ name: trimmedName, code: code.trim() || null })
    .eq('id', subjectId)

  if (error) {
    const message = error.code === '23505' ? 'A subject with that code already exists.' : error.message
    return { success: false, error: message }
  }

  await logActivity({
    action: 'update',
    entityType: 'subject',
    entityId: subjectId,
    description: `Updated subject ${trimmedName}`,
  })

  revalidatePath('/admin/subjects')
  return { success: true }
}

export async function deleteSubject(subjectId: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase.from('subjects').delete().eq('id', subjectId)

  if (error) {
    const message = error.code === '23503'
      ? 'This subject is still assigned to a class or teacher — remove those assignments first.'
      : error.message
    return { success: false, error: message }
  }

  revalidatePath('/admin/subjects')
  return { success: true }
}
