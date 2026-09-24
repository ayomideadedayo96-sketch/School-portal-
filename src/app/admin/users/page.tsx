import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import StatusBadge from '@/components/admin/StatusBadge'
import RoleBadge from '@/components/admin/RoleBadge'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import Pagination from '@/components/admin/Pagination'
import UsersFilterBar from './UsersFilterBar'
import { initials, timeAgo } from '@/lib/utils/format'
import { getLastLoginMap } from '@/lib/utils/lastLogin'

const PAGE_SIZE = 20

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; status?: string; page?: string }
}) {
  const supabase = await createClient()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('staff')
    .select(
      'id, status, profile:profiles!inner(id, user_id, full_name, email, role)',
      { count: 'exact' }
    )

  if (searchParams.status === 'inactive') {
    query = query.eq('status', 'inactive')
  } else if (searchParams.status !== 'all') {
    query = query.eq('status', 'active')
  }
  if (searchParams.role) query = query.eq('profile.role', searchParams.role)
  if (searchParams.q) {
    query = query.or(`full_name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%`, {
      foreignTable: 'profile',
    })
  }

  const [{ data: users, count, error }, lastLoginMap] = await Promise.all([
    query.order('created_at', { ascending: false }).range(from, to),
    getLastLoginMap(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Manage accounts, roles, and access across the portal."
        action={
          <Link
            href="/admin/staff/new"
            className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            Invite user
          </Link>
        }
      />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 p-4">
          <UsersFilterBar />
        </div>

        {error ? (
          <ErrorState />
        ) : !users || users.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try adjusting your filters, or invite a new user."
            action={
              <Link href="/admin/staff/new" className="text-sm font-medium text-navy-600 hover:text-navy-800">
                Invite user →
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {users.map((u: any) => {
                  const lastLogin = lastLoginMap.get(u.profile.user_id)
                  return (
                    <tr key={u.id} className="hover:bg-navy-50/50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-600">
                            {initials(u.profile.full_name)}
                          </div>
                          <span className="font-medium text-ink hover:text-navy-700">{u.profile.full_name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-navy-500">{u.profile.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.profile.role} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="px-4 py-3 text-navy-500">
                        {lastLogin === undefined ? '—' : lastLogin ? timeAgo(lastLogin) : 'Never signed in'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!error && users && users.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/users" searchParams={searchParams} />
        )}
      </div>
    </div>
  )
}
