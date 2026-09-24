import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import { formatDateTime } from '@/lib/utils/format'
import type { AnnouncementWithAuthor } from '@/types/database.types'

export default async function TeacherAnnouncementsPage() {
  const supabase = await createClient()
  // RLS restricts results to active announcements addressed to this
  // teacher's audience (published, not expired, not archived).
  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('id, title, body, audience, publish_at, class:classes(id, name), author:profiles(full_name)')
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{a.title}</p>
                  {a.class && (
                    <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-600">
                      {a.class.name}
                    </span>
                  )}
                </div>
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
