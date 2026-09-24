import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { timeAgo, initials } from '@/lib/utils/format'
import type { ActivityLogWithActor } from '@/types/database.types'

async function getDashboardData() {
  const supabase = await createClient()

  const [
    studentsCount,
    staffCount,
    teachersCount,
    classesCount,
    currentSession,
    currentTerm,
    recentStudents,
    recentStaff,
    recentActivity,
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('staff').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('staff')
      .select('id, profiles!inner(role)', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('profiles.role', 'teacher'),
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('academic_sessions').select('name').eq('is_current', true).maybeSingle(),
    supabase.from('terms').select('name').eq('is_current', true).maybeSingle(),
    supabase
      .from('students')
      .select('id, first_name, last_name, full_name, admission_number, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('staff')
      .select('id, position, created_at, profiles(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('activity_log')
      .select('id, action, entity_type, entity_id, description, created_at, actor:profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return {
    studentsCount: studentsCount.count ?? 0,
    staffCount: staffCount.count ?? 0,
    teachersCount: teachersCount.count ?? 0,
    classesCount: classesCount.count ?? 0,
    currentSession: currentSession.data?.name ?? null,
    currentTerm: currentTerm.data?.name ?? null,
    recentStudents: recentStudents.data ?? [],
    recentStaff: (recentStaff.data ?? []) as any[],
    recentActivity: (recentActivity.data ?? []) as unknown as ActivityLogWithActor[],
  }
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData()

  const cards = [
    { label: 'Total Students', value: data.studentsCount, href: '/admin/students' },
    { label: 'Total Staff', value: data.staffCount, href: '/admin/staff' },
    { label: 'Total Teachers', value: data.teachersCount, href: '/admin/staff?role=teacher' },
    { label: 'Total Classes', value: data.classesCount, href: '/admin/classes' },
    { label: 'Current Session', value: data.currentSession ?? 'Not set', href: '/admin/settings' },
    { label: 'Current Term', value: data.currentTerm ?? 'Not set', href: '/admin/settings' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-800">Dashboard</h1>
        <p className="mt-1 text-sm text-navy-400">An overview of the school portal.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm transition hover:border-navy-200 hover:shadow-md"
          >
            <p className="text-sm font-medium text-navy-400">{card.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-navy-800">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-navy-100 bg-white shadow-sm lg:col-span-1">
          <div className="border-b border-navy-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-navy-800">Recently added students</h2>
          </div>
          {data.recentStudents.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No students yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {data.recentStudents.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-600">
                    {initials(s.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{s.full_name}</p>
                    <p className="text-xs text-navy-400">{s.admission_number}</p>
                  </div>
                  <span className="shrink-0 text-xs text-navy-400">{timeAgo(s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-navy-100 bg-white shadow-sm lg:col-span-1">
          <div className="border-b border-navy-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-navy-800">Recently added staff</h2>
          </div>
          {data.recentStaff.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No staff yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {data.recentStaff.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-600">
                    {initials(s.profiles?.full_name ?? '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{s.profiles?.full_name}</p>
                    <p className="text-xs text-navy-400">{s.position ?? s.profiles?.role}</p>
                  </div>
                  <span className="shrink-0 text-xs text-navy-400">{timeAgo(s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-navy-100 bg-white shadow-sm lg:col-span-1">
          <div className="border-b border-navy-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-navy-800">Recent activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {data.recentActivity.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="text-sm text-ink">{entry.description}</p>
                  <p className="mt-0.5 text-xs text-navy-400">
                    {entry.actor?.full_name ?? 'System'} · {timeAgo(entry.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
