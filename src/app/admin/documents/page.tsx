import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import ErrorState from '@/components/admin/ErrorState'
import ConfirmActionButton from '@/components/admin/ConfirmActionButton'
import Pagination from '@/components/admin/Pagination'
import { formatDateTime, formatFileSize } from '@/lib/utils/format'
import { getDocumentUrls, DOCUMENT_TYPE_LABELS } from '@/lib/utils/documents'
import { AUDIENCE_LABELS, type Audience, type SchoolDocumentWithDetails } from '@/types/database.types'
import DocumentDialog from './DocumentDialog'
import DocumentsFilterBar from './DocumentsFilterBar'
import { deleteDocument } from './actions'

const PAGE_SIZE = 15

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: { q?: string; audience?: string; class?: string; type?: string; page?: string }
}) {
  const supabase = await createClient()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: classes } = await supabase.from('classes').select('id, name').eq('status', 'active').order('name')

  let query = supabase
    .from('documents')
    .select(
      'id, title, description, file_path, file_name, file_type, file_size, audience, class_id, created_at, class:classes(id, name), uploader:profiles(full_name)',
      { count: 'exact' }
    )

  if (searchParams.q) {
    query = query.or(`title.ilike.%${searchParams.q}%,file_name.ilike.%${searchParams.q}%`)
  }
  if (searchParams.audience) query = query.eq('audience', searchParams.audience)
  if (searchParams.class) query = query.eq('class_id', searchParams.class)
  if (searchParams.type === 'jpg') {
    query = query.in('file_type', ['jpg', 'jpeg'])
  } else if (searchParams.type) {
    query = query.eq('file_type', searchParams.type)
  }

  const { data: documents, count, error } = await query.order('created_at', { ascending: false }).range(from, to)

  const docs = (documents ?? []) as unknown as SchoolDocumentWithDetails[]
  const urlMap = await getDocumentUrls(docs.map((d) => d.file_path))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documents"
        description="Upload and share files with teachers and staff."
        action={<DocumentDialog classes={classes ?? []} />}
      />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 p-4">
          <DocumentsFilterBar classOptions={(classes ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        </div>

        {error ? (
          <ErrorState />
        ) : docs.length === 0 ? (
          <EmptyState title="No documents found" description="Try adjusting your filters, or upload a new document." />
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
                      <span className="rounded-full bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-600">
                        {AUDIENCE_LABELS[d.audience as Audience]}
                      </span>
                      {d.class && (
                        <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-600">
                          {d.class.name}
                        </span>
                      )}
                    </div>
                    {d.description && <p className="mt-1 text-sm text-navy-500">{d.description}</p>}
                    <p className="mt-2 text-xs text-navy-400">
                      {d.file_name} · {formatFileSize(d.file_size)} · {d.uploader?.full_name ?? 'Admin'} ·{' '}
                      {formatDateTime(d.created_at)}
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
                    <ConfirmActionButton
                      label="Delete"
                      confirmTitle="Delete this document?"
                      confirmMessage={`"${d.title}" and its file will be permanently removed.`}
                      confirmLabel="Delete"
                      variant="danger"
                      successMessage="Document deleted."
                      action={() => deleteDocument(d.id)}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!error && docs.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/documents" searchParams={searchParams} />
        )}
      </div>
    </div>
  )
}
