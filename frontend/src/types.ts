export type UserRole = 'admin' | 'student'
export type WeekType = 'every' | 'odd' | 'even'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'assigned' | 'in_progress' | 'submitted' | 'completed'

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  group_id: number | null
  group_code: string | null
  is_active: boolean
  created_at: string
}

export interface AuthResponse { access_token: string; token_type: string; user: User }

export interface StudyGroup {
  id: number
  code: string
  name: string | null
  is_active: boolean
  created_at: string
}

export interface Semester {
  id: number
  name: string
  starts_on: string
  ends_on: string
  is_active: boolean
  created_at: string
}

export interface Lesson {
  id: number
  group_id: number
  semester_id: number
  subject: string
  teacher: string | null
  room: string | null
  lesson_type: string | null
  weekday: number
  start_time: string
  end_time: string
  week_type: WeekType
  notes: string | null
  is_active: boolean
  created_by_id: number
  created_at: string
  group_code: string | null
  semester_name: string | null
}

export type LessonInput = Omit<Lesson, 'id' | 'is_active' | 'created_by_id' | 'created_at' | 'group_code' | 'semester_name'>

export interface ScheduleOccurrence {
  lesson: Lesson
  date: string
  cancelled: boolean
  cancellation_id: number | null
  cancellation_reason: string | null
}

export interface ScheduleDay { date: string; weekday: number; lessons: ScheduleOccurrence[] }
export interface WeekSchedule {
  week_start: string
  week_end: string
  group_id: number
  group_code: string
  semester_id: number
  semester_name: string
  days: ScheduleDay[]
}

export interface FileInfo {
  id: number
  original_name: string
  content_type: string | null
  size_bytes: number
  created_at: string
  download_url: string
}

export interface TaskComment {
  id: number
  author_id: number
  author_name: string
  text: string
  created_at: string
}

export interface TaskSubmission {
  id: number
  task_id: number
  student_id: number
  student_name: string
  student_email: string
  status: TaskStatus
  score: number | null
  started_at: string | null
  submitted_at: string | null
  completed_at: string | null
  updated_at: string
  files: FileInfo[]
  comments: TaskComment[]
}

export interface Task {
  id: number
  group_id: number
  group_code: string
  title: string
  max_score: number
  description: string | null
  subject: string | null
  due_at: string | null
  priority: TaskPriority
  created_by_id: number
  created_by_name: string
  created_at: string
  updated_at: string
  attachments: FileInfo[]
  my_submission: TaskSubmission | null
  submissions_total: number
  submitted_count: number
  completed_count: number
  submissions?: TaskSubmission[]
}
