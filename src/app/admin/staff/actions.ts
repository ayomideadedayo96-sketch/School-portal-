'use server'

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

  const origin = await getOrigin()

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  })

  if (inviteError || !invited.user) {
    const message = inviteError?.message.toLowerCase().includes('already been registered')
      ? 'A user with that email already exists.'
      : inviteError?.message ?? 'Failed to invite the new user.'
    return { success: false, error: message }
  }

  const supabase = await createClient()

  if (phone) {
    await supabase.from('profiles').update({ phone }).eq('user_id', invited.user.id)
  }

  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', invited.user.id).single()

  if (!profile) {
    return { success: false, error: 'Account was created, but the profile record was not found. Please retry.' }
  }

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

  if (staffError) {
    return { success: false, error: staffError.message }
  }

  await logActivity({
    action: 'create',
    entityType: 'staff',
    entityId: staffRow.id,
    description: `Invited ${fullName} as ${role}`,
  })

  revalidatePath('/admin/staff')
  revalidatePath('/admin')

  return { success: true, staffId: staffRow.id }
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
    return { success: false, error: profileError.message }
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
    return { success: false, error: staffError.message }
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

  if (error) return { success: false, error: error.message }

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
    const message = error.code === '23505' ? 'That permission has already been granted.' : error.message
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

  if (error) return { success: false, error: error.message }

  await logActivity({
    action: 'revoke',
    entityType: 'staff_permission',
    description: `Revoked ${permission.replace('_', ' ')} permission`,
  })

  revalidatePath('/admin/staff')
  return { success: true }
}
