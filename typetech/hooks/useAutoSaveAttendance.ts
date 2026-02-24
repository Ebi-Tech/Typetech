import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { AttendanceStatus } from '@/types/database'
import toast from 'react-hot-toast'

export function useAutoSaveAttendance() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const saveAttendance = useCallback(async (
    studentId: string,
    weekNumber: number,
    status: AttendanceStatus
  ) => {
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('week_number', weekNumber)
        .single()

      if (existing) {
        // Update existing
        await supabase
          .from('attendance')
          .update({ status })
          .eq('id', existing.id)
      } else {
        // Insert new
        await supabase
          .from('attendance')
          .insert([{
            student_id: studentId,
            week_number: weekNumber,
            status
          }])
      }
      
      return true
    } catch (error) {
      console.error('Auto-save failed:', error)
      return false
    }
  }, [])

  const queueSave = useCallback((
    studentId: string,
    weekNumber: number,
    status: AttendanceStatus
  ) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(async () => {
      setSyncing(true)
      const success = await saveAttendance(studentId, weekNumber, status)
      setSyncing(false)
      
      if (success) {
        setLastSync(new Date())
        // Show subtle notification
        toast.success('✓ Synced', {
          duration: 2000,
          position: 'top-center',
          icon: '🔄',
          style: {
            background: '#10b981',
            color: 'white',
            fontSize: '14px',
            padding: '8px 16px',
          },
        })
      }
    }, 800) // Wait 800ms after last change before saving

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [saveAttendance])

  return {
    queueSave,
    syncing,
    lastSync
  }
}