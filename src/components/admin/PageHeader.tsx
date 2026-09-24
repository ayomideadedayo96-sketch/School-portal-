export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-800">{title}</h1>
        {description && <p className="mt-1 text-sm text-navy-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}
