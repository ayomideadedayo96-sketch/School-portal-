'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast/ToastProvider'
import Spinner from '@/components/Spinner'
import { saveSchoolProfile } from './actions'
import type { SchoolSettings } from '@/types/database.types'

const inputClass =
  'w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-navy-500 focus:ring-1 focus:ring-navy-500'

export default function SchoolProfileForm({ settings, logoUrl }: { settings: SchoolSettings; logoUrl: string | null }) {
  const router = useRouter()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(logoUrl)

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      const result = await saveSchoolProfile(formData)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong. Please try again.')
        return
      }
      toast.success('School profile saved.')
      router.refresh()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6 p-5" noValidate>
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-navy-100 bg-navy-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="School logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-navy-300">No logo</span>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-navy-700">School logo</label>
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleLogoChange}
            className="mt-1.5 block text-sm text-navy-500 file:mr-3 file:rounded-md file:border file:border-navy-200 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-50"
          />
          <p className="mt-1 text-xs text-navy-400">PNG, JPG, SVG, or WEBP. Max 2MB.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="School name" name="school_name" defaultValue={settings.school_name ?? ''} />
        <Field label="Website" name="website" type="url" defaultValue={settings.website ?? ''} />
        <Field label="Phone" name="phone" defaultValue={settings.phone ?? ''} />
        <Field label="Email" name="email" type="email" defaultValue={settings.email ?? ''} />
        <Field label="Address" name="address" defaultValue={settings.address ?? ''} className="sm:col-span-2" />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          {isPending && <Spinner className="h-4 w-4 text-white" />}
          Save school profile
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  className,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label className="text-sm font-medium text-navy-700">{label}</label>
      <input type={type} name={name} defaultValue={defaultValue} className={inputClass} />
    </div>
  )
}
