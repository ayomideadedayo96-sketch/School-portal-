'use server'

import { toFriendlyError } from '@/lib/utils/errors'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/auth/requireAdmin'
import { logActivity } from '@/lib/utils/activity'
import type { UserRole } from '@/types/database.types'

interface ActionResult {
  success: boolean
  error?: string
}

const VALID_ROLES: UserRole[] = ['admin', 'teacher', 'staff']

/**
 * Changes a user's role from the Users & Access page. This is the
 * standalone "just the role" control — full profile/employment edits
 * still go through /admin/staff/[id]/edit's updateStaff action.
 *
 * Two layers of self-escalation protection apply here:
 *  1. This action refuses to let an admin change their OWN role, so an
 *     admin can never accidentally lock themselves out of /admin.
 *  2. Even if that check were bypassed, the database trigger
 *     prevent_role_self_escalation (0001_initial_schema.sql) rejects
 *     any role change made by a caller whose own role isn't already
 *     'admin' — the real, non-bypassable enforcement boundary.
 */
export async function changeUserRole(profileId: string, newRole: UserRole): Promise<ActionResult> {
  const auth = await requireAdminProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  if (!VALID_ROLES.includes(newRole)) {
    return { success: false, error: 'Invalid role.' }
  }

  if (profileId === auth.profile.id) {
    return { success: false, error: 'You cannot change your own role. Ask another administrator to do this.' }
  }

  const supabase = await createClient()

  const { data: target } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', profileId)
    .single()

  if (!target) return { success: false, error: 'User not found.' }
  if (target.role === newRole) return { success: true }

  const previousRole = target.role

  const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId)
    if (error) {
    console.error(error)
    return { success: false, error: toFriendlyError(error) }
  }

  // Keep staff.staff_type consistent with the new role for scheduling
  // purposes (teaching vs non-teaching), same convention updateStaff uses.
  await supabase
    .from('staff')
    .update({ staff_type: newRole === 'teacher' ? 'teaching' : 'non_teaching' })
    .eq('profile_id', profileId)

  await logActivity({
    action: 'role_change',
    entityType: 'user',
    entityId: profileId,
    description: `Changed ${target.full_name}'s role from ${previousRole} to ${newRole}`,
  })

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${profileId}`)
  revalidatePath('/admin/staff')
  revalidatePath('/admin')

  return { success: true }
}
