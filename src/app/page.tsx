import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/getProfile'

export default async function HomePage() {
  const { user, profile } = await getCurrentProfile()

  if (!user) redirect('/login')

  if (profile?.role === 'admin') redirect('/admin')
  if (profile?.role === 'teacher') redirect('/teacher')
  if (profile?.role === 'staff') redirect('/staff')

  redirect('/unauthorized')
}
