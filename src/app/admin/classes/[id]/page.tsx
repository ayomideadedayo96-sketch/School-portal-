import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import StatusBadge from '@/components/admin/StatusBadge'
import ConfirmActionButton from '@/components/admin/ConfirmActionButton'
import { initials } from '@/lib/utils/format'
import { setClassStatus } from '../actions'
import ClassSubjectsManager from '../ClassSubjectsManager'

export default async function ClassProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: cls } = await supabase
    .from('classes')
    .select('*, session:academic_sessions(id, name), class_teacher:profiles(id, full_name)')
    .eq('id', params.id)
    .single()

  if (!cls) notFound()

  const [{ data: students }, { data: allSubjects }, { data: classSubjects }] = await Promise.all([
    supabase
      .from('students')
      .select('id, full_name, admission_number')
      .eq('class_id', cls.id)
      .eq('status', 'active')
      .order('first_name')
      .limit(8),
    supabase.from('subjects').select('id, name').order('name'),
    supabase.from('class_subjects').select('id, subject_id, subjects(name)').eq('class_id', cls.id),
  ])

  const assignedSubjects = (classSubjects ?? []).map((cs: any) => ({
    classSubjectId: cs.id,
    subjectId: cs.subject_id,
    name: cs.subjects?.name ?? 'Unknown subject',
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={cls.name}
        description={cls.session?.name}
        action={
          <div className="flex gap-3">
            <Link
              href={`/admin/classes/${cls.id}/edit`}
              className="rounded-md border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
            >
              Edit
            </Link>
            {cls.status === 'active' ? (
              <ConfirmActionButton
                label="Archive"
                confirmTitle="Archive this class?"
                confirmMessage="Archived classes are hidden from the active list. Students already assigned keep their class link."
                confirmLabel="Archive"
                variant="danger"
                successMessage="Class archived."
                action={() => setClassStatus(cls.id, 'archived')}
              />
            ) : (
              <ConfirmActionButton
                label="Restore"
                confirmTitle="Restore this class?"
                confirmMessage="This will mark the class as active again."
                confirmLabel="Restore"
                successMessage="Class restored."
                action={() => setClassStatus(cls.id, 'active')}
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-navy-100 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="font-display text-base font-semibold text-navy-800">Details</h2>
          <dl className="mt-4 flex flex-col gap-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Level</dt>
              <dd className="mt-1 text-sm text-ink">{cls.level || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Class teacher</dt>
              <dd className="mt-1 text-sm text-ink">{cls.class_teacher?.full_name ?? 'Unassigned'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={cls.status} />
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-navy-100 bg-white p-6 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-navy-800">Students</h2>
            <Link
              href={`/admin/students?class=${cls.id}`}
              className="text-xs font-medium text-navy-500 hover:text-navy-700"
            >
              View all →
            </Link>
          </div>
          {!students || students.length === 0 ? (
            <p className="mt-4 text-sm text-navy-400">No students in this class yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {students.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/students/${s.id}`} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-600">
                      {initials(s.full_name)}
                    </div>
                    <span className="text-sm text-ink hover:text-navy-700">{s.full_name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-navy-100 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="font-display text-base font-semibold text-navy-800">Subjects offered</h2>
          <div className="mt-4">
            <ClassSubjectsManager
              classId={cls.id}
              academicSessionId={cls.academic_session_id}
              assigned={assignedSubjects}
              available={allSubjects ?? []}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
