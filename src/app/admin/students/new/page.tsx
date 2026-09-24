import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import StudentForm from '../StudentForm'

export default async function NewStudentPage() {
  const supabase = await createClient()
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, level')
    .eq('status', 'active')
    .order('name')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add student" description="Create a new student record." />
      <div className="rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
        <StudentForm mode="create" classes={classes ?? []} />
      </div>
    </div>
  )
}
