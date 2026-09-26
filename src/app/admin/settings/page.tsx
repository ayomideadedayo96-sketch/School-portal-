import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/admin/PageHeader'
import ConfirmActionButton from '@/components/admin/ConfirmActionButton'
import { formatDate } from '@/lib/utils/format'
import { getLogoUrl } from '@/lib/utils/schoolAssets'
import AddSessionDialog from './AddSessionDialog'
import AddTermDialog from './AddTermDialog'
import SetCurrentButton from './SetCurrentButton'
import GradeBoundaryDialog from './GradeBoundaryDialog'
import ScoreSettingsForm from './ScoreSettingsForm'
import SchoolProfileForm from './SchoolProfileForm'
import { setCurrentSession, setCurrentTerm, deleteGradeBoundary } from './actions'
import type { SchoolSettings } from '@/types/database.types'

export default async function SettingsPage() {
  const supabase = await createClient()

  const [{ data: sessions }, { data: terms }, { data: scoreSettings }, { data: boundaries }, { data: schoolSettings }] =
    await Promise.all([
      supabase.from('academic_sessions').select('*').order('start_date', { ascending: false }),
      supabase
        .from('terms')
        .select('*, session:academic_sessions(name)')
        .order('start_date', { ascending: false }),
      supabase.from('score_settings').select('*').eq('id', 1).single(),
      supabase.from('grade_boundaries').select('*').order('min_score', { ascending: false }),
      supabase.from('school_settings').select('*').eq('id', 1).single(),
    ])

  const currentSession = sessions?.find((s) => s.is_current)
  const currentTerm = terms?.find((t: any) => t.is_current)
  const logoUrl = await getLogoUrl(schoolSettings?.logo_path ?? null)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        description="Manage the school profile, academic sessions, terms, and the grading scale."
      />

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-navy-800">School profile</h2>
          <p className="mt-0.5 text-sm text-navy-400">
            Shown across the portal and on printed documents.
            {currentSession && (
              <>
                {' '}
                Currently running <span className="font-medium text-navy-600">{currentSession.name}</span>
                {currentTerm && (
                  <>
                    , <span className="font-medium text-navy-600">{currentTerm.name}</span>
                  </>
                )}
                .
              </>
            )}
          </p>
        </div>
        <SchoolProfileForm settings={(schoolSettings as SchoolSettings) ?? { id: 1 }} logoUrl={logoUrl} />
      </div>

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-navy-800">Academic sessions</h2>
          <AddSessionDialog />
        </div>
        {!sessions || sessions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-navy-400">No academic sessions yet.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {s.name}
                    {s.is_current && (
                      <span className="ml-2 inline-block rounded-full bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-600">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-navy-400">
                    {formatDate(s.start_date)} – {formatDate(s.end_date)}
                  </p>
                </div>
                {!s.is_current && <SetCurrentButton action={() => setCurrentSession(s.id)} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-navy-800">Terms</h2>
          <AddTermDialog sessions={(sessions ?? []).map((s) => ({ id: s.id, name: s.name }))} />
        </div>
        {!terms || terms.length === 0 ? (
          <p className="px-5 py-6 text-sm text-navy-400">No terms yet.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {terms.map((t: any) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {t.name}
                    {t.is_current && (
                      <span className="ml-2 inline-block rounded-full bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-600">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-navy-400">
                    {t.session?.name} · {formatDate(t.start_date)} – {formatDate(t.end_date)}
                  </p>
                </div>
                {!t.is_current && <SetCurrentButton action={() => setCurrentTerm(t.id)} />}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-navy-800">Score settings</h2>
          <p className="mt-0.5 text-sm text-navy-400">Maximum CA and Exam scores used to validate results entry.</p>
        </div>
        <ScoreSettingsForm caMax={scoreSettings?.ca_max ?? 40} examMax={scoreSettings?.exam_max ?? 60} />
      </div>

      <div className="rounded-lg border border-navy-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-navy-800">Grading</h2>
            <p className="mt-0.5 text-sm text-navy-400">
              Grade boundaries used to automatically grade results. Ranges are out of the CA + Exam total above.
            </p>
          </div>
          <GradeBoundaryDialog
            mode="create"
            trigger={
              <button className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
                Add grade
              </button>
            }
          />
        </div>
        {!boundaries || boundaries.length === 0 ? (
          <p className="px-5 py-6 text-sm text-navy-400">No grade boundaries configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
              <tr>
                <th className="px-5 py-3 font-medium">Grade</th>
                <th className="px-5 py-3 font-medium">Range</th>
                <th className="px-5 py-3 font-medium">Remark</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {boundaries.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-3 font-semibold text-ink">{b.grade}</td>
                  <td className="px-5 py-3 text-navy-500">
                    {b.min_score} – {b.max_score}
                  </td>
                  <td className="px-5 py-3 text-navy-500">{b.remark ?? '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <GradeBoundaryDialog
                        mode="edit"
                        boundary={b}
                        trigger={
                          <button className="rounded-md border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
                            Edit
                          </button>
                        }
                      />
                      <ConfirmActionButton
                        label="Delete"
                        confirmTitle="Delete this grade boundary?"
                        confirmMessage={`"${b.grade}" will be removed from the grading scale.`}
                        confirmLabel="Delete"
                        variant="danger"
                        successMessage="Grade boundary deleted."
                        action={() => deleteGradeBoundary(b.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
