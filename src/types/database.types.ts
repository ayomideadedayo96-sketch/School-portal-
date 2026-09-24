// Hand-written types matching supabase/migrations/0001_initial_schema.sql.
//
// Once the Supabase CLI is set up, prefer regenerating this file with:
//   npx supabase gen types typescript --project-id <project-ref> > src/types/database.types.ts
// Phase 1 ships this hand-written version so the app compiles without CLI access.

export type UserRole = 'admin' | 'teacher' | 'staff'

export interface Profile {
  id: string
  user_id: string
  full_name: string
  email: string
  role: UserRole
  phone: string | null
  created_at: string
  updated_at: string
}

export type StaffStatus = 'active' | 'inactive'

export interface Staff {
  id: string
  profile_id: string
  employee_id: string | null
  staff_type: 'teaching' | 'non_teaching'
  department: string | null
  position: string | null
  date_joined: string | null
  status: StaffStatus
  created_at: string
  updated_at: string
}

// Staff row joined with its profile — what the staff list/detail pages use.
export interface StaffWithProfile extends Staff {
  profile: Profile
}

export interface AcademicSession {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
  updated_at: string
}

export interface Term {
  id: string
  academic_session_id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
  updated_at: string
}

export type ClassStatus = 'active' | 'archived'

export interface Class {
  id: string
  name: string
  level: string | null
  academic_session_id: string
  class_teacher_id: string | null
  status: ClassStatus
  created_at: string
  updated_at: string
}

export interface ClassWithTeacher extends Class {
  class_teacher: Profile | null
}

export interface Subject {
  id: string
  name: string
  code: string | null
  created_at: string
  updated_at: string
}

export interface ClassSubject {
  id: string
  class_id: string
  subject_id: string
  academic_session_id: string
  created_at: string
}

export interface TeacherAssignment {
  id: string
  teacher_id: string
  subject_id: string
  class_id: string
  academic_session_id: string
  term_id: string | null
  created_at: string
  updated_at: string
}

export type StudentStatus = 'active' | 'archived'
export type Gender = 'male' | 'female'

export interface Student {
  id: string
  admission_number: string
  first_name: string
  middle_name: string | null
  last_name: string
  full_name: string // generated column, read-only
  class_id: string | null
  gender: Gender | null
  date_of_birth: string | null
  guardian_name: string | null
  guardian_phone: string | null
  address: string | null
  photo_url: string | null
  admission_date: string
  status: StudentStatus
  created_at: string
  updated_at: string
}

export interface StudentWithClass extends Student {
  class: Pick<Class, 'id' | 'name' | 'level'> | null
}

export interface SchoolSettings {
  id: number
  school_name: string | null
  logo_path: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  updated_by: string | null
  updated_at: string
}

export interface ActivityLog {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  description: string
  created_at: string
}

export interface ActivityLogWithActor extends ActivityLog {
  actor: Pick<Profile, 'full_name'> | null
}

export type StaffPermissionName = 'manage_results'

