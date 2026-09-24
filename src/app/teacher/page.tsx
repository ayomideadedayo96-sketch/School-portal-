import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth/getProfile'
import { createClient } from '@/lib/supabase/server'
import { getAvailableClasses } from '@/lib/data/scope'
import { getTodayDayName } from '@/lib/utils/schedule'
import { formatDateTime } from '@/lib/utils/format'
import { getDocumentUrls } from '@/lib/utils/documents'
import type { AnnouncementWithAuthor, SchoolDocumentWithDetails, TimetableEntryWithDetails } from '@/types/database.types'

async function getDashboardData(profileId: string) {
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('academic_sessions')
    .select('id, name, is_current')
    .order('start_date', { ascending: false })
  const sessionId = sessions?.find((s) => s.is_current)?.id ?? ''

  const [{ data: profile }, classes, { data: assignments }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).single(),
    getAvailableClasses({ id: profileId, role: 'teacher' } as any, sessionId),
    sessionId
      ? supabase
          .from('teacher_assignments')
          .select('subject:subjects(id, name), class:classes(id, name)')
          .eq('teacher_id', profileId)
          .eq('academic_session_id', sessionId)
      : Promise.resolve({ data: [] }),
  ])

  const subjectMap = new Map<string, { id: string; name: string }>()
  ;(assignments ?? []).forEach((a: any) => {
    if (a.subject) subjectMap.set(a.subject.id, a.subject)
  })
  const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  const today = new Date().toISOString().slice(0, 10)
  const todayName = getTodayDayName()
  const classIds = classes.map((c) => c.id)

  const [{ data: todaysTimetable }, { data: todaysAttendance }, { data: students }, { data: announcements }, { data: documents }] =
    await Promise.all([
      sessionId
        ? supabase
            .from('timetable_entries')
            .select(
              'id, class_id, academic_session_id, day_of_week, period, subject_id, teacher_id, room, created_at, updated_at, class:classes(id, name), subject:subjects(id, name), teacher:profiles(id, full_name)'
            )
            .eq('teacher_id', profileId)
            .eq('academic_session_id', sessionId)
            .eq('day_of_week', todayName)
            .order('period')
        : Promise.resolve({ data: [] }),
      classIds.length > 0
        ? supabase.from('attendance').select('student_id, class_id').eq('date', today).in('class_id', classIds)
        : Promise.resolve({ data: [] }),
      classIds.length > 0
        ? supabase.from('students').select('id, class_id').eq('status', 'active').in('class_id', classIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from('announcements')
        .select('id, title, body, audience, created_at, author:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('documents')
        .select('id, title, description, file_path, file_name, file_type, file_size, audience, created_at, class:classes(id, name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  const totalByClass = new Map<string, number>()
  ;(students ?? []).forEach((s) => totalByClass.set(s.class_id!, (totalByClass.get(s.class_id!) ?? 0) + 1))

  const markedByClass = new Map<string, number>()
  ;(todaysAttendance ?? []).forEach((a) => markedByClass.set(a.class_id, (markedByClass.get(a.class_id) ?? 0) + 1))

  const attendanceSummary = classes.map((c) => ({
    id: c.id,
    name: c.name,
    total: totalByClass.get(c.id) ?? 0,
    marked: markedByClass.get(c.id) ?? 0,
  }))

  const documentRows = (documents ?? []) as unknown as SchoolDocumentWithDetails[]
  const documentUrls = await getDocumentUrls(documentRows.map((d) => d.file_path))

  return {
    profile,
    classes,
    subjects,
    todaysTimetable: (todaysTimetable ?? []) as unknown as TimetableEntryWithDetails[],
    attendanceSummary,
    announcements: (announcements ?? []) as unknown as AnnouncementWithAuthor[],
    documents: documentRows,
    documentUrls,
    todayName,
  }
}

export default async function TeacherDashboardPage() {
  const { profile: sessionProfile } = await getCurrentProfile()
  if (!sessionProfile) return null

  const data = await getDashboardData(sessionProfile.id)
  const fullName = data.profile?.full_name ?? sessionProfile.full_name

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-800">Welcome, {fullName}</h1>
        <p className="mt-1 text-sm text-navy-400">
          Signed in as <span className="font-medium text-navy-600">Teacher</span> · {data.todayName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold text-navy-800">Assigned classes</h2>
          {data.classes.length === 0 ? (
            <p className="mt-2 text-sm text-navy-400">No classes assigned yet.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.classes.map((c) => (
                <li key={c.id} className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-600">
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold text-navy-800">Assigned subjects</h2>
          {data.subjects.length === 0 ? (
            <p className="mt-2 text-sm text-navy-400">No subjects assigned yet.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.subjects.map((s) => (
                <li key={s.id} className="rounded-full bg-gold-50 px-3 py-1 text-xs font-medium text-gold-600">
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-navy-800">Today&apos;s timetable</h2>
            <Link href="/teacher/timetable" className="text-xs font-medium text-navy-500 hover:text-navy-700">
              Full timetable →
            </Link>
          </div>
          {data.todaysTimetable.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No classes scheduled for today.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {data.todaysTimetable.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-600">
                    P{entry.period}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {entry.subject?.name} · {entry.class?.name}
                    </p>
                    <p className="text-xs text-navy-400">{entry.room ? `Room ${entry.room}` : 'No room set'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-navy-800">Today&apos;s attendance</h2>
            <Link href="/teacher/attendance" className="text-xs font-medium text-navy-500 hover:text-navy-700">
              Take attendance →
            </Link>
          </div>
          {data.attendanceSummary.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No classes assigned yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {data.attendanceSummary.map((c) => {
                const taken = c.total > 0 && c.marked >= c.total
                const started = c.marked > 0
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <p className="text-sm font-medium text-ink">{c.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-navy-400">
                        {c.marked}/{c.total} marked
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          taken
                            ? 'bg-green-50 text-green-700'
                            : started
                              ? 'bg-gold-50 text-gold-600'
                              : 'bg-navy-50 text-navy-500'
                        }`}
                      >
                        {taken ? 'Taken' : started ? 'In progress' : 'Not started'}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-navy-800">Recent announcements</h2>
            <Link href="/teacher/announcements" className="text-xs font-medium text-navy-500 hover:text-navy-700">
              View all →
            </Link>
          </div>
          {data.announcements.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {data.announcements.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <p className="truncate text-sm font-medium text-ink">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">{a.body}</p>
                  <p className="mt-1 text-xs text-navy-400">{formatDateTime(a.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-navy-800">Recent documents</h2>
            <Link href="/teacher/documents" className="text-xs font-medium text-navy-500 hover:text-navy-700">
              View all →
            </Link>
          </div>
          {data.documents.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No documents shared yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {data.documents.map((d) => {
                const viewUrl = data.documentUrls.get(d.file_path)?.viewUrl
                return (
                  <li key={d.id} className="px-5 py-3">
                    {viewUrl ? (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium text-navy-700 underline decoration-navy-200 underline-offset-2 hover:text-navy-900"
                      >
                        {d.title}
                      </a>
                    ) : (
                      <p className="truncate text-sm font-medium text-ink">{d.title}</p>
                    )}
                    <p className="mt-1 text-xs text-navy-400">
                      {d.class?.name ?? 'All classes'} · {formatDateTime(d.created_at)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
