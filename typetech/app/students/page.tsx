'use client'

import { useState } from 'react'
import { StudentImport } from '@/components/students/StudentImport'
import { StudentList } from '@/components/students/StudentList'
import { CohortSelector } from '@/components/cohorts/CohortSelector'
import { useStudents } from '@/hooks/useStudents'
import { Student } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Plus, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function StudentsPage() {
  const { students, loading, updateStudent, deleteStudent } = useStudents()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  const [cohorts, setCohorts] = useState<any[]>([])

  // Filter students by cohort
  const filteredStudents = selectedCohort
    ? students.filter(s => s.cohort_id === selectedCohort)
    : students

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setIsEditDialogOpen(true)
    fetchCohorts()
  }

  const fetchCohorts = async () => {
    const { data } = await supabase.from('cohorts').select('*')
    setCohorts(data || [])
  }

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingStudent) return

    const formData = new FormData(e.currentTarget)
    const cohortIdValue = formData.get('cohort_id');
    const updates = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      typing_style: formData.get('typing_style') as 'Hunting' | 'Homerow' | null,
      wpm_score: formData.get('wpm_score') ? Number(formData.get('wpm_score')) : null,
      curriculum_completed: formData.get('curriculum_completed') === 'true',
      final_status: formData.get('final_status') as any,
      cohort_id: cohortIdValue === null || cohortIdValue === '' ? null : String(cohortIdValue),
      notes: formData.get('notes') as string,
    }

    try {
      await updateStudent(editingStudent.id, updates)
      setIsEditDialogOpen(false)
      setEditingStudent(null)
    } catch (error) {
      // Error is handled in hook
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      await deleteStudent(id)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Typing Style', 'WPM', 'Curriculum', 'Status', 'Cohort', 'Notes'].join(','),
      ...filteredStudents.map(s => [
        s.name,
        s.email,
        s.typing_style || '',
        s.wpm_score || '',
        s.curriculum_completed ? 'Yes' : 'No',
        s.final_status,
        s.cohort_id || '',
        s.notes || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students-export.csv'
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading students...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setIsImportDialogOpen(true)}>
            <Plus size={16} className="mr-2" />
            Import Students
          </Button>
        </div>
      </div>

      {/* Cohort Filter */}
      <div className="flex items-center gap-4 mb-4">
        <CohortSelector 
          selectedCohort={selectedCohort}
          onCohortChange={setSelectedCohort}
        />
      </div>

      {isImportDialogOpen && (
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <StudentImport />
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      <StudentList 
        students={filteredStudents} 
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-lg font-semibold mb-4">Edit Student</h2>
          
          {editingStudent && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <Input
                name="name"
                label="Name"
                defaultValue={editingStudent.name}
                required
              />
              
              <Input
                name="email"
                label="Email"
                type="email"
                defaultValue={editingStudent.email}
                required
              />
              
              <Select
                name="typing_style"
                label="Typing Style"
                defaultValue={editingStudent.typing_style || ''}
              >
                <option value="">Not set</option>
                <option value="Hunting">Hunting</option>
                <option value="Homerow">Homerow</option>
              </Select>
              
              <Input
                name="wpm_score"
                label="WPM Score"
                type="number"
                defaultValue={editingStudent.wpm_score || ''}
              />
              
              <Select
                name="curriculum_completed"
                label="Curriculum Completed"
                defaultValue={String(editingStudent.curriculum_completed)}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </Select>
              
              <Select
                name="cohort_id"
                label="Cohort"
                defaultValue={editingStudent.cohort_id || ''}
              >
                <option value="">No Cohort</option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
                ))}
              </Select>
              
              <Select
                name="final_status"
                label="Final Status"
                defaultValue={editingStudent.final_status}
                required
              >
                <option value="Pending">Pending</option>
                <option value="Complete">Complete</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </Select>
              
              <Input
                name="notes"
                label="Notes"
                defaultValue={editingStudent.notes || ''}
                placeholder="Additional notes..."
              />
              
              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </div>
      </Dialog>
    </div>
  )
}
