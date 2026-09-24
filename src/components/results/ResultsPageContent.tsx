import { createClient } from '@/lib/supabase/server'
import { getAvailableClasses, getAvailableSubjectsForClass } from '@/lib/data/scope'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import ResultsFilterBar from './ResultsFilterBar'
import ResultsSheet from './ResultsSheet'
import type { Profile } from '@/types/database.types'

export default async function ResultsPageContent({
  profile,
  basePath,
  searchParams,
}: {
  profile: Profile
  basePath: string
  searchParams: { session?: string; term?: string; class?: string; subject?: string }
}) {
  const supabase = await createClient()

  const [{ data: sessions }, { data: terms }, { data: scoreSettings }, { data: boundaries }] = await Promise.all([
    supabase.from('academic_sessions').select('id, name, is_current').order('start_date', { ascending: false }),
    supabase.from('terms').select('id, name, academic_session_id, is_current').order('start_date', { ascending: false }),
    supabase.from('score_settings').select('*').eq('id', 1).single(),
    supabase.from('grade_boundaries').select('*').order('min_score', { ascending: false }),
  ])

  const currentSession = sessions?.find((s) => s.is_current)
  const sessionId = searchParams.session || currentSession?.id || ''
  const classes = await getAvailableClasses(profile, sessionId)

  const currentTerm = terms?.find((t) => t.is_current && t.academic_session_id === sessionId)
  const termId = searchParams.term || currentTerm?.id || ''
  const classId = searchParams.class || ''
  const subjectId = searchParams.subject || ''

  const subjects =
    classId && sessionId ? await getAvailableSubjectsForClass(profile, classId, sessionId) : []

  let sheet: React.ReactNode = null

  if (classId && subjectId && sessionId && termId) {
    const isAuthorized = profile.role === 'admin' || subjects.some((s) => s.id === subjectId)

    if (!isAuthorized) {
      sheet = <EmptyState title="Not authorized" description="You are not assigned to teach this subject in this class." />
    } else {
      const [{ data: students }, { data: existingResults }] = await Promise.all([
        supabase
          .from('students')
          .select('id, full_name, admission_number')
          .eq('class_id', classId)
          .eq('status', 'active')
          .order('first_name'),
        supabase
          .from('results')
          .select('student_id, ca_score, exam_score, remark')
          .eq('class_id', classId)
          .eq('subject_id', subjectId)
          .eq('academic_session_id', sessionId)
          .eq('term_id', termId),
      ])

      const existing: Record<string, { ca_score: number; exam_score: number; remark: string | null }> = {}
      ;(existingResults ?? []).forEach((r) => {
        existing[r.student_id] = { ca_score: r.ca_score, exam_score: r.exam_score, remark: r.remark }
      })

      if (!students || students.length === 0) {
        sheet = (
          <EmptyState
            title="No students in this class"
            description="Add students to this class before entering results."
          />
        )
      } else {
        sheet = (
          <ResultsSheet
            classId={classId}
            subjectId={subjectId}
            academicSessionId={sessionId}
            termId={termId}
            students={students}
            existing={existing}
            caMax={scoreSettings?.ca_max ?? 40}
            examMax={scoreSettings?.exam_max ?? 60}
            boundaries={boundaries ?? []}
            revalidatePathName={basePath}
          />
        )
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Results" description="Select a session, term, class, and subject to enter results." />

      <div className="rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
        <ResultsFilterBar sessions={sessions ?? []} terms={terms ?? []} classes={classes} subjects={subjects} />
      </div>

      {sheet ?? (
        <EmptyState
          title="Select a class and subject"
          description="Choose a session, term, class, and subject above to view and enter results."
        />
      )}
    </div>
  )
}
