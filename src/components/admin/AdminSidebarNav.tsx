'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: 'home' },
  { label: 'Students', href: '/admin/students', icon: 'students' },
  { label: 'Staff', href: '/admin/staff', icon: 'staff' },
  { label: 'Users', href: '/admin/users', icon: 'users' },
  { label: 'Classes', href: '/admin/classes', icon: 'classes' },
  { label: 'Subjects', href: '/admin/subjects', icon: 'subjects' },
  { label: 'Attendance', href: '/admin/attendance', icon: 'attendance' },
  { label: 'Results', href: '/admin/results', icon: 'results' },
  { label: 'Teacher Assignments', href: '/admin/teacher-assignments', icon: 'assignments' },
  { label: 'Timetable', href: '/admin/timetable', icon: 'timetable' },
  { label: 'Announcements', href: '/admin/announcements', icon: 'announcements' },
  { label: 'Documents', href: '/admin/documents', icon: 'documents' },
  { label: 'Activity Log', href: '/admin/activity', icon: 'activity' },
  { label: 'Settings', href: '/admin/settings', icon: 'settings' },
] as const

function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <path d="M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5" />,
    students: <path d="M12 3l9 4.5-9 4.5-9-4.5 9-4.5zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5" />,
    staff: <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
    classes: <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z" />,
    subjects: <path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />,
    assignments: <path d="M9 12l2 2 4-4M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />,
    attendance: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4" />,
    results: <path d="M9 17V9m4 8V5m4 12v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />,
    settings: (
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    ),
    timetable: <path d="M3 4.5h18M6 3v3m12-3v3M4.5 8h15M6.5 12h2m3 0h2m3 0h2M6.5 16h2m3 0h2m3 0h2M4.5 21h15a1 1 0 001-1V6.5a1 1 0 00-1-1h-15a1 1 0 00-1 1V20a1 1 0 001 1z" />,
    announcements: <path d="M10.5 8.5L3 11v2l7.5 2.5M10.5 8.5L20 4v16l-9.5-4.5M10.5 8.5v7M6 15.5V19a1 1 0 001 1h1.5" />,
    documents: <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-6-5z M14 3v5h5M9 13h6M9 17h6M9 9h1" />,
    users: <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M12.5 12.5l2 2 3.5-4" />,
    activity: <path d="M12 8v4l3 3M12 22a10 10 0 100-20 10 10 0 000 20z" />,
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export default function AdminSidebarNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  const linkList = (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive(item.href)
                ? 'bg-navy-700 text-white'
                : 'text-navy-600 hover:bg-navy-50 hover:text-navy-800'
            }`}
          >
            <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="-mx-4 sm:-mx-6 md:mx-0 md:w-56 md:shrink-0">
      {/* Mobile top bar toggle */}
      <div className="flex items-center justify-between border-b border-navy-100 bg-white px-4 py-3 sm:px-6 md:hidden">
        <span className="font-display text-sm font-semibold text-navy-800">Menu</span>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md border border-navy-200 p-1.5 text-navy-600"
          aria-label="Toggle navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-b border-navy-100 bg-white px-3 py-3 sm:px-5 md:hidden">{linkList}</div>
      )}

      <nav className="hidden md:block">{linkList}</nav>
    </div>
  )
}
