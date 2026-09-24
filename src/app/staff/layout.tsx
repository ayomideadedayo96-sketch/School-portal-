import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/getProfile'
import DashboardShell from '@/components/DashboardShell'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentProfile()

  if (!user) redirect('/login')
  if (profile?.role !== 'staff') redirect(profile ? `/${profile.role}` : '/unauthorized')

  return (
    <DashboardShell role="staff" fullName={profile.full_name}>
      {children}
    </DashboardShell>
  )
}
