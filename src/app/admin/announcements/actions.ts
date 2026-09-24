'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/auth/requireAdmin'
import { logActivity } from '@/lib/utils/activity'
import type { Audience } from '@/types/database.types'

interface ActionResult {
  success: boolean
  error?: string
}

const VALID_AUDIENCES: Audience[] = ['all', 'teachers', 'staff', 'class']

function revalidateAnnouncementPaths() {
  revalidatePath('/admin/announcements')
  revalidatePath('/teacher/announcements')
  revalidatePath('/teacher')
  revalidatePath('/staff/announcements')
  revalidatePath('/staff')
}

function readAnnouncementFields(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const audience = String(formData.get('audience') ?? 'all') as Audience
  const class_id = String(formData.get('class_id') ?? '').trim() || null

  // datetime-local inputs have no time zone attached; new Date() on the
  // browser-submitted string is interpreted in the server's local time.
  // For a single-school deployment (server and admins in the same time
  // zone) this matches what the admin picked.
  const publishRaw = String(formData.get('publish_at') ?? '').trim()
  const expiresRaw = String(formData.get('expires_at') ?? '').trim()

  return {
    title,
    body,
    audience,
    class_id: audience === 'class' ? class_id : null,
    publish_at: publishRaw ? new Date(publishRaw).toISOString() : new Date().toISOString(),
    expires_at: expiresRaw ? new Date(expiresRaw).toISOString() : null,
  }
}

function validateAnnouncementFields(fields: ReturnType<typeof readAnnouncementFields>): string | null {
  if (!fields.title || !fields.body) return 'Title and message are both required.'
  if (!VALID_AUDIENCES.includes(fields.audience)) return 'Invalid audience.'
  if (fields.audience === 'class' && !fields.class_id) {
    return 'Choose a class for the "Specific Class" audience.'
  }
  if (Number.isNaN(new Date(fields.publish_at).getTime())) return 'Invalid publish date.'
  if (fields.expires_at) {
    if (Number.isNaN(new Date(fields.expires_at).getTime())) return 'Invalid expiration date.'
    if (new Date(fields.expires_at) <= new Date(fields.publish_at)) {
      return 'Expiration date must be after the publish date.'
    }
  }
  return null
}

export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const fields = readAnnouncementFields(formData)
  const validationError = validateAnnouncementFields(fields)
  if (validationError) return { success: false, error: validationError }

  const supabase = await createClient()
  const { error } = await supabase.from('announcements').insert(fields)
  if (error) return { success: false, error: error.message }

  await logActivity({ action: 'create', entityType: 'announcement', description: `Posted announcement "${fields.title}"` })

  revalidateAnnouncementPaths()
  return { success: true }
}

export async function updateAnnouncement(id: string, formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const fields = readAnnouncementFields(formData)
  const validationError = validateAnnouncementFields(fields)
  if (validationError) return { success: false, error: validationError }

  const supabase = await createClient()
  const { error } = await supabase.from('announcements').update(fields).eq('id', id)
  if (error) return { success: false, error: error.message }

  await logActivity({ action: 'update', entityType: 'announcement', description: `Updated announcement "${fields.title}"` })

  revalidateAnnouncementPaths()
  return { success: true }
}

export async function setAnnouncementArchived(id: string, archived: boolean): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { data: announcement, error } = await supabase
    .from('announcements')
    .update({ is_archived: archived })
    .eq('id', id)
    .select('title')
    .single()

  if (error) return { success: false, error: error.message }

  await logActivity({
    action: archived ? 'archive' : 'restore',
    entityType: 'announcement',
    description: `${archived ? 'Archived' : 'Restored'} announcement "${announcement.title}"`,
  })

  revalidateAnnouncementPaths()
  return { success: true }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  await logActivity({ action: 'delete', entityType: 'announcement', description: 'Deleted an announcement' })

  revalidateAnnouncementPaths()
  return { success: true }
}
