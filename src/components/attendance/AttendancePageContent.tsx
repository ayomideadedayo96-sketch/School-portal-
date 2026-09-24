import { createClient } from '@/lib/supabase/server'
import { getAvailableClasses } from '@/lib/data/scope'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import AttendanceFilterBar from './AttendanceFilterBar'
import AttendanceSheet from './AttendanceSheet'
import type { AttendanceStatus, Profile } from '@/types/database.types'

export default async function AttendancePageContent({
  profile,
  basePath,
  searchParams,
}: {
  profile: Profile
  basePath: string
  searchParams: { session?: string; term?: string; class?: string; date?: string }
}) {
  const supabase = await createClient()

  const [{ data: sessions }, { data: terms }] = await Promise.all([
    supabase.from('academic_sessions').select('id, name, is_current').order('start_date', { ascending: false }),
    supabase.from('terms').select('id, name, academic_session_id, is_current').order('start_date', { ascending: false }),
  ])

  const currentSession = sessions?.find((s) => s.is_current)
  const sessionId = searchParams.session || currentSession?.id || ''
  const classes = await getAvailableClasses(profile, sessionId)

  const currentTerm = terms?.find((t) => t.is_current && t.academic_session_id === sessionId)
  const termId = searchParams.term || currentTerm?.id || ''
  const date = searchParams.date || new Date().toISOString().slice(0, 10)
  const classId = searchParams.class || ''

  let sheet: React.ReactNode = null

  if (classId && sessionId && date) {
    const isAuthorized =
      profile.role === 'admin' || classes.some((c) => c.id === classId)

    if (!isAuthorized) {
      sheet = (
        <EmptyState title="Not authorized" description="You are not assigned to this class." />
      )
    } else {
      const [{ data: students }, { data: existingRecords }] = await Promise.all([
        supabase
          .from('students')
          .select('id, full_name, admission_number')
          .eq('class_id', classId)
          .eq('status', 'active')
          .order('first_name'),
        supabase.from('attendance').select('student_id, status').eq('class_id', classId).eq('date', date),
      ])

      const existing: Record<string, AttendanceStatus> = {}
      ;(existingRecords ?? []).forEach((r) => {
        existing[r.student_id] = r.status as AttendanceStatus
      })

      if (!students || students.length === 0) {
        sheet = (
          <EmptyState
            title="No students in this class"
            description="Add students to this class before recording attendance."
          />
        )
      } else {
        sheet = (
          <AttendanceSheet
            classId={classId}
            academicSessionId={sessionId}
            termId={termId || null}
            date={date}
            students={students}
            existing={existing}
            revalidatePathName={basePath}
          />
        )
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Attendance" description="Select a session, term, class, and date to take attendance." />

      <div className="rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
        <AttendanceFilterBar
          basePath={basePath}
          sessions={sessions ?? []}
          terms={terms ?? []}
          classes={classes}
        />
      </div>

      {sheet ?? (
        <EmptyState
          title="Select a class and date"
          description="Choose a session, term, class, and date above to view and record attendance."
        />
      )}
    </div>
  )
}
