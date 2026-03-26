import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Student } from '@/types/database'
import toast from 'react-hot-toast'

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name')

      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch students')
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const addStudent = async (student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .insert([student])
        .select()
        .single()

      if (error) throw error
      setStudents(prev => [...prev, data])
      toast.success('Student added successfully')
      return data
    } catch (err) {
      toast.error('Failed to add student')
      throw err
    }
  }

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setStudents(prev => prev.map(s => s.id === id ? data : s))
      toast.success('Student updated successfully')
      return data
    } catch (err) {
      toast.error('Failed to update student')
      throw err
    }
  }

  const deleteStudent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)

      if (error) throw error
      setStudents(prev => prev.filter(s => s.id !== id))
      toast.success('Student deleted successfully')
    } catch (err) {
      toast.error('Failed to delete student')
      throw err
    }
  }

  const importStudents = async (
    names: string[],
    emails: string[],
    cohortId?: string,
    conflictAction: 'add' | 'move' | 'skip' = 'skip',
  ) => {
    try {
      const allStudents = names.map((name, index) => ({ name, email: emails[index] }))

      // Check which emails already exist and what cohort they're currently in
      const { data: existing } = await supabase
        .from('students')
        .select('id, email, cohort_id')
        .in('email', emails)

      const existingMap = new Map((existing || []).map(r => [r.email, r]))

      const toInsert    = allStudents.filter(s => !existingMap.has(s.email))
      const toReassign  = allStudents.filter(s => {
        const ex = existingMap.get(s.email)
        return ex && !ex.cohort_id   // exists but currently unassigned
      })
      const conflicting = allStudents.filter(s => {
        const ex = existingMap.get(s.email)
        return ex && ex.cohort_id && ex.cohort_id !== cohortId  // already in a different cohort
      })

      let inserted: Student[] = []

      // Always insert truly new students
      if (toInsert.length > 0) {
        const { data, error } = await supabase
          .from('students')
          .insert(toInsert.map(s => ({ ...s, final_status: 'Pending', cohort_id: cohortId || null })))
          .select()
        if (error) throw error
        inserted = data || []
      }

      // Always reassign students who exist but have no cohort
      if (toReassign.length > 0 && cohortId) {
        const ids = toReassign.map(s => existingMap.get(s.email)!.id)
        await supabase.from('students').update({ cohort_id: cohortId }).in('id', ids)
      }

      // Handle conflicting students based on chosen action
      let addedFromConflict: Student[] = []
      if (conflicting.length > 0) {
        if (conflictAction === 'add') {
          // Insert brand-new records alongside the existing ones
          const { data, error } = await supabase
            .from('students')
            .insert(conflicting.map(s => ({ ...s, final_status: 'Pending', cohort_id: cohortId || null })))
            .select()
          if (error) throw error
          addedFromConflict = data || []
        } else if (conflictAction === 'move') {
          // Move existing records to the target cohort
          const ids = conflicting.map(s => existingMap.get(s.email)!.id)
          await supabase.from('students').update({ cohort_id: cohortId }).in('id', ids)
        }
        // 'skip' → do nothing
      }

      await fetchStudents()

      const totalImported = inserted.length + addedFromConflict.length
      const parts: string[] = []
      if (totalImported)      parts.push(`${totalImported} imported`)
      if (toReassign.length)  parts.push(`${toReassign.length} reassigned to this cohort`)
      if (conflicting.length && conflictAction === 'move') parts.push(`${conflicting.length} moved to this cohort`)
      if (conflicting.length && conflictAction === 'skip') parts.push(`${conflicting.length} skipped`)
      toast.success(parts.join(', ') || 'Done', { duration: 5000 })

      return {
        inserted,
        reassigned: toReassign,
        addedFromConflict,
        skipped: conflictAction === 'skip' ? conflicting : [],
      }
    } catch (err) {
      toast.error('Failed to import students')
      throw err
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  return {
    students,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    importStudents,
    refresh: fetchStudents
  }
}
