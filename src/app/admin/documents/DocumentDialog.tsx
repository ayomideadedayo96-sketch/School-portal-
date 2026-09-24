'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { DOCUMENT_ACCEPT, MAX_DOCUMENT_SIZE } from '@/lib/utils/documents'
import { AUDIENCE_LABELS, type Audience } from '@/types/database.types'
import { createDocument } from './actions'

const inputClass =
  'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500'

export default function DocumentDialog({ classes }: { classes: { id: string; name: string }[] }) {
  const router = useRouter()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audience, setAudience] = useState<Audience>('all')
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setFileName(file ? file.name : null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    const file = formData.get('file')
    if (file instanceof File && file.size > MAX_DOCUMENT_SIZE) {
      setError('File must be smaller than 10MB.')
      return
    }

    startTransition(async () => {
      const result = await createDocument(formData)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      toast.success('Document uploaded.')
      setOpen(false)
      setFileName(null)
      setAudience('all')
      formRef.current?.reset()
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
      >
        Upload document
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-navy-800">Upload document</h2>
            <p className="mt-1 text-sm text-navy-400">PDF, DOC, DOCX, JPG, or PNG — up to 10MB.</p>

            <form ref={formRef} onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Title</label>
                <input name="title" type="text" required className={inputClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">Description (optional)</label>
                <textarea name="description" rows={2} className={inputClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-navy-700">File</label>
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-navy-200 px-3 py-3 text-sm text-navy-500 hover:bg-navy-50">
                  <span className="truncate">{fileName ?? 'Choose a file…'}</span>
                  <span className="ml-3 shrink-0 rounded-md border border-navy-200 bg-white px-2 py-1 text-xs font-medium text-navy-600">
                    Browse
                  </span>
                  <input
                    name="file"
                    type="file"
                    required
                    accept={DOCUMENT_ACCEPT}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
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
                    <select name="class_id" required className={inputClass} defaultValue="">
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
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
