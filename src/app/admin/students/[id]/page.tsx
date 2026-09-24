import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentPhotoUrl } from '@/lib/utils/photo'
import PageHeader from '@/components/admin/PageHeader'
import StatusBadge from '@/components/admin/StatusBadge'
import ConfirmActionButton from '@/components/admin/ConfirmActionButton'
import { formatDate, initials } from '@/lib/utils/format'
import { setStudentStatus } from '../actions'

export default async function StudentProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('*, class:classes(id, name, level)')
    .eq('id', params.id)
    .single()

  if (!student) notFound()

  const photoUrl = await getStudentPhotoUrl(student.photo_url)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={student.full_name}
        description={`Student ID: ${student.admission_number}`}
        action={
          <div className="flex gap-3">
            <Link
              href={`/admin/results/report/${student.id}`}
              className="rounded-md border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
            >
              Report card
            </Link>
            <Link
              href={`/admin/students/${student.id}/edit`}
              className="rounded-md border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
            >
              Edit
            </Link>
            {student.status === 'active' ? (
              <ConfirmActionButton
                label="Archive"
                confirmTitle="Archive this student?"
                confirmMessage="Archived students are hidden from the active roster but their record is kept. You can restore them later."
                confirmLabel="Archive"
                variant="danger"
                successMessage="Student archived."
                action={() => setStudentStatus(student.id, 'archived')}
              />
            ) : (
              <ConfirmActionButton
                label="Restore"
                confirmTitle="Restore this student?"
                confirmMessage="This will mark the student as active again."
                confirmLabel="Restore"
                successMessage="Student restored."
                action={() => setStudentStatus(student.id, 'active')}
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
          <div className="h-28 w-28 overflow-hidden rounded-full border border-navy-100 bg-navy-50">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={student.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-2xl text-navy-300">
                {initials(student.full_name)}
              </div>
            )}
          </div>
          <StatusBadge status={student.status} />
        </div>

        <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 p-6 sm:grid-cols-2">
            <Detail label="First name" value={student.first_name} />
            <Detail label="Middle name" value={student.middle_name} />
            <Detail label="Last name" value={student.last_name} />
            <Detail label="Date of birth" value={formatDate(student.date_of_birth)} />
            <Detail label="Gender" value={student.gender} className="capitalize" />
            <Detail label="Class" value={student.class?.name} />
            <Detail label="Guardian name" value={student.guardian_name} />
            <Detail label="Guardian phone" value={student.guardian_phone} />
            <Detail label="Admission date" value={formatDate(student.admission_date)} />
            <div className="sm:col-span-2">
              <Detail label="Address" value={student.address} />
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className={`mt-1 text-sm text-ink ${className ?? ''}`}>{value || '—'}</dd>
    </div>
  )
}
