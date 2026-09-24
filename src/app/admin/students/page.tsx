import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import StatusBadge from '@/components/admin/StatusBadge'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import Pagination from '@/components/admin/Pagination'
import StudentsFilterBar from './StudentsFilterBar'
import { formatDate, initials } from '@/lib/utils/format'

const PAGE_SIZE = 20

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; class?: string; gender?: string; status?: string; page?: string }
}) {
  const supabase = await createClient()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: classOptions } = await supabase
    .from('classes')
    .select('id, name')
    .eq('status', 'active')
    .order('name')

  let query = supabase
    .from('students')
    .select('id, admission_number, first_name, last_name, full_name, gender, status, admission_date, class:classes(id, name)', {
      count: 'exact',
    })

  if (searchParams.status === 'archived') {
    query = query.eq('status', 'archived')
  } else if (searchParams.status !== 'all') {
    query = query.eq('status', 'active')
  }

  if (searchParams.class) query = query.eq('class_id', searchParams.class)
  if (searchParams.gender) query = query.eq('gender', searchParams.gender)
  if (searchParams.q) {
    query = query.or(`full_name.ilike.%${searchParams.q}%,admission_number.ilike.%${searchParams.q}%`)
  }

  const { data: students, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Students"
        description="Manage student records and enrollment."
        action={
          <Link
            href="/admin/students/new"
            className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            Add student
          </Link>
        }
      />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 p-4">
          <StudentsFilterBar
            classOptions={(classOptions ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        {error ? (
          <ErrorState />
        ) : !students || students.length === 0 ? (
          <EmptyState
            title="No students found"
            description="Try adjusting your filters, or add a new student to get started."
            action={
              <Link href="/admin/students/new" className="text-sm font-medium text-navy-600 hover:text-navy-800">
                Add student →
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Student ID</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Gender</th>
                  <th className="px-4 py-3 font-medium">Admitted</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-navy-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/students/${s.id}`} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-600">
                          {initials(s.full_name)}
                        </div>
                        <span className="font-medium text-ink hover:text-navy-700">{s.full_name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-navy-500">{s.admission_number}</td>
                    <td className="px-4 py-3 text-navy-500">{s.class?.name ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-navy-500">{s.gender ?? '—'}</td>
                    <td className="px-4 py-3 text-navy-500">{formatDate(s.admission_date)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && students && students.length > 0 && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={count ?? 0}
            basePath="/admin/students"
            searchParams={searchParams}
          />
        )}
      </div>
    </div>
  )
}
