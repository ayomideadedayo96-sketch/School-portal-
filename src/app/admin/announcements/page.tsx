import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import ConfirmActionButton from '@/components/admin/ConfirmActionButton'
import Pagination from '@/components/admin/Pagination'
import { formatDateTime } from '@/lib/utils/format'
import { AUDIENCE_LABELS, type Audience, type AnnouncementWithAuthor } from '@/types/database.types'
import AnnouncementDialog from './AnnouncementDialog'
import { deleteAnnouncement, setAnnouncementArchived } from './actions'

const PAGE_SIZE = 20

type AnnouncementStatus = 'scheduled' | 'active' | 'expired' | 'archived'

function getStatus(a: AnnouncementWithAuthor): AnnouncementStatus {
  if (a.is_archived) return 'archived'
  const now = Date.now()
  if (new Date(a.publish_at).getTime() > now) return 'scheduled'
  if (a.expires_at && new Date(a.expires_at).getTime() <= now) return 'expired'
  return 'active'
}

const STATUS_STYLE: Record<AnnouncementStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  scheduled: 'bg-gold-50 text-gold-600',
  expired: 'bg-navy-100 text-navy-500',
  archived: 'bg-red-50 text-red-600',
}

const STATUS_LABEL: Record<AnnouncementStatus, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  expired: 'Expired',
  archived: 'Archived',
}

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const supabase = await createClient()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [{ data: announcements, count, error }, { data: classes }] = await Promise.all([
    supabase
      .from('announcements')
      .select(
        'id, title, body, audience, class_id, publish_at, expires_at, is_archived, created_at, updated_at, created_by, class:classes(id, name), author:profiles(full_name)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase.from('classes').select('id, name').eq('status', 'active').order('name'),
  ])

  const classOptions = classes ?? []
  const rows = (announcements as unknown as AnnouncementWithAuthor[]) ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Announcements"
        description="Post updates for teachers and staff to see on their dashboards."
        action={<AnnouncementDialog classes={classOptions} />}
      />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        {error ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState title="No announcements yet" description="Post your first announcement to get started." />
        ) : (
          <ul className="divide-y divide-navy-100">
            {rows.map((a) => {
              const status = getStatus(a)
              return (
                <li key={a.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{a.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                      <span className="rounded-full bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-600">
                        {AUDIENCE_LABELS[a.audience as Audience]}
                      </span>
                      {a.class && (
                        <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-600">
                          {a.class.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-navy-500">{a.body}</p>
                    <p className="mt-2 text-xs text-navy-400">
                      {a.author?.full_name ?? 'Admin'} · Publishes {formatDateTime(a.publish_at)}
                      {a.expires_at ? ` · Expires ${formatDateTime(a.expires_at)}` : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <AnnouncementDialog
                      mode="edit"
                      announcement={a}
                      classes={classOptions}
                      trigger={
                        <button className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
                          Edit
                        </button>
                      }
                    />
                    <ConfirmActionButton
                      label={a.is_archived ? 'Restore' : 'Archive'}
                      confirmTitle={a.is_archived ? 'Restore this announcement?' : 'Archive this announcement?'}
                      confirmMessage={
                        a.is_archived
                          ? `"${a.title}" will become visible to its audience again (subject to its publish/expiry dates).`
                          : `"${a.title}" will be hidden from its audience until restored.`
                      }
                      confirmLabel={a.is_archived ? 'Restore' : 'Archive'}
                      successMessage={a.is_archived ? 'Announcement restored.' : 'Announcement archived.'}
                      action={() => setAnnouncementArchived(a.id, !a.is_archived)}
                    />
                    <ConfirmActionButton
                      label="Delete"
                      confirmTitle="Delete this announcement?"
                      confirmMessage={`"${a.title}" will no longer be visible to anyone.`}
                      confirmLabel="Delete"
                      variant="danger"
                      successMessage="Announcement deleted."
                      action={() => deleteAnnouncement(a.id)}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {!error && rows.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/announcements" searchParams={searchParams} />
        )}
      </div>
    </div>
  )
}
