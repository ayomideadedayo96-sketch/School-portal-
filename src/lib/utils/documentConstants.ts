// Pure, client-safe constants for the document upload UI. Deliberately
// has zero imports — DocumentDialog.tsx (a Client Component) needs these,
// and must not import them via lib/utils/documents.ts, since that file
// also imports the server-only Supabase client (which uses next/headers).
// A Client Component importing anything from that module — even just a
// constant — pulls next/headers into the client bundle and fails the
// production build with "next/headers ... only allowed in Server
// Components". Keeping these here breaks that chain at its root.

export const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png'

// Kept in sync with the school-documents Storage bucket's own
// file_size_limit (supabase/migrations/0005_phase4b_documents_announcements.sql)
// so the UI/action can reject an oversized file before attempting the upload.
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024 // 10 MB
