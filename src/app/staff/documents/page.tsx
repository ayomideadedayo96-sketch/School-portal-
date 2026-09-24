import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import { formatDateTime, formatFileSize } from '@/lib/utils/format'
import { getDocumentUrls, DOCUMENT_TYPE_LABELS } from '@/lib/utils/documents'
import type { SchoolDocumentWithDetails } from '@/types/database.types'

export default async function StaffDocumentsPage() {
  const supabase = await createClient()
  // RLS restricts results to documents addressed to "All Staff" or "Staff".
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, title, description, file_path, file_name, file_type, file_size, audience, created_at, class:classes(id, name)')
    .order('created_at', { ascending: false })

  const docs = (documents ?? []) as unknown as SchoolDocumentWithDetails[]
  const urlMap = await getDocumentUrls(docs.map((d) => d.file_path))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Documents" description="Files shared by the school administration." />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        {error ? (
          <ErrorState />
        ) : docs.length === 0 ? (
          <EmptyState title="No documents yet" description="Shared files will appear here." />
        ) : (
          <ul className="divide-y divide-navy-100">
            {docs.map((d) => {
              const urls = urlMap.get(d.file_path)
              return (
                <li key={d.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{d.title}</p>
                      <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">
                        {DOCUMENT_TYPE_LABELS[d.file_type]}
                      </span>
                    </div>
                    {d.description && <p className="mt-1 text-sm text-navy-500">{d.description}</p>}
                    <p className="mt-2 text-xs text-navy-400">
                      {d.file_name} · {formatFileSize(d.file_size)} · {formatDateTime(d.created_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {urls?.viewUrl && (
                      <a
                        href={urls.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                      >
                        View
                      </a>
                    )}
                    {urls?.downloadUrl && (
                      <a
                        href={urls.downloadUrl}
                        className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
