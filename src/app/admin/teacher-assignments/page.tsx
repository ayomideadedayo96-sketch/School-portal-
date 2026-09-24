import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import Pagination from '@/components/admin/Pagination'
import ConfirmActionButton from '@/components/admin/ConfirmActionButton'
import AssignmentDialog from './AssignmentDialog'
import AssignmentsFilterBar from './AssignmentsFilterBar'
import { deleteTeacherAssignment } from './actions'

const PAGE_SIZE = 20

export default async function TeacherAssignmentsPage({
  searchParams,
}: {
  searchParams: { teacher?: string; subject?: string; class?: string; page?: string }
}) {
  const supabase = await createClient()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [{ data: teachers }, { data: subjects }, { data: classes }, { data: sessions }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('role', 'teacher').order('full_name'),
    supabase.from('subjects').select('id, name').order('name'),
    supabase.from('classes').select('id, name').eq('status', 'active').order('name'),
    supabase.from('academic_sessions').select('id, name, is_current').order('start_date', { ascending: false }),
  ])

  const currentSession = sessions?.find((s) => s.is_current)

  let query = supabase
    .from('teacher_assignments')
    .select(
      'id, teacher:profiles(id, full_name), subject:subjects(id, name), class:classes(id, name), session:academic_sessions(name)',
      { count: 'exact' }
    )

  if (searchParams.teacher) query = query.eq('teacher_id', searchParams.teacher)
  if (searchParams.subject) query = query.eq('subject_id', searchParams.subject)
  if (searchParams.class) query = query.eq('class_id', searchParams.class)

  const { data: assignments, count, error } = await query.order('created_at', { ascending: false }).range(from, to)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teacher Assignments"
        description="Assign teachers to the classes and subjects they teach."
        action={
          <AssignmentDialog
            teachers={teachers ?? []}
            subjects={subjects ?? []}
            classes={classes ?? []}
            sessions={sessions ?? []}
            defaultSessionId={currentSession?.id}
          />
        }
      />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 p-4">
          <AssignmentsFilterBar teachers={teachers ?? []} subjects={subjects ?? []} classes={classes ?? []} />
        </div>

        {error ? (
          <ErrorState />
        ) : !assignments || assignments.length === 0 ? (
          <EmptyState
            title="No assignments yet"
            description="Assign a teacher to a subject and class to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Teacher</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {assignments.map((a: any) => (
                  <tr key={a.id} className="hover:bg-navy-50/50">
                    <td className="px-4 py-3 font-medium text-ink">{a.teacher?.full_name}</td>
                    <td className="px-4 py-3 text-navy-500">{a.subject?.name}</td>
                    <td className="px-4 py-3 text-navy-500">{a.class?.name}</td>
                    <td className="px-4 py-3 text-navy-500">{a.session?.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <ConfirmActionButton
                          label="Remove"
                          confirmTitle="Remove this assignment?"
                          confirmMessage={`${a.teacher?.full_name} will no longer be assigned to teach ${a.subject?.name} in ${a.class?.name}.`}
                          confirmLabel="Remove"
                          variant="danger"
                          successMessage="Assignment removed."
                          action={() => deleteTeacherAssignment(a.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && assignments && assignments.length > 0 && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={count ?? 0}
            basePath="/admin/teacher-assignments"
            searchParams={searchParams}
          />
        )}
      </div>
    </div>
  )
}
