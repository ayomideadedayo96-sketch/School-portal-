import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/getProfile'
import { getAvailableClasses } from '@/lib/data/scope'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import SelectFilter from '@/components/admin/SelectFilter'
import { initials } from '@/lib/utils/format'

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: { session?: string; class?: string }
}) {
  const { profile } = await getCurrentProfile()
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('academic_sessions')
    .select('id, name, is_current')
    .order('start_date', { ascending: false })

  const currentSession = sessions?.find((s) => s.is_current)
  const sessionId = searchParams.session || currentSession?.id || ''

  const classes = await getAvailableClasses(profile!, sessionId)
  const classId = searchParams.class || classes[0]?.id || ''

  const { data: students } =
    classId && classes.some((c) => c.id === classId)
      ? await supabase
          .from('students')
          .select('id, full_name, admission_number, gender, guardian_name, guardian_phone')
          .eq('class_id', classId)
          .eq('status', 'active')
          .order('first_name')
      : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Students" description="Students in the classes you teach." />

      {classes.length === 0 ? (
        <EmptyState
          title="No assigned classes"
          description="You'll see your students here once you're assigned to a class."
        />
      ) : (
        <>
          <div className="rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
            <SelectFilter paramName="class" options={classes.map((c) => ({ value: c.id, label: c.name }))} placeholder="Choose a class" />
          </div>

          <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
            {!students || students.length === 0 ? (
              <EmptyState title="No students in this class" description="This class has no active students yet." />
            ) : (
              <ul className="divide-y divide-navy-100">
                {students.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-600">
                      {initials(s.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{s.full_name}</p>
                      <p className="text-xs text-navy-400">
                        {s.admission_number}
                        {s.gender ? ` · ${s.gender}` : ''}
                      </p>
                    </div>
                    {s.guardian_name && (
                      <div className="hidden text-right text-xs text-navy-400 sm:block">
                        <p>{s.guardian_name}</p>
                        {s.guardian_phone && <p>{s.guardian_phone}</p>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
