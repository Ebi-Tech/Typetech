import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Attendance, AttendanceStatus, Student } from '@/types/database'
import toast from 'react-hot-toast'

export function useAttendance(weekNumber: number) {
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('week_number', weekNumber)

      if (error) throw error
      setAttendance(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance')
      toast.error('Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  const updateAttendance = async (
    studentId: string, 
    status: AttendanceStatus
  ) => {
    try {
      // Check if attendance record exists
      const existing = attendance.find(a => a.student_id === studentId)
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('attendance')
          .update({ status })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        setAttendance(prev => prev.map(a => a.id === data.id ? data : a))
      } else {
        // Create new
        const { data, error } = await supabase
          .from('attendance')
          .insert([{
            student_id: studentId,
            week_number: weekNumber,
            status
          }])
          .select()
          .single()

        if (error) throw error
        setAttendance(prev => [...prev, data])
      }
      
      toast.success('Attendance updated')
    } catch (err) {
      toast.error('Failed to update attendance')
      throw err
    }
  }

  const bulkUpdateAttendance = async (
    updates: Record<string, AttendanceStatus>
  ) => {
    try {
      const promises = Object.entries(updates).map(([studentId, status]) =>
        updateAttendance(studentId, status)
      )
      
      await Promise.all(promises)
      toast.success('All attendance saved')
    } catch (err) {
      toast.error('Failed to save some attendance records')
      throw err
    }
  }

  const getAttendanceSummary = (students: Student[]) => {
    return students.map(student => {
      const studentAttendance = attendance.filter(a => a.student_id === student.id)
      const totalPresent = studentAttendance.filter(a => a.status === 'Present').length
      const totalLate = studentAttendance.filter(a => a.status === 'Late').length
      const totalAbsent = studentAttendance.filter(a => a.status === 'Absent').length
      
      return {
        studentId: student.id,
        studentName: student.name,
        totalPresent,
        totalLate,
        totalAbsent,
        attendanceRate: (totalPresent + totalLate * 0.5) / 11 * 100 // Late counts as half
      }
    })
  }

  useEffect(() => {
    fetchAttendance()
  }, [weekNumber])

  return {
    attendance,
    loading,
    error,
    updateAttendance,
    bulkUpdateAttendance,
    getAttendanceSummary,
    refresh: fetchAttendance
  }
}
