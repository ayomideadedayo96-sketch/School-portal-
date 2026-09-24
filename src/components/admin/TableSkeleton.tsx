export default function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse divide-y divide-navy-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="h-3.5 flex-1 rounded bg-navy-100/70" />
          ))}
        </div>
      ))}
    </div>
  )
}
