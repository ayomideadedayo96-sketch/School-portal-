'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'

export default function SetCurrentButton({
  action,
  label = 'Set as current',
}: {
  action: () => Promise<{ success: boolean; error?: string }>
  label?: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const toast = useToast()

  function handleClick() {
    startTransition(async () => {
      const result = await action()
      if (result.success) {
        toast.success('Updated.')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Something went wrong.')
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 rounded-md border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-60"
    >
      {isPending && <Spinner className="h-3 w-3" />}
      {label}
    </button>
  )
}
