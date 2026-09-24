import { getCurrentProfile } from '@/lib/auth/getProfile'
import AttendancePageContent from '@/components/attendance/AttendancePageContent'

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: { session?: string; term?: string; class?: string; date?: string }
}) {
  const { profile } = await getCurrentProfile()

  return <AttendancePageContent profile={profile!} basePath="/admin/attendance" searchParams={searchParams} />
}