export interface StaffPermission {
  id: string
  profile_id: string
  permission: StaffPermissionName
  granted_by: string | null
  created_at: string
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface Attendance {
  id: string
  student_id: string
  class_id: string
  academic_session_id: string
  term_id: string | null
  date: string
  status: AttendanceStatus
  recorded_by: string | null
  created_at: string
  updated_at: string
}

export interface ScoreSettings {
  id: number
  ca_max: number
  exam_max: number
  updated_at: string
}

export interface GradeBoundary {
  id: string
  grade: string
  min_score: number
  max_score: number
  remark: string | null
  created_at: string
  updated_at: string
}

export interface Result {
  id: string
  student_id: string
  subject_id: string
  class_id: string
  academic_session_id: string
  term_id: string
  ca_score: number
  exam_score: number
  total: number // generated column, read-only
  grade: string | null
  remark: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
}

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

export interface TimetableEntry {
  id: string
  class_id: string
  academic_session_id: string
  day_of_week: DayOfWeek
  period: number
  subject_id: string
  teacher_id: string
  room: string | null
  created_at: string
  updated_at: string
}

export interface TimetableEntryWithDetails extends TimetableEntry {
  class: Pick<Class, 'id' | 'name'> | null
  subject: Pick<Subject, 'id' | 'name'> | null
  teacher: Pick<Profile, 'id' | 'full_name'> | null
}

// 'class' means "a specific class" — announcements/documents.class_id
// must be set whenever this value is used.
export type Audience = 'all' | 'teachers' | 'staff' | 'class'

export const AUDIENCE_LABELS: Record<Audience, string> = {
  all: 'All Staff',
  teachers: 'Teachers',
  staff: 'Staff',
  class: 'Specific Class',
}

export interface Announcement {
  id: string
  title: string
  body: string
  audience: Audience
  class_id: string | null
  publish_at: string
  expires_at: string | null
  is_archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AnnouncementWithAuthor extends Announcement {
  class: Pick<Class, 'id' | 'name'> | null
  author: Pick<Profile, 'full_name'> | null
}

export type DocumentFileType = 'pdf' | 'doc' | 'docx' | 'jpg' | 'jpeg' | 'png'

export interface SchoolDocument {
  id: string
  title: string
  description: string | null
  file_path: string
  file_name: string
  file_type: DocumentFileType
  file_size: number
  audience: Audience
  class_id: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface SchoolDocumentWithDetails extends SchoolDocument {
  class: Pick<Class, 'id' | 'name'> | null
  uploader: Pick<Profile, 'full_name'> | null
}

// Minimal Database shape so `createClient<Database>()` type-checks.
// Extend the Row/Insert/Update triplet per table as Phase 2 adds queries.
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, 'user_id' | 'full_name' | 'email' | 'role'>
        Update: Partial<Profile>
      }
      staff: {
        Row: Staff
        Insert: Partial<Staff> & Pick<Staff, 'profile_id' | 'staff_type'>
        Update: Partial<Staff>
      }
      class_subjects: {
        Row: ClassSubject
        Insert: Partial<ClassSubject> &
          Pick<ClassSubject, 'class_id' | 'subject_id' | 'academic_session_id'>
        Update: Partial<ClassSubject>
      }
      activity_log: {
        Row: ActivityLog
        Insert: Partial<ActivityLog> & Pick<ActivityLog, 'action' | 'entity_type' | 'description'>
        Update: Partial<ActivityLog>
      }
      staff_permissions: {
        Row: StaffPermission
        Insert: Partial<StaffPermission> & Pick<StaffPermission, 'profile_id' | 'permission'>
        Update: Partial<StaffPermission>
      }
      attendance: {
        Row: Attendance
        Insert: Partial<Attendance> &
          Pick<Attendance, 'student_id' | 'class_id' | 'academic_session_id' | 'date' | 'status'>
        Update: Partial<Attendance>
      }
      score_settings: {
        Row: ScoreSettings
        Insert: Partial<ScoreSettings>
        Update: Partial<ScoreSettings>
      }
      grade_boundaries: {
        Row: GradeBoundary
        Insert: Partial<GradeBoundary> & Pick<GradeBoundary, 'grade' | 'min_score' | 'max_score'>
        Update: Partial<GradeBoundary>
      }
      results: {
        Row: Result
        Insert: Partial<Omit<Result, 'total'>> &
          Pick<Result, 'student_id' | 'subject_id' | 'class_id' | 'academic_session_id' | 'term_id'>
        Update: Partial<Omit<Result, 'total'>>
      }
      academic_sessions: {
        Row: AcademicSession
        Insert: Partial<AcademicSession> & Pick<AcademicSession, 'name' | 'start_date' | 'end_date'>
        Update: Partial<AcademicSession>
      }
      terms: {
        Row: Term
        Insert: Partial<Term> & Pick<Term, 'academic_session_id' | 'name' | 'start_date' | 'end_date'>
        Update: Partial<Term>
      }
      classes: {
        Row: Class
        Insert: Partial<Class> & Pick<Class, 'name' | 'academic_session_id'>
        Update: Partial<Class>
      }
      subjects: {
        Row: Subject
        Insert: Partial<Subject> & Pick<Subject, 'name'>
        Update: Partial<Subject>
      }
      teacher_assignments: {
        Row: TeacherAssignment
        Insert: Partial<TeacherAssignment> &
          Pick<TeacherAssignment, 'teacher_id' | 'subject_id' | 'class_id' | 'academic_session_id'>
        Update: Partial<TeacherAssignment>
      }
      students: {
        Row: Student
        Insert: Partial<Omit<Student, 'full_name'>> &
          Pick<Student, 'admission_number' | 'first_name' | 'last_name'>
        Update: Partial<Omit<Student, 'full_name'>>
      }
      timetable_entries: {
        Row: TimetableEntry
        Insert: Partial<TimetableEntry> &
          Pick<
            TimetableEntry,
            'class_id' | 'academic_session_id' | 'day_of_week' | 'period' | 'subject_id' | 'teacher_id'
          >
        Update: Partial<TimetableEntry>
      }
      announcements: {
        Row: Announcement
        Insert: Partial<Announcement> & Pick<Announcement, 'title' | 'body'>
        Update: Partial<Announcement>
      }
      documents: {
        Row: SchoolDocument
        Insert: Partial<SchoolDocument> &
          Pick<SchoolDocument, 'title' | 'file_path' | 'file_name' | 'file_type' | 'file_size'>
        Update: Partial<SchoolDocument>
      }
      school_settings: {
        Row: SchoolSettings
        Insert: Partial<SchoolSettings>
        Update: Partial<SchoolSettings>
      }
    }
  }
}
