import { createClient } from '@/lib/supabase/server'

export const SCHOOL_ASSETS_BUCKET = 'school-assets'

/**
 * Resolves a stored logo_path to a public URL. The school-assets bucket
 * is public (see 0006_phase6_admin_controls.sql) since the logo needs to
 * render on the login page before a session exists — unlike
 * student-photos or school-documents, it isn't sensitive.
 */
export async function getLogoUrl(logoPath: string | null): Promise<string | null> {
  if (!logoPath) return null
  const supabase = await createClient()
  const { data } = supabase.storage.from(SCHOOL_ASSETS_BUCKET).getPublicUrl(logoPath)
  return data.publicUrl ?? null
}
