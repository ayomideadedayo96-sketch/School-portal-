import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth/getProfile'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/utils/format'
import { getDocumentUrls } from '@/lib/utils/documents'
import type { AnnouncementWithAuthor, SchoolDocumentWithDetails } from '@/types/database.types'

export default async function StaffDashboardPage() {
  const { profile } = await getCurrentProfile()
  if (!profile) return null

  const supabase = await createClient()
  // RLS already scopes both queries to "All Staff"/"Staff" audiences and,
  // for announcements, to ones that are currently published and active.
  const [{ data: announcements }, { data: documents }] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, title, body, audience, publish_at, author:profiles(full_name)')
      .order('publish_at', { ascending: false })
      .limit(5),
    supabase
      .from('documents')
      .select('id, title, description, file_path, file_name, file_type, file_size, audience, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const announcementRows = (announcements as unknown as AnnouncementWithAuthor[]) ?? []
  const documentRows = (documents as unknown as SchoolDocumentWithDetails[]) ?? []
  const documentUrls = await getDocumentUrls(documentRows.map((d) => d.file_path))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-800">
          Welcome, {profile.full_name}
        </h1>
        <p className="mt-1 text-sm text-navy-400">
          Signed in as <span className="font-medium text-navy-600">Staff</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-navy-800">Recent announcements</h2>
            <Link href="/staff/announcements" className="text-xs font-medium text-navy-500 hover:text-navy-700">
              View all →
            </Link>
          </div>
          {announcementRows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {announcementRows.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <p className="truncate text-sm font-medium text-ink">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">{a.body}</p>
                  <p className="mt-1 text-xs text-navy-400">{formatDateTime(a.publish_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-navy-800">Recent documents</h2>
            <Link href="/staff/documents" className="text-xs font-medium text-navy-500 hover:text-navy-700">
              View all →
            </Link>
          </div>
          {documentRows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No documents shared yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {documentRows.map((d) => {
                const viewUrl = documentUrls.get(d.file_path)?.viewUrl
                return (
                  <li key={d.id} className="px-5 py-3">
                    {viewUrl ? (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium text-navy-700 underline decoration-navy-200 underline-offset-2 hover:text-navy-900"
                      >
                        {d.title}
                      </a>
                    ) : (
                      <p className="truncate text-sm font-medium text-ink">{d.title}</p>
                    )}
                    <p className="mt-1 text-xs text-navy-400">{formatDateTime(d.created_at)}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
