import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/format'
import PrintButton from '@/components/results/PrintButton'

export default async function StudentResultReportPage({
  params,
  searchParams,
}: {
  params: { studentId: string }
  searchParams: { session?: string; term?: string }
}) {
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('*, class:classes(id, name, level)')
    .eq('id', params.studentId)
    .single()

  if (!student) notFound()

  const [{ data: sessions }, { data: terms }] = await Promise.all([
    supabase.from('academic_sessions').select('id, name, is_current').order('start_date', { ascending: false }),
    supabase.from('terms').select('id, name, academic_session_id, is_current').order('start_date', { ascending: false }),
  ])

  const currentSession = sessions?.find((s) => s.is_current)
  const sessionId = searchParams.session || currentSession?.id || ''
  const currentTerm = terms?.find((t) => t.is_current && t.academic_session_id === sessionId)
  const termId = searchParams.term || currentTerm?.id || ''

  const session = sessions?.find((s) => s.id === sessionId)
  const term = terms?.find((t) => t.id === termId)

  const { data: results } =
    sessionId && termId
      ? await supabase
          .from('results')
          .select('ca_score, exam_score, total, grade, remark, subject:subjects(name)')
          .eq('student_id', student.id)
          .eq('academic_session_id', sessionId)
          .eq('term_id', termId)
          .order('subject_id')
      : { data: [] }

  const rows = (results ?? []) as any[]
  const totalScore = rows.reduce((sum, r) => sum + (r.total ?? 0), 0)
  const average = rows.length > 0 ? (totalScore / rows.length).toFixed(1) : '0.0'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/admin/students/${student.id}`} className="text-sm font-medium text-navy-500 hover:text-navy-700">
          ← Back to student profile
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-lg border border-navy-100 bg-white p-8 shadow-sm print:border-none print:p-0 print:shadow-none">
        <div className="flex items-center justify-between border-b border-navy-100 pb-6">
          <div>
            <p className="font-display text-xl font-semibold text-navy-800">School Portal</p>
            <p className="text-sm text-navy-400">Student Result Report</p>
          </div>
          <div className="text-right text-sm text-navy-500">
            {session?.name} · {term?.name}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Detail label="Student name" value={student.full_name} />
          <Detail label="Student ID" value={student.admission_number} />
          <Detail label="Class" value={student.class?.name} />
          <Detail label="Gender" value={student.gender} className="capitalize" />
          <Detail label="Date of birth" value={formatDate(student.date_of_birth)} />
          <Detail label="Academic session" value={session?.name} />
          <Detail label="Term" value={term?.name} />
        </dl>

        <div className="mt-8 overflow-x-auto rounded-lg border border-navy-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Subject</th>
                <th className="px-4 py-2.5 font-medium">CA</th>
                <th className="px-4 py-2.5 font-medium">Exam</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Grade</th>
                <th className="px-4 py-2.5 font-medium">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-navy-400">
                    No results recorded for this session and term yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-medium text-ink">{r.subject?.name}</td>
                    <td className="px-4 py-2.5 text-navy-600">{r.ca_score}</td>
                    <td className="px-4 py-2.5 text-navy-600">{r.exam_score}</td>
                    <td className="px-4 py-2.5 font-medium text-ink">{r.total}</td>
                    <td className="px-4 py-2.5 text-navy-600">{r.grade ?? '—'}</td>
                    <td className="px-4 py-2.5 text-navy-600">{r.remark ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="mt-4 flex justify-end gap-8 text-sm">
            <p className="text-navy-500">
              Total: <span className="font-semibold text-ink">{totalScore}</span>
            </p>
            <p className="text-navy-500">
              Average: <span className="font-semibold text-ink">{average}</span>
            </p>
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-6 text-sm text-navy-500">
          <div>
            <div className="h-12 border-b border-navy-200" />
            <p className="mt-1 text-xs">Class teacher&apos;s signature</p>
          </div>
          <div>
            <div className="h-12 border-b border-navy-200" />
            <p className="mt-1 text-xs">Principal&apos;s signature</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className={`mt-0.5 text-ink ${className ?? ''}`}>{value || '—'}</dd>
    </div>
  )
}
