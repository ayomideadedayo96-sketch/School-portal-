'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { toDatetimeLocalValue } from '@/lib/utils/format'
import { AUDIENCE_LABELS, type Audience, type Announcement } from '@/types/database.types'
import { createAnnouncement, updateAnnouncement } from './actions'

const inputClass =
  'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500'

export default function AnnouncementDialog({
  mode = 'create',
  announcement,
  classes,
  trigger,
}: {
  mode?: 'create' | 'edit'
  announcement?: Announcement
  classes: { id: string; name: string }[]
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audience, setAudience] = useState<Audience>(announcement?.audience ?? 'all')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      const result =
        mode === 'create' ? await createAnnouncement(formData) : await updateAnnouncement(announcement!.id, formData)

      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      toast.success(mode === 'create' ? 'Announcement posted.' : 'Announcement updated.')
      setOpen(false)
      if (mode === 'create') formRef.current?.reset()
      router.refresh()
    })
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          New announcement
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-navy-800">
              {mode === 'create' ? 'Post announcement' : 'Edit announcement'}
            </h2>

            <form ref={formRef} onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Title</label>
                <input name="title" type="text" required defaultValue={announcement?.title} className={inputClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Message</label>
                <textarea name="body" required rows={4} defaultValue={announcement?.body} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-700">Audience</label>
                  <select
                    name="audience"
                    required
                    className={inputClass}
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as Audience)}
                  >
                    {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => (
                      <option key={a} value={a}>
                        {AUDIENCE_LABELS[a]}
                      </option>
                    ))}
                  </select>
                </div>

                {audience === 'class' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-navy-700">Class</label>
                    <select name="class_id" required className={inputClass} defaultValue={announcement?.class_id ?? ''}>
                      <option value="" disabled>
                        Choose a class…
                      </option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-700">Publish date</label>
                  <input
                    name="publish_at"
                    type="datetime-local"
                    required
                    defaultValue={toDatetimeLocalValue(announcement?.publish_at)}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-700">Expiration date (optional)</label>
                  <input
                    name="expires_at"
                    type="datetime-local"
                    defaultValue={announcement?.expires_at ? toDatetimeLocalValue(announcement.expires_at) : ''}
                    className={inputClass}
                  />
                </div>
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
                  {mode === 'create' ? 'Post' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
