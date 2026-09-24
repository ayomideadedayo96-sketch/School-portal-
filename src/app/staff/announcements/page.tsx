import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import { formatDateTime } from '@/lib/utils/format'
import type { AnnouncementWithAuthor } from '@/types/database.types'

export default async function StaffAnnouncementsPage() {
  const supabase = await createClient()
  // RLS restricts results to active announcements addressed to "All
  // Staff" or "Staff" (published, not expired, not archived).
  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('id, title, body, audience, publish_at, author:profiles(full_name)')
    .order('publish_at', { ascending: false })

  const rows = (announcements as unknown as AnnouncementWithAuthor[]) ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Announcements" description="Updates shared by the school administration." />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        {error ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState title="No announcements yet" description="Check back later for updates." />
        ) : (
          <ul className="divide-y divide-navy-100">
            {rows.map((a) => (
              <li key={a.id} className="px-5 py-4">
                <p className="font-medium text-ink">{a.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-navy-500">{a.body}</p>
                <p className="mt-2 text-xs text-navy-400">
                  {a.author?.full_name ?? 'Admin'} · {formatDateTime(a.publish_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
