'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'

interface ActionResult {
  success: boolean
  error?: string
}

export default function ConfirmActionButton({
  label,
  confirmTitle,
  confirmMessage,
  confirmLabel = 'Confirm',
  variant = 'default',
  action,
  successMessage,
  className,
}: {
  label: string
  confirmTitle: string
  confirmMessage: string
  confirmLabel?: string
  variant?: 'default' | 'danger'
  action: () => Promise<ActionResult>
  successMessage: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const toast = useToast()

  function handleConfirm() {
    startTransition(async () => {
      const result = await action()
      setOpen(false)
      if (result.success) {
        toast.success(successMessage)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          `rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            variant === 'danger'
              ? 'border-red-200 text-red-600 hover:bg-red-50'
              : 'border-navy-200 text-navy-700 hover:bg-navy-50'
          }`
        }
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-navy-800">{confirmTitle}</h2>
            <p className="mt-2 text-sm text-navy-500">{confirmMessage}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-navy-700 hover:bg-navy-800'
                }`}
              >
                {isPending && <Spinner className="h-3.5 w-3.5 text-white" />}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
