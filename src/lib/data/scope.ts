import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database.types'

/**
 * Classes a given profile is allowed to take attendance for / enter
 * results in. Admins get every active class; a teacher gets only
 * classes where they are the class teacher or have a teacher_assignment
 * (scoped to the given session, since assignments are per-session).
 */
export async function getAvailableClasses(profile: Profile, academicSessionId?: string) {
  const supabase = await createClient()

  if (profile.role === 'admin') {
    const { data } = await supabase.from('classes').select('id, name, level').eq('status', 'active').order('name')
    return data ?? []
  }

  if (profile.role === 'teacher') {
    const [{ data: owned }, { data: assigned }] = await Promise.all([
      supabase.from('classes').select('id, name, level').eq('class_teacher_id', profile.id).eq('status', 'active'),
      academicSessionId
        ? supabase
            .from('teacher_assignments')
            .select('class:classes(id, name, level)')
            .eq('teacher_id', profile.id)
            .eq('academic_session_id', academicSessionId)
        : supabase.from('teacher_assignments').select('class:classes(id, name, level)').eq('teacher_id', profile.id),
    ])

    const fromAssignments = (assigned ?? []).map((a: any) => a.class).filter(Boolean)
    const merged = new Map<string, { id: string; name: string; level: string | null }>()
    ;[...(owned ?? []), ...fromAssignments].forEach((c: any) => {
      if (c) merged.set(c.id, c)
    })
    return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  return []
}

/**
 * Subjects a given profile may enter results for, within one class and
 * session. Admins get every subject offered in that class; a teacher
 * gets only the subjects they are specifically assigned to teach there.
 */
export async function getAvailableSubjectsForClass(
  profile: Profile,
  classId: string,
  academicSessionId: string
) {
  const supabase = await createClient()

  if (profile.role === 'admin') {
    const { data } = await supabase
      .from('class_subjects')
      .select('subject:subjects(id, name)')
      .eq('class_id', classId)
      .eq('academic_session_id', academicSessionId)
    return (data ?? []).map((row: any) => row.subject).filter(Boolean)
  }

  const { data } = await supabase
    .from('teacher_assignments')
    .select('subject:subjects(id, name)')
    .eq('teacher_id', profile.id)
    .eq('class_id', classId)
    .eq('academic_session_id', academicSessionId)

  const seen = new Map<string, { id: string; name: string }>()
  ;(data ?? []).forEach((row: any) => {
    if (row.subject) seen.set(row.subject.id, row.subject)
  })
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
}
