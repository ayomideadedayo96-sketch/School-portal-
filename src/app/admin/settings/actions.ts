'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/auth/requireAdmin'
import { logActivity } from '@/lib/utils/activity'
import { SCHOOL_ASSETS_BUCKET } from '@/lib/utils/schoolAssets'

interface ActionResult {
  success: boolean
  error?: string
}

const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2 MB, matches the bucket's own limit
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']

export async function saveSchoolProfile(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const school_name = String(formData.get('school_name') ?? '').trim() || null
  const address = String(formData.get('address') ?? '').trim() || null
  const phone = String(formData.get('phone') ?? '').trim() || null
  const email = String(formData.get('email') ?? '').trim() || null
  const website = String(formData.get('website') ?? '').trim() || null
  const logo = formData.get('logo')

  const supabase = await createClient()

  let logo_path: string | undefined
  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_LOGO_TYPES.includes(logo.type)) {
      return { success: false, error: 'Logo must be a PNG, JPG, SVG, or WEBP image.' }
    }
    if (logo.size > MAX_LOGO_SIZE) {
      return { success: false, error: 'Logo must be smaller than 2MB.' }
    }

    const ext = logo.name.split('.').pop()?.toLowerCase() ?? 'png'
    const path = `logo-${randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(SCHOOL_ASSETS_BUCKET)
      .upload(path, logo, { upsert: false, contentType: logo.type })

    if (uploadError) {
      return { success: false, error: 'Failed to upload the logo. Please try again.' }
    }

    // Fetch the previous logo so we can clean it up after the new one
    // is safely saved — never delete before the replacement succeeds.
    const { data: existing } = await supabase.from('school_settings').select('logo_path').eq('id', 1).single()
    logo_path = path

    if (existing?.logo_path) {
      await supabase.storage.from(SCHOOL_ASSETS_BUCKET).remove([existing.logo_path])
    }
  }

  const { error } = await supabase
    .from('school_settings')
    .update({
      school_name,
      address,
      phone,
      email,
      website,
      ...(logo_path ? { logo_path } : {}),
      updated_by: auth.profile.id,
    })
    .eq('id', 1)

  if (error) return { success: false, error: error.message }

  await logActivity({
    action: 'update',
    entityType: 'school_settings',
    description: 'Updated the school profile',
  })

  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function createAcademicSession(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const name = String(formData.get('name') ?? '').trim()
  const start_date = String(formData.get('start_date') ?? '')
  const end_date = String(formData.get('end_date') ?? '')

  if (!name || !start_date || !end_date) {
    return { success: false, error: 'Name, start date, and end date are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('academic_sessions').insert({ name, start_date, end_date })

  if (error) {
    const message = error.code === '23505' ? 'A session with that name already exists.' : error.message
    return { success: false, error: message }
  }

  await logActivity({ action: 'create', entityType: 'academic_session', description: `Created academic session ${name}` })
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function setCurrentSession(sessionId: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  await supabase.from('academic_sessions').update({ is_current: false }).eq('is_current', true)
  const { error } = await supabase.from('academic_sessions').update({ is_current: true }).eq('id', sessionId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/settings')
  revalidatePath('/admin')
  return { success: true }
}

export async function createTerm(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const academic_session_id = String(formData.get('academic_session_id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const start_date = String(formData.get('start_date') ?? '')
  const end_date = String(formData.get('end_date') ?? '')

  if (!academic_session_id || !name || !start_date || !end_date) {
    return { success: false, error: 'Session, name, start date, and end date are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('terms').insert({ academic_session_id, name, start_date, end_date })

  if (error) {
    const message = error.code === '23505' ? 'A term with that name already exists for this session.' : error.message
    return { success: false, error: message }
  }

  await logActivity({ action: 'create', entityType: 'term', description: `Created term ${name}` })
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function setCurrentTerm(termId: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  await supabase.from('terms').update({ is_current: false }).eq('is_current', true)
  const { error } = await supabase.from('terms').update({ is_current: true }).eq('id', termId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/settings')
  revalidatePath('/admin')
  return { success: true }
}

export async function updateScoreSettings(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const ca_max = Number(formData.get('ca_max'))
  const exam_max = Number(formData.get('exam_max'))

  if (!Number.isFinite(ca_max) || !Number.isFinite(exam_max) || ca_max < 0 || exam_max < 0) {
    return { success: false, error: 'CA max and Exam max must be positive numbers.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('score_settings').update({ ca_max, exam_max }).eq('id', 1)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function createGradeBoundary(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const grade = String(formData.get('grade') ?? '').trim()
  const min_score = Number(formData.get('min_score'))
  const max_score = Number(formData.get('max_score'))
  const remark = String(formData.get('remark') ?? '').trim() || null

  if (!grade || !Number.isFinite(min_score) || !Number.isFinite(max_score)) {
    return { success: false, error: 'Grade, minimum score, and maximum score are required.' }
  }
  if (min_score > max_score) {
    return { success: false, error: 'Minimum score cannot be greater than maximum score.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('grade_boundaries').insert({ grade, min_score, max_score, remark })

  if (error) {
    const message = error.code === '23505' ? 'That grade already exists.' : error.message
    return { success: false, error: message }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function updateGradeBoundary(id: string, formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const grade = String(formData.get('grade') ?? '').trim()
  const min_score = Number(formData.get('min_score'))
  const max_score = Number(formData.get('max_score'))
  const remark = String(formData.get('remark') ?? '').trim() || null

  if (!grade || !Number.isFinite(min_score) || !Number.isFinite(max_score)) {
    return { success: false, error: 'Grade, minimum score, and maximum score are required.' }
  }
  if (min_score > max_score) {
    return { success: false, error: 'Minimum score cannot be greater than maximum score.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('grade_boundaries')
    .update({ grade, min_score, max_score, remark })
    .eq('id', id)

  if (error) {
    const message = error.code === '23505' ? 'That grade already exists.' : error.message
    return { success: false, error: message }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function deleteGradeBoundary(id: string): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase.from('grade_boundaries').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}
