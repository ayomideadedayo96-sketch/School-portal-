import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import SelectFilter from '@/components/admin/SelectFilter'
import TimetableFilterBar from './TimetableFilterBar'
import TimetableManager from './TimetableManager'
import { toFriendlyError } from '@/lib/utils/errors'
import type { TimetableEntryWithDetails } from '@/types/database.types'

export default async function AdminTimetablePage({
  searchParams,
}: {
  searchParams: { session?: string; class?: string; teacher?: string; day?: string }
}) {
  const supabase = await createClient()

  const [{ data: classes }, { data: subjects }, { data: teachers }, { data: sessions }] = await Promise.all([
    supabase.from('classes').select('id, name').eq('status', 'active').order('name'),
    supabase.from('subjects').select('id, name').order('name'),
    supabase.from('profiles').select('id, full_name').eq('role', 'teacher').order('full_name'),
    supabase.from('academic_sessions').select('id, name, is_current').order('start_date', { ascending: false }),
  ])

  const currentSession = sessions?.find((s) => s.is_current)
  const sessionId = searchParams.session || currentSession?.id || ''

  let entries: TimetableEntryWithDetails[] = []
  let error: { message: string } | null = null

  // Only query once we actually have a session id — passing '' as a
  // uuid filter fails at the database with a syntax error rather than
  // just returning no rows, so this has to be skipped entirely rather
  // than filtered on.
  if (sessionId) {
    let query = supabase
      .from('timetable_entries')
      .select(
        'id, class_id, academic_session_id, day_of_week, period, subject_id, teacher_id, room, created_at, updated_at, class:classes(id, name), subject:subjects(id, name), teacher:profiles(id, full_name)'
      )
      .eq('academic_session_id', sessionId)

    if (searchParams.class) query = query.eq('class_id', searchParams.class)
    if (searchParams.teacher) query = query.eq('teacher_id', searchParams.teacher)
    if (searchParams.day) query = query.eq('day_of_week', searchParams.day)

    const result = await query.order('period')
    entries = (result.data ?? []) as unknown as TimetableEntryWithDetails[]
    error = result.error
    if (error) console.error(error)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Timetable" description="Build and manage the weekly class timetable." />

      <div className="flex flex-col gap-4 rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TimetableFilterBar classes={classes ?? []} teachers={teachers ?? []} />
          <SelectFilter
            paramName="session"
            options={(sessions ?? []).map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Current session"
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load the timetable: {toFriendlyError(error)}
        </p>
      ) : !sessionId ? (
        <p className="rounded-lg border border-navy-100 bg-white px-4 py-6 text-center text-sm text-navy-400 shadow-sm">
          Set a current academic session in Settings, or choose one above, to build a timetable.
        </p>
      ) : (
        <TimetableManager
          entries={(entries ?? []) as unknown as TimetableEntryWithDetails[]}
          classes={classes ?? []}
          subjects={subjects ?? []}
          teachers={teachers ?? []}
          sessions={sessions ?? []}
          defaultSessionId={sessionId}
        />
      )}
    </div>
  )
}
