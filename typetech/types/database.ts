export type TypingStyle = 'Hunting' | 'Homerow'
export type AttendanceStatus = 'Present' | 'Late' | 'Absent'
export type FinalStatus = 'Complete' | 'Pass' | 'Fail' | 'Pending'

export interface Student {
  id: string
  name: string
  email: string
  typing_style: TypingStyle | null
  wpm_score: number | null
  curriculum_completed: boolean
  admin_approved: boolean
  final_status: FinalStatus
  cohort_id: string | null
  certificate_emailed: boolean  // Add this
  certificate_emailed_at: string | null  // Add this
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  student_id: string
  week_number: number
  status: AttendanceStatus
  created_at: string
  updated_at: string
}

export interface Certificate {
  id: string
  student_id: string
  certificate_url: string | null
  generated_at: string
  email_sent: boolean
  email_sent_at: string | null
  email_error: string | null  // Add this
  email_attempts: number  // Add this
}

export interface EmailLog {
  id: string
  student_id: string
  email_type: 'certificate' | 'invite' | 'notification'
  recipient_email: string
  subject: string | null
  status: 'sent' | 'failed' | 'bounced'
  error_message: string | null
  sent_at: string
  metadata: any
}

export interface StudentWithAttendance extends Student {
  attendance: Attendance[]
}

export interface AttendanceSummary {
  studentId: string
  studentName: string
  totalPresent: number
  totalLate: number
  totalAbsent: number
  attendanceRate: number
}
