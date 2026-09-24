'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/requireProfile'
import { logActivity } from '@/lib/utils/activity'
import { computeGrade } from '@/lib/grading'

interface ActionResult {
  success: boolean
  error?: string
}

interface ResultRecord {
  studentId: string
  caScore: number
  examScore: number
  remark: string | null
}

export async function saveResults(params: {
  classId: string
  subjectId: string
  academicSessionId: string
  termId: string
  records: ResultRecord[]
  revalidatePathName: string
}): Promise<ActionResult> {
  const auth = await requireProfile()
  if (!auth.ok) return { success: false, error: auth.error }

  if (!params.classId || !params.subjectId || !params.academicSessionId || !params.termId) {
    return { success: false, error: 'Session, term, class, and subject are all required.' }
  }
  if (params.records.length === 0) {
    return { success: false, error: 'No students to save results for.' }
  }

  const supabase = await createClient()

  const [{ data: scoreSettings }, { data: boundaries }, { data: validStudents }] = await Promise.all([
    supabase.from('score_settings').select('*').eq('id', 1).single(),
    supabase.from('grade_boundaries').select('grade, min_score, max_score, remark').order('min_score', { ascending: false }),
    supabase.from('students').select('id').eq('class_id', params.classId).eq('status', 'active'),
  ])

  const caMax = scoreSettings?.ca_max ?? 40
  const examMax = scoreSettings?.exam_max ?? 60
  const validStudentIds = new Set((validStudents ?? []).map((s) => s.id))

  for (const record of params.records) {
    if (!validStudentIds.has(record.studentId)) {
      return { success: false, error: 'One or more students are not valid for this class.' }
    }
    if (record.caScore < 0 || record.examScore < 0) {
      return { success: false, error: 'Scores cannot be negative.' }
    }
    if (record.caScore > caMax) {
      return { success: false, error: `CA score cannot exceed ${caMax}.` }
    }
    if (record.examScore > examMax) {
      return { success: false, error: `Exam score cannot exceed ${examMax}.` }
    }
  }

  const rows = params.records.map((r) => {
    const total = r.caScore + r.examScore
    const { grade, remark: defaultRemark } = computeGrade(total, boundaries ?? [])
    return {
      student_id: r.studentId,
      subject_id: params.subjectId,
      class_id: params.classId,
      academic_session_id: params.academicSessionId,
      term_id: params.termId,
      ca_score: r.caScore,
      exam_score: r.examScore,
      grade,
      remark: r.remark || defaultRemark,
    }
  })

  const { error } = await supabase
    .from('results')
    .upsert(rows, { onConflict: 'student_id,subject_id,class_id,academic_session_id,term_id' })

  if (error) {
    const message =
      error.code === '23505'
        ? 'A result already exists for one of these students in this subject and term.'
        : error.message
    return { success: false, error: message }
  }

  await logActivity({
    action: 'record',
    entityType: 'results',
    description: `Recorded results for ${rows.length} student${rows.length === 1 ? '' : 's'}`,
  })

  revalidatePath(params.revalidatePathName)
  return { success: true }
}
