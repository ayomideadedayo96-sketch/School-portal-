/**
 * Converts a raw Postgres/Supabase error into a short, user-safe message.
 * Never returns the original error's `.message` verbatim — that can leak
 * table names, column names, constraint names, or RLS policy internals
 * to the end user. The original error is still there for server-side
 * logging (console.error) if a caller wants it; this function only
 * controls what reaches the browser.
 */
export function toFriendlyError(error: unknown): string {
  const raw = (error as { message?: string; code?: string })?.message ?? String(error)
  const code = (error as { code?: string })?.code
  const lower = raw.toLowerCase()

  // Postgres unique_violation
  if (code === '23505' || lower.includes('duplicate key value')) {
    return 'That already exists — please use a different value.'
  }
  // Postgres foreign_key_violation
  if (code === '23503' || lower.includes('violates foreign key constraint')) {
    return 'This action can\u2019t be completed because it\u2019s linked to other records.'
  }
  // Postgres check_violation
  if (code === '23514' || lower.includes('violates check constraint')) {
    return 'One of the values entered isn\u2019t valid. Please review and try again.'
  }
  // RLS denial ("new row violates row-level security policy", or a raised
  // P0001 like prevent_role_self_escalation)
  if (code === '42501' || code === 'P0001' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'You don\u2019t have permission to do that.'
  }
  // Network / fetch failures (offline, DNS, Supabase unreachable)
  if (lower.includes('fetch failed') || lower.includes('network') || lower.includes('failed to fetch')) {
    return 'A network error occurred. Please check your connection and try again.'
  }
  // Auth-specific
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password.'
  }

  // Default: never surface the raw database message.
  return 'Something went wrong. Please try again, and contact support if this continues.'
}
