import { getCurrentProfile } from '@/lib/auth/getProfile'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import SelectFilter from '@/components/admin/SelectFilter'
import EmptyState from '@/components/admin/EmptyState'
import TimetableGrid from '@/components/timetable/TimetableGrid'
import { toFriendlyError } from '@/lib/utils/errors'
import { ALL_DAYS, PERIODS } from '@/lib/utils/schedule'
import type { TimetableEntryWithDetails } from '@/types/database.types'

export default async function TeacherTimetablePage({
  searchParams,
}: {
  searchParams: { session?: string }
}) {
  const { profile } = await getCurrentProfile()
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('academic_sessions')
    .select('id, name, is_current')
    .order('start_date', { ascending: false })

  const currentSession = sessions?.find((s) => s.is_current)
  const sessionId = searchParams.session || currentSession?.id || ''

  // RLS already limits results to entries relevant to this teacher
  // (their own periods, or classes they are the class teacher for).
  const { data: entries, error } = sessionId
    ? await supabase
        .from('timetable_entries')
        .select(
          'id, class_id, academic_session_id, day_of_week, period, subject_id, teacher_id, room, created_at, updated_at, class:classes(id, name), subject:subjects(id, name), teacher:profiles(id, full_name)'
        )
        .eq('academic_session_id', sessionId)
        .order('period')
    : { data: [], error: null }

  if (error) console.error(error)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Timetable" description={`Weekly schedule for ${profile?.full_name ?? 'you'}.`} />

      <div className="flex justify-end">
        <SelectFilter
          paramName="session"
          options={(sessions ?? []).map((s) => ({ value: s.id, label: s.name }))}
          placeholder="Current session"
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load your timetable: {toFriendlyError(error)}
        </p>
      ) : !entries || entries.length === 0 ? (
        <EmptyState
          title="No timetable entries yet"
          description="Your weekly schedule will appear here once an administrator builds the timetable."
        />
      ) : (
        <TimetableGrid
          entries={entries as unknown as TimetableEntryWithDetails[]}
          days={ALL_DAYS}
          periods={PERIODS}
          showClass
          showTeacher={false}
        />
      )}
    </div>
  )
}
