import PageHeader from '@/components/admin/PageHeader'
import StaffForm from '../StaffForm'

export default function NewStaffPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add staff" description="Invite a new staff member, teacher, or admin." />
      <div className="max-w-2xl rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
        <StaffForm mode="create" />
      </div>
    </div>
  )
}
