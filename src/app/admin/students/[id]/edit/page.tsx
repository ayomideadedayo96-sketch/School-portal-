import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentPhotoUrl } from '@/lib/utils/photo'
import PageHeader from '@/components/admin/PageHeader'
import StudentForm from '../../StudentForm'

export default async function EditStudentPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: student }, { data: classes }] = await Promise.all([
    supabase.from('students').select('*').eq('id', params.id).single(),
    supabase.from('classes').select('id, name, level').eq('status', 'active').order('name'),
  ])

  if (!student) notFound()

  const photoUrl = await getStudentPhotoUrl(student.photo_url)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Edit ${student.full_name}`} description={`Student ID: ${student.admission_number}`} />
      <div className="rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
        <StudentForm mode="edit" classes={classes ?? []} student={student} photoUrl={photoUrl} />
      </div>
    </div>
  )
}
