import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import Pagination from '@/components/admin/Pagination'
import { formatDateTime } from '@/lib/utils/format'
import ActivityFilterBar from './ActivityFilterBar'

const PAGE_SIZE = 30

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  archive: 'Archived',
  activate: 'Activated',
  deactivate: 'Deactivated',
  grant: 'Granted',
  revoke: 'Revoked',
  role_change: 'Role changed',
}

const ACTION_STYLE: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700',
  update: 'bg-navy-50 text-navy-600',
  delete: 'bg-red-50 text-red-600',
  archive: 'bg-navy-50 text-navy-500',
  activate: 'bg-emerald-50 text-emerald-700',
  deactivate: 'bg-navy-50 text-navy-500',
  grant: 'bg-gold-50 text-gold-600',
  revoke: 'bg-navy-50 text-navy-500',
  role_change: 'bg-gold-50 text-gold-600',
}

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: { entity?: string; action?: string; page?: string }
}) {
  const supabase = await createClient()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('activity_log')
    .select('id, action, entity_type, entity_id, description, created_at, actor:profiles(full_name)', {
      count: 'exact',
    })

  if (searchParams.entity) query = query.eq('entity_type', searchParams.entity)
  if (searchParams.action) query = query.eq('action', searchParams.action)

  const { data: entries, count, error } = await query.order('created_at', { ascending: false }).range(from, to)

  // Only used to populate the "Entity" filter's options — admins should
  // see every entity type that has ever been logged, not just the ones
  // on the current page.
  const { data: entityRows } = await supabase.from('activity_log').select('entity_type')
  const entityTypes = Array.from(new Set((entityRows ?? []).map((r) => r.entity_type))).sort()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Activity Log"
        description="An audit trail of important actions taken across the portal. Visible to administrators only."
      />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 p-4">
          <ActivityFilterBar entityTypes={entityTypes} />
        </div>

        {error ? (
          <ErrorState />
        ) : !entries || entries.length === 0 ? (
          <EmptyState title="No activity recorded" description="Actions taken across the portal will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Resource</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {entries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-navy-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-navy-500">{formatDateTime(e.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-ink">{e.actor?.full_name ?? 'System'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ACTION_STYLE[e.action] ?? 'bg-navy-50 text-navy-600'
                        }`}
                      >
                        {ACTION_LABELS[e.action] ?? e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-navy-500">
                      <span className="capitalize">{e.entity_type.replace(/_/g, ' ')}</span>
                      {e.entity_id && (
                        <span className="ml-1.5 font-mono text-xs text-navy-300">
                          #{String(e.entity_id).slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-navy-600">{e.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && entries && entries.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/activity" searchParams={searchParams} />
        )}
      </div>
    </div>
  )
}
