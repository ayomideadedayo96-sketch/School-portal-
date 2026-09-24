export default function StatusBadge({ status }: { status: string }) {
  const isPositive = status === 'active'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-navy-50 text-navy-500'
      }`}
    >
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  )
}
