'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { createGradeBoundary, updateGradeBoundary } from './actions'
import type { GradeBoundary } from '@/types/database.types'

const inputClass =
  'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500'

export default function GradeBoundaryDialog({
  mode,
  boundary,
  trigger,
}: {
  mode: 'create' | 'edit'
  boundary?: GradeBoundary
  trigger: React.ReactNode
}) {
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
      const result =
        mode === 'create' ? await createGradeBoundary(formData) : await updateGradeBoundary(boundary!.id, formData)

      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      toast.success(mode === 'create' ? 'Grade boundary added.' : 'Grade boundary updated.')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-navy-800">
              {mode === 'create' ? 'Add grade boundary' : 'Edit grade boundary'}
            </h2>

            <form ref={formRef} onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Grade</label>
                <input name="grade" required defaultValue={boundary?.grade} placeholder="e.g. A" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-700">Min score</label>
                  <input
                    type="number"
                    name="min_score"
                    required
                    min={0}
                    max={100}
                    defaultValue={boundary?.min_score}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-700">Max score</label>
                  <input
                    type="number"
                    name="max_score"
                    required
                    min={0}
                    max={100}
                    defaultValue={boundary?.max_score}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Remark</label>
                <input name="remark" defaultValue={boundary?.remark ?? ''} placeholder="e.g. Excellent" className={inputClass} />
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
                  {mode === 'create' ? 'Add' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
