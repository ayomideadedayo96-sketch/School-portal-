export default function TeacherDashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-56 rounded bg-navy-100/70" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-lg border border-navy-100 bg-white shadow-sm" />
        <div className="h-28 rounded-lg border border-navy-100 bg-white shadow-sm" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-56 rounded-lg border border-navy-100 bg-white shadow-sm" />
        <div className="h-56 rounded-lg border border-navy-100 bg-white shadow-sm" />
      </div>
    </div>
  )
}
