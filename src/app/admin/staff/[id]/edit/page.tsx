import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import StaffForm from '../../StaffForm'

export default async function EditStaffPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: staff } = await supabase
    .from('staff')
    .select('*, profile:profiles(*)')
    .eq('id', params.id)
    .single()

  if (!staff) notFound()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Edit ${staff.profile.full_name}`} description={staff.profile.email} />
      <div className="max-w-2xl rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
        <StaffForm mode="edit" staff={staff as any} />
      </div>
    </div>
  )
}
