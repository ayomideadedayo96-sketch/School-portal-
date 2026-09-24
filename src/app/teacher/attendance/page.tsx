import { getCurrentProfile } from '@/lib/auth/getProfile'
import AttendancePageContent from '@/components/attendance/AttendancePageContent'

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: { session?: string; term?: string; class?: string; date?: string }
}) {
  const { profile } = await getCurrentProfile()

  return <AttendancePageContent profile={profile!} basePath="/teacher/attendance" searchParams={searchParams} />
}
