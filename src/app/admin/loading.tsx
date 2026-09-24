export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div>
        <div className="h-7 w-40 rounded bg-navy-100/70" />
        <div className="mt-2 h-4 w-64 rounded bg-navy-100/50" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
            <div className="h-3 w-24 rounded bg-navy-100/70" />
            <div className="mt-3 h-6 w-16 rounded bg-navy-100/70" />
          </div>
        ))}
      </div>
    </div>
  )
}
