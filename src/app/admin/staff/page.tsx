import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import StatusBadge from '@/components/admin/StatusBadge'
import RoleBadge from '@/components/admin/RoleBadge'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import Pagination from '@/components/admin/Pagination'
import StaffFilterBar from './StaffFilterBar'
import { initials } from '@/lib/utils/format'

const PAGE_SIZE = 20

export default async function StaffPage({
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
    .select('id, department, position, status, profile:profiles!inner(id, full_name, email, phone, role)', {
      count: 'exact',
    })

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

  const { data: staff, count, error } = await query.order('created_at', { ascending: false }).range(from, to)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Staff"
        description="Manage staff, teacher, and admin accounts."
        action={
          <Link
            href="/admin/staff/new"
            className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            Add staff
          </Link>
        }
      />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 p-4">
          <StaffFilterBar />
        </div>

        {error ? (
          <ErrorState />
        ) : !staff || staff.length === 0 ? (
          <EmptyState
            title="No staff found"
            description="Try adjusting your filters, or invite a new staff member."
            action={
              <Link href="/admin/staff/new" className="text-sm font-medium text-navy-600 hover:text-navy-800">
                Add staff →
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
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {staff.map((s: any) => (
                  <tr key={s.id} className="hover:bg-navy-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/staff/${s.id}`} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-600">
                          {initials(s.profile.full_name)}
                        </div>
                        <span className="font-medium text-ink hover:text-navy-700">{s.profile.full_name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-navy-500">{s.profile.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={s.profile.role} />
                    </td>
                    <td className="px-4 py-3 text-navy-500">{s.department ?? '—'}</td>
                    <td className="px-4 py-3 text-navy-500">{s.position ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && staff && staff.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/staff" searchParams={searchParams} />
        )}
      </div>
    </div>
  )
}
