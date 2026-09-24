import { createClient } from '@/lib/supabase/server'

/**
 * student-photos is a private bucket, so display URLs must be signed.
 * Returns null if there is no photo or the signed URL request fails.
 */
export async function getStudentPhotoUrl(photoPath: string | null): Promise<string | null> {
  if (!photoPath) return null
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('student-photos')
    .createSignedUrl(photoPath, 60 * 60)
  if (error || !data) return null
  return data.signedUrl
}
