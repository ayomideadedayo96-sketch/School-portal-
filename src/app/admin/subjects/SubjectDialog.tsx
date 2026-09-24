'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { createSubject, updateSubject } from './actions'
import type { Subject } from '@/types/database.types'

export default function SubjectDialog({
  mode,
  subject,
  trigger,
}: {
  mode: 'create' | 'edit'
  subject?: Subject
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(subject?.name ?? '')
  const [code, setCode] = useState(subject?.code ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = mode === 'create' ? await createSubject(name, code) : await updateSubject(subject!.id, name, code)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      toast.success(mode === 'create' ? 'Subject added.' : 'Subject updated.')
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
              {mode === 'create' ? 'Add subject' : 'Edit subject'}
            </h2>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">
                  Subject name <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MTH101"
                  className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                />
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
