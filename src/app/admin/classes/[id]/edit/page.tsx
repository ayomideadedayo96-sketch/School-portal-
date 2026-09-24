import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import ClassForm from '../../ClassForm'

export default async function EditClassPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: cls }, { data: sessions }, { data: teachers }] = await Promise.all([
    supabase.from('classes').select('*').eq('id', params.id).single(),
    supabase.from('academic_sessions').select('id, name').order('start_date', { ascending: false }),
    supabase.from('profiles').select('id, full_name').eq('role', 'teacher').order('full_name'),
  ])

  if (!cls) notFound()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Edit ${cls.name}`} />
      <div className="max-w-2xl rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
        <ClassForm mode="edit" cls={cls} sessions={sessions ?? []} teachers={teachers ?? []} />
      </div>
    </div>
  )
}
