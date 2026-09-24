import LogoutButton from '@/components/LogoutButton'
import AdminSidebarNav from './AdminSidebarNav'

export default function AdminShell({
  fullName,
  children,
}: {
  fullName: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-700 font-display text-sm font-semibold text-gold-200">
              SP
            </div>
            <div>
              <p className="font-display text-lg font-semibold leading-tight text-navy-800">
                School Portal
              </p>
              <p className="text-xs text-navy-400">Administration</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-ink">{fullName}</p>
              <span className="inline-block rounded-full bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-600">
                Administrator
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:gap-8 md:py-8">
        <AdminSidebarNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
