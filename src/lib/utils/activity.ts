import { createClient } from '@/lib/supabase/server'

/**
 * Records a row in activity_log for the dashboard's "Recent activity"
 * panel. actor_id defaults to the caller's own profile id at the
 * database level, so we don't need to pass it here. Failures are
 * swallowed — logging should never block the action that triggered it.
 */
export async function logActivity(params: {
  action: string
  entityType: string
  entityId?: string
  description: string
}) {
  try {
    const supabase = await createClient()
    await supabase.from('activity_log').insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      description: params.description,
    })
  } catch {
    // Non-critical — never let a logging failure surface to the user.
  }
}
