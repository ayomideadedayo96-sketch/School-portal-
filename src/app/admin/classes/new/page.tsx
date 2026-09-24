import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import ClassForm from '../ClassForm'

export default async function NewClassPage() {
  const supabase = await createClient()

  const [{ data: sessions }, { data: teachers }] = await Promise.all([
    supabase.from('academic_sessions').select('id, name').order('start_date', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'teacher')
      .order('full_name'),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add class" description="Create a new class for the current or another session." />
      <div className="max-w-2xl rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
        <ClassForm mode="create" sessions={sessions ?? []} teachers={teachers ?? []} />
      </div>
    </div>
  )
}
