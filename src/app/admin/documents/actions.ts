'use server'

import { toFriendlyError } from '@/lib/utils/errors'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/auth/requireAdmin'
import { logActivity } from '@/lib/utils/activity'
import { DOCUMENT_BUCKET, MAX_DOCUMENT_SIZE, inferDocumentType } from '@/lib/utils/documents'
import type { Audience } from '@/types/database.types'

interface ActionResult {
  success: boolean
  error?: string
}

const VALID_AUDIENCES: Audience[] = ['all', 'teachers', 'staff', 'class']

function revalidateDocumentPaths() {
  revalidatePath('/admin/documents')
  revalidatePath('/teacher/documents')
  revalidatePath('/teacher')
  revalidatePath('/staff/documents')
  revalidatePath('/staff')
}

export async function createDocument(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const audience = String(formData.get('audience') ?? 'all') as Audience
  const class_id = String(formData.get('class_id') ?? '').trim() || null
  const file = formData.get('file')

  if (!title) return { success: false, error: 'Title is required.' }
  if (!VALID_AUDIENCES.includes(audience)) return { success: false, error: 'Invalid audience.' }
  if (audience === 'class' && !class_id) {
    return { success: false, error: 'Choose a class for the "Specific Class" audience.' }
  }
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Choose a file to upload.' }
  }

  const fileType = inferDocumentType(file.name)
  if (!fileType) {
    return { success: false, error: 'Allowed file types are PDF, DOC, DOCX, JPG, and PNG.' }
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    return { success: false, error: 'File must be smaller than 10MB.' }
  }

  const supabase = await createClient()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined })

  if (uploadError) {
    return { success: false, error: 'Failed to upload the file. Please try again.' }
  }

  const { error: insertError } = await supabase.from('documents').insert({
    title,
    description: description || null,
    file_path: path,
    file_name: file.name,
    file_type: fileType,
    file_size: file.size,
    audience,
    class_id: audience === 'class' ? class_id : null,
  })

  if (insertError) {
    // Roll back the upload so we don't leak an orphaned file.
    await supabase.storage.from(DOCUMENT_BUCKET).remove([path])
    return { success: false, error: toFriendlyError(insertError) }
  }

  await logActivity({ action: 'create', entityType: 'document', description: `Uploaded document "${title}"` })

  revalidateDocumentPaths()
  return { success: true }
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { data: doc } = await supabase.from('documents').select('file_path, title').eq('id', id).single()

  const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) {
    console.error(error)
    return { success: false, error: toFriendlyError(error) }
  }

  if (doc?.file_path) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([doc.file_path])
  }

  await logActivity({
    action: 'delete',
    entityType: 'document',
    description: `Deleted document "${doc?.title ?? 'Untitled'}"`,
  })

  revalidateDocumentPaths()
  return { success: true }
}
