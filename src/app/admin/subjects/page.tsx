import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import DebouncedSearchInput from '@/components/admin/DebouncedSearchInput'
import ConfirmActionButton from '@/components/admin/ConfirmActionButton'
import SubjectDialog from './SubjectDialog'
import { deleteSubject } from './actions'

export default async function SubjectsPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = await createClient()

  let query = supabase.from('subjects').select('*')
  if (searchParams.q) {
    query = query.or(`name.ilike.%${searchParams.q}%,code.ilike.%${searchParams.q}%`)
  }

  const { data: subjects, error } = await query.order('name')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subjects"
        description="Manage the subjects taught across the school."
        action={
          <SubjectDialog
            mode="create"
            trigger={
              <button className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800">
                Add subject
              </button>
            }
          />
        }
      />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 p-4 sm:w-64">
          <DebouncedSearchInput placeholder="Search subjects…" />
        </div>

        {error ? (
          <ErrorState />
        ) : !subjects || subjects.length === 0 ? (
          <EmptyState title="No subjects yet" description="Add your first subject to get started." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {subjects.map((s) => (
                <tr key={s.id} className="hover:bg-navy-50/50">
                  <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-navy-500">{s.code ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <SubjectDialog
                        mode="edit"
                        subject={s}
                        trigger={
                          <button className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
                            Edit
                          </button>
                        }
                      />
                      <ConfirmActionButton
                        label="Delete"
                        confirmTitle="Delete this subject?"
                        confirmMessage={`"${s.name}" will be removed. This can't be undone unless it's still assigned to a class or teacher, in which case the delete will be blocked.`}
                        confirmLabel="Delete"
                        variant="danger"
                        successMessage="Subject deleted."
                        action={() => deleteSubject(s.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
