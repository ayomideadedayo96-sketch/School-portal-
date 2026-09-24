import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/getProfile'
import DashboardShell from '@/components/DashboardShell'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentProfile()

  if (!user) redirect('/login')
  if (profile?.role !== 'teacher') redirect(profile ? `/${profile.role}` : '/unauthorized')

  return (
    <DashboardShell role="teacher" fullName={profile.full_name}>
      {children}
    </DashboardShell>
  )
}
