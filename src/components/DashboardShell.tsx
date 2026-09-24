'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/types/database.types'
import LogoutButton from './LogoutButton'

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  staff: 'Staff',
}

const ROLE_NAV: Record<UserRole, { label: string; href: string }[]> = {
  admin: [{ label: 'Overview', href: '/admin' }],
  teacher: [
    { label: 'Overview', href: '/teacher' },
    { label: 'Attendance', href: '/teacher/attendance' },
    { label: 'Results', href: '/teacher/results' },
    { label: 'Timetable', href: '/teacher/timetable' },
    { label: 'Students', href: '/teacher/students' },
    { label: 'Announcements', href: '/teacher/announcements' },
    { label: 'Documents', href: '/teacher/documents' },
  ],
  staff: [
    { label: 'Overview', href: '/staff' },
    { label: 'Announcements', href: '/staff/announcements' },
    { label: 'Documents', href: '/staff/documents' },
  ],
}

export default function DashboardShell({
  role,
  fullName,
  children,
}: {
  role: UserRole
  fullName: string
  children: React.ReactNode
}) {
  const nav = ROLE_NAV[role]
  const pathname = usePathname()

  function isActive(href: string) {
    return href === `/${role}` ? pathname === href : pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-700 font-display text-sm font-semibold text-gold-200">
              SP
            </div>
            <div>
              <p className="font-display text-lg font-semibold leading-tight text-navy-800">
                School Portal
              </p>
              <p className="text-xs text-navy-400">{ROLE_LABEL[role]} workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-ink">{fullName}</p>
              <span className="inline-block rounded-full bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-600">
                {ROLE_LABEL[role]}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row">
        <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-48 md:flex-col md:overflow-visible">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition md:whitespace-normal ${
                isActive(item.href) ? 'bg-navy-700 text-white' : 'text-navy-600 hover:bg-navy-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
