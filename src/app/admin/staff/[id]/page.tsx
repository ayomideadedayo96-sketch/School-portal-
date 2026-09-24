import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import StatusBadge from '@/components/admin/StatusBadge'
import RoleBadge from '@/components/admin/RoleBadge'
import ConfirmActionButton from '@/components/admin/ConfirmActionButton'
import { formatDate, initials } from '@/lib/utils/format'
import { setStaffStatus } from '../actions'
import PermissionToggle from '../PermissionToggle'

export default async function StaffProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: staff } = await supabase
    .from('staff')
    .select('*, profile:profiles(*)')
    .eq('id', params.id)
    .single()

  if (!staff) notFound()

  const { data: permissions } = await supabase
    .from('staff_permissions')
    .select('permission')
    .eq('profile_id', staff.profile.id)

  const grantedPermissions = new Set((permissions ?? []).map((p) => p.permission))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={staff.profile.full_name}
        description={staff.profile.email}
        action={
          <div className="flex gap-3">
            <Link
              href={`/admin/staff/${staff.id}/edit`}
              className="rounded-md border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
            >
              Edit
            </Link>
            {staff.status === 'active' ? (
              <ConfirmActionButton
                label="Deactivate"
                confirmTitle="Deactivate this staff member?"
                confirmMessage="They will keep their login but should be considered inactive for school records. You can reactivate them at any time."
                confirmLabel="Deactivate"
                variant="danger"
                successMessage="Staff member deactivated."
                action={() => setStaffStatus(staff.id, 'inactive')}
              />
            ) : (
              <ConfirmActionButton
                label="Activate"
                confirmTitle="Activate this staff member?"
                confirmMessage="This will mark them as active again."
                confirmLabel="Activate"
                successMessage="Staff member activated."
                action={() => setStaffStatus(staff.id, 'active')}
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-navy-100 bg-navy-50 font-display text-xl text-navy-400">
            {initials(staff.profile.full_name)}
          </div>
          <RoleBadge role={staff.profile.role} />
          <StatusBadge status={staff.status} />
        </div>

        <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 p-6 sm:grid-cols-2">
            <Detail label="Full name" value={staff.profile.full_name} />
            <Detail label="Email" value={staff.profile.email} />
            <Detail label="Phone" value={staff.profile.phone} />
            <Detail label="Role" value={staff.profile.role} className="capitalize" />
            <Detail label="Department" value={staff.department} />
            <Detail label="Position" value={staff.position} />
            <Detail label="Joined portal" value={formatDate(staff.created_at)} />
          </dl>
        </div>
      </div>

      {staff.profile.role === 'staff' && (
        <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
          <div className="border-b border-navy-100 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-navy-800">Permissions</h2>
            <p className="mt-0.5 text-sm text-navy-400">
              Staff cannot modify results unless explicitly granted permission here.
            </p>
          </div>
          <div className="divide-y divide-navy-100 px-6">
            <PermissionToggle
              profileId={staff.profile.id}
              permission="manage_results"
              label="Manage results"
              description="Allows entering and editing student results."
              granted={grantedPermissions.has('manage_results')}
            />
          </div>
        </div>
      )}
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
