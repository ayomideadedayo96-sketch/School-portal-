'use server'

import { toFriendlyError } from '@/lib/utils/errors'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminProfile } from '@/lib/auth/requireAdmin'
import { logActivity } from '@/lib/utils/activity'
import type { UserRole, StaffPermissionName } from '@/types/database.types'

interface ActionResult {
  success: boolean
  error?: string
  staffId?: string
}

async function getOrigin() {
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`
}

export async function createStaffAccount(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim() || null
  const role = String(formData.get('role') ?? 'staff') as UserRole
  const department = String(formData.get('department') ?? '').trim() || null
  const position = String(formData.get('position') ?? '').trim() || null

  if (!fullName || !email || !role) {
    return { success: false, error: 'Full name, email, and role are required.' }
  }

  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return {
      success: false,
      error: 'Server is not configured to create accounts (missing service role key). Contact your developer.',
    }
  }

  // Tracks how far we got, so that if anything throws unexpectedly we can
  // tell the admin honestly whether the invite email already went out —
  // instead of letting the exception escape and blank the whole page
  // while the invitee's email is already on its way.
  let step = 'starting'
  let inviteSent = false

  try {
    step = 'reading the site address'
    const origin = await getOrigin()

    step = 'sending the invite email'
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
      redirectTo: `${origin}/auth/callback?next=/update-password`,
    })

    if (inviteError || !invited?.user) {
      if (inviteError) console.error('invite failed:', inviteError)
      const raw = (inviteError?.message ?? '').toLowerCase()
      if (raw.includes('already been registered')) {
        return { success: false, error: 'A user with that email already exists.' }
      }
      if (raw.includes('rate limit')) {
        return {
          success: false,
          error:
            'The email service is limiting how many invites can be sent per hour. Please wait a while and try again.',
        }
      }
      return { success: false, error: 'Failed to send the invite. Please check the email address and try again.' }
    }
    inviteSent = true

    const supabase = await createClient()

    if (phone) {
      step = 'saving the phone number'
      await supabase.from('profiles').update({ phone }).eq('user_id', invited.user.id)
    }

    step = 'finding the new profile'
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', invited.user.id).single()

    if (!profile) {
      return {
        success: false,
        error:
          'The invite email was sent, but the profile record was not found. Open Users to check whether the account appears.',
      }
    }

    step = 'saving the staff record'
    const { data: staffRow, error: staffError } = await supabase
      .from('staff')
      .insert({
        profile_id: profile.id,
        staff_type: role === 'teacher' ? 'teaching' : 'non_teaching',
        department,
        position,
        status: 'active',
      })
      .select('id')
      .single()

    if (staffError || !staffRow) {
      console.error('staff insert failed:', staffError)
      return {
        success: false,
        error: 'The invite email was sent, but saving the staff record failed. Open Users to check the account.',
      }
    }

    step = 'recording the activity'
    await logActivity({
      action: 'create',
      entityType: 'staff',
      entityId: staffRow.id,
      description: `Invited ${fullName} as ${role}`,
    })

    revalidatePath('/admin/staff')
    revalidatePath('/admin/users')
    revalidatePath('/admin')

    return { success: true, staffId: staffRow.id }
  } catch (err) {
    console.error(`createStaffAccount failed while ${step}:`, err)
    return {
      success: false,
      error: inviteSent
        ? `The invite email was sent, but something went wrong afterwards (${step}). Open Users to check whether the account appears before inviting again.`
        : `Something went wrong while ${step}. Please try again.`,
    }
  }
}

export async function updateStaff(staffId: string, formData: FormData): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim() || null
  const role = String(formData.get('role') ?? '') as UserRole
  const department = String(formData.get('department') ?? '').trim() || null
  const position = String(formData.get('position') ?? '').trim() || null

  if (!fullName || !role) {
    return { success: false, error: 'Full name and role are required.' }
  }

  const supabase = await createClient()

  const { data: staffRow } = await supabase.from('staff').select('profile_id').eq('id', staffId).single()
  if (!staffRow) return { success: false, error: 'Staff record not found.' }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone, role })
    .eq('id', staffRow.profile_id)

  if (profileError) {

    console.error(profileError)
    return { success: false, error: toFriendlyError(profileError) }
  }

  const { error: staffError } = await supabase
    .from('staff')
    .update({
      department,
      position,
      staff_type: role === 'teacher' ? 'teaching' : 'non_teaching',
    })
    .eq('id', staffId)

  if (staffError) {

    console.error(staffError)
    return { success: false, error: toFriendlyError(staffError) }
  }

  await logActivity({
    action: 'update',
    entityType: 'staff',
    entityId: staffId,
    description: `Updated staff member ${fullName}`,
  })

  revalidatePath('/admin/staff')
  revalidatePath(`/admin/staff/${staffId}`)

  return { success: true, staffId }
}

export async function setStaffStatus(staffId: string, status: 'active' | 'inactive'): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { data: staffRow, error } = await supabase
    .from('staff')
    .update({ status })
    .eq('id', staffId)
    .select('profile_id, profiles(full_name)')
    .single()

  
  if (error) {

    console.error(error)

    return { success: false, error: toFriendlyError(error) }

  }

  await logActivity({
    action: status === 'inactive' ? 'deactivate' : 'activate',
    entityType: 'staff',
    entityId: staffId,
    description: `${status === 'inactive' ? 'Deactivated' : 'Activated'} staff member ${
      (staffRow as any).profiles?.full_name ?? ''
    }`,
  })

  revalidatePath('/admin/staff')
  revalidatePath(`/admin/staff/${staffId}`)
  revalidatePath('/admin')

  return { success: true }
}

export async function grantStaffPermission(profileId: string, permission: StaffPermissionName): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('staff_permissions')
    .insert({ profile_id: profileId, permission, granted_by: auth.profile.id })

  if (error) {
    const message = error.code === '23505' ? 'That permission has already been granted.' : toFriendlyError(error)
    return { success: false, error: message }
  }

  await logActivity({
    action: 'grant',
    entityType: 'staff_permission',
    description: `Granted ${permission.replace('_', ' ')} permission`,
  })

  revalidatePath('/admin/staff')
  return { success: true }
}

export async function revokeStaffPermission(profileId: string, permission: StaffPermissionName): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('staff_permissions')
    .delete()
    .eq('profile_id', profileId)
    .eq('permission', permission)

  
  if (error) {

    console.error(error)

    return { success: false, error: toFriendlyError(error) }

  }

  await logActivity({
    action: 'revoke',
    entityType: 'staff_permission',
    description: `Revoked ${permission.replace('_', ' ')} permission`,
  })

  revalidatePath('/admin/staff')
  return { success: true }
}
