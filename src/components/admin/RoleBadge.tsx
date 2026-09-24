import type { UserRole } from '@/types/database.types'

const LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  teacher: 'Teacher',
  staff: 'Staff',
}

const CLASS: Record<UserRole, string> = {
  admin: 'bg-gold-50 text-gold-600',
  teacher: 'bg-navy-50 text-navy-600',
  staff: 'bg-navy-50 text-navy-500',
}

export default function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASS[role]}`}>
      {LABEL[role]}
    </span>
  )
}
