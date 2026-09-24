'use client'

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
    >
      Print
    </button>
  )
}
