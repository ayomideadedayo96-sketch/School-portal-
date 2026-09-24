export default function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <div
      role="status"
      className="rounded-md border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-navy-700"
    >
      {message}
    </div>
  )
}
