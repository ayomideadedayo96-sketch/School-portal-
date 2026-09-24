import { createClient } from '@/lib/supabase/server'
import type { DocumentFileType } from '@/types/database.types'

export const DOCUMENT_BUCKET = 'school-documents'

// Kept in sync with the Storage bucket's own file_size_limit
// (supabase/migrations/0005_phase4b_documents_announcements.sql) so the
// UI/action can reject an oversized file before attempting the upload.
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024 // 10 MB

export const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png'

const DOCUMENT_TYPES: Record<string, DocumentFileType> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'docx',
  jpg: 'jpg',
  jpeg: 'jpeg',
  png: 'png',
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentFileType, string> = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOCX',
  jpg: 'JPG',
  jpeg: 'JPG',
  png: 'PNG',
}

/** Returns the normalized file type for an allowed extension, or null. */
export function inferDocumentType(fileName: string): DocumentFileType | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return DOCUMENT_TYPES[ext] ?? null
}

export interface DocumentUrls {
  viewUrl: string | null
  downloadUrl: string | null
}

/**
 * Resolves signed "view" (inline) and "download" (Content-Disposition:
 * attachment) URLs for a batch of document Storage paths, each valid for
 * 10 minutes.
 *
 * Callers must only pass paths belonging to `documents` rows the current
 * user is already allowed to see (e.g. rows returned by a query, which
 * RLS has already filtered) — Storage re-checks this independently via
 * the school_documents_select_matching_document policy, so an
 * unauthorized path simply fails to resolve rather than leaking a file.
 */
export async function getDocumentUrls(paths: string[]): Promise<Map<string, DocumentUrls>> {
  const map = new Map<string, DocumentUrls>()
  if (paths.length === 0) return map

  const supabase = await createClient()
  const [{ data: viewData }, { data: downloadData }] = await Promise.all([
    supabase.storage.from(DOCUMENT_BUCKET).createSignedUrls(paths, 60 * 10),
    supabase.storage.from(DOCUMENT_BUCKET).createSignedUrls(paths, 60 * 10, { download: true }),
  ])

  paths.forEach((path, i) => {
    map.set(path, {
      viewUrl: viewData?.[i]?.signedUrl ?? null,
      downloadUrl: downloadData?.[i]?.signedUrl ?? null,
    })
  })

  return map
}
