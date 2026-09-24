export default function TeacherStudentsLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-32 rounded bg-navy-100/70" />
      <div className="h-16 rounded-lg border border-navy-100 bg-white shadow-sm" />
      <div className="h-64 rounded-lg border border-navy-100 bg-white shadow-sm" />
    </div>
  )
}
