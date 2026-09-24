'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { updateScoreSettings } from './actions'

export default function ScoreSettingsForm({ caMax, examMax }: { caMax: number; examMax: number }) {
  const router = useRouter()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      const result = await updateScoreSettings(formData)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      toast.success('Score settings updated.')
      router.refresh()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5" noValidate>
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-navy-700">CA maximum</label>
          <input
            type="number"
            name="ca_max"
            min={0}
            defaultValue={caMax}
            className="w-28 rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-navy-700">Exam maximum</label>
          <input
            type="number"
            name="exam_max"
            min={0}
            defaultValue={examMax}
            className="w-28 rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          {isPending && <Spinner className="h-3.5 w-3.5 text-white" />}
          Save
        </button>
      </div>
      <p className="text-xs text-navy-400">
        CA + Exam should typically add up to 100 so grade boundaries line up with the total score.
      </p>
    </form>
  )
}
