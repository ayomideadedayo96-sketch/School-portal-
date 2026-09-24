import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import StatusBadge from '@/components/admin/StatusBadge'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import Pagination from '@/components/admin/Pagination'
import ClassesFilterBar from './ClassesFilterBar'

const PAGE_SIZE = 20

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string }
}) {
  const supabase = await createClient()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('classes')
    .select(
      'id, name, level, status, session:academic_sessions(name), class_teacher:profiles(full_name), students:students(count)',
      { count: 'exact' }
    )

  if (searchParams.status === 'archived') {
    query = query.eq('status', 'archived')
  } else if (searchParams.status !== 'all') {
    query = query.eq('status', 'active')
  }
  if (searchParams.q) query = query.ilike('name', `%${searchParams.q}%`)

  const { data: classes, count, error } = await query.order('name').range(from, to)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Classes"
        description="Manage classes and class teachers."
        action={
          <Link
            href="/admin/classes/new"
            className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            Add class
          </Link>
        }
      />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 p-4">
          <ClassesFilterBar />
        </div>

        {error ? (
          <ErrorState />
        ) : !classes || classes.length === 0 ? (
          <EmptyState
            title="No classes found"
            description="Try adjusting your filters, or create a new class."
            action={
              <Link href="/admin/classes/new" className="text-sm font-medium text-navy-600 hover:text-navy-800">
                Add class →
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Class teacher</th>
                  <th className="px-4 py-3 font-medium">Students</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {classes.map((c: any) => (
                  <tr key={c.id} className="hover:bg-navy-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/classes/${c.id}`} className="font-medium text-ink hover:text-navy-700">
                        {c.name}
                      </Link>
                      {c.level && <span className="ml-2 text-xs text-navy-400">{c.level}</span>}
                    </td>
                    <td className="px-4 py-3 text-navy-500">{c.session?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-navy-500">{c.class_teacher?.full_name ?? 'Unassigned'}</td>
                    <td className="px-4 py-3 text-navy-500">{c.students?.[0]?.count ?? 0}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && classes && classes.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/classes" searchParams={searchParams} />
        )}
      </div>
    </div>
  )
}
