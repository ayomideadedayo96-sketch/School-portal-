import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/getProfile'
import AdminShell from '@/components/admin/AdminShell'
import ToastProvider from '@/components/toast/ToastProvider'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentProfile()

  if (!user) redirect('/login')
  if (profile?.role !== 'admin') redirect(profile ? `/${profile.role}` : '/unauthorized')

  return (
    <ToastProvider>
      <AdminShell fullName={profile.full_name}>{children}</AdminShell>
    </ToastProvider>
  )
}
