'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { createAcademicSession } from './actions'

const inputClass =
  'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500'

export default function AddSessionDialog() {
  const router = useRouter()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      const result = await createAcademicSession(formData)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      toast.success('Academic session created.')
      setOpen(false)
      formRef.current?.reset()
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
      >
        Add session
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-navy-800">Add academic session</h2>
            <form ref={formRef} onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Name</label>
                <input name="name" required placeholder="e.g. 2026/2027" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Start date</label>
                <input type="date" name="start_date" required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">End date</label>
                <input type="date" name="end_date" required className={inputClass} />
              </div>
              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-md bg-navy-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
                >
                  {isPending && <Spinner className="h-3.5 w-3.5 text-white" />}
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
