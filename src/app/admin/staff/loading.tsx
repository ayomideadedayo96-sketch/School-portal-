import TableSkeleton from '@/components/admin/TableSkeleton'

export default function StaffLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-32 rounded bg-navy-100/70" />
      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 p-4">
          <div className="h-9 w-64 rounded bg-navy-100/60" />
        </div>
        <TableSkeleton />
      </div>
    </div>
  )
}
