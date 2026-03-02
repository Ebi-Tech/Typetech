'use client'

import { useState, useEffect } from 'react'
import { StudentImport } from '@/components/students/StudentImport'
import { useStudents } from '@/hooks/useStudents'
import { Student } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select, SelectItem } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Plus, Download, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Cohort {
  id: string
  name: string
}

export default function StudentsPage() {
  const { students, loading, updateStudent, deleteStudent, refresh } = useStudents()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editCohortId, setEditCohortId] = useState<string>('')
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [expandedCohorts, setExpandedCohorts] = useState<Record<string, boolean>>({})

  const fetchCohorts = async () => {
    const { data } = await supabase.from('cohorts').select('*').order('name')
    setCohorts(data || [])
    const expanded: Record<string, boolean> = {}
    data?.forEach(cohort => { expanded[cohort.id] = true })
    setExpandedCohorts(prev => ({ ...expanded, ...prev }))
  }

  useEffect(() => {
    fetchCohorts()
  }, [])

  const studentsByCohort = cohorts.map(cohort => ({
    ...cohort,
    students: students?.filter(s => s.cohort_id === cohort.id) || []
  }))

  const noCohortStudents = students?.filter(s => !s.cohort_id) || []
  const allGroups = [
    ...(noCohortStudents.length > 0 ? [{ id: 'none', name: 'No Cohort', students: noCohortStudents }] : []),
    ...studentsByCohort.filter(group => group.students.length > 0)
  ]

  const toggleCohort = (cohortId: string) => {
    setExpandedCohorts(prev => ({ ...prev, [cohortId]: !prev[cohortId] }))
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setEditCohortId(student.cohort_id || '')
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingStudent) return

    const formData = new FormData(e.currentTarget)
    const updates = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      cohort_id: editCohortId || null,
      notes: formData.get('notes') as string,
    }

    try {
      await updateStudent(editingStudent.id, updates)
      setIsEditDialogOpen(false)
      setEditingStudent(null)
    } catch (error) {
      // Error handled in hook
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      await deleteStudent(id)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Cohort', 'Final Status'].join(','),
      ...(students?.map(s => [
        `"${s.name}"`,
        `"${s.email}"`,
        `"${cohorts.find(c => c.id === s.cohort_id)?.name || ''}"`,
        `"${s.final_status || ''}"`
      ].join(',')) || [])
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusVariant = (status: string | null) => {
    if (status === 'Complete') return 'success'
    if (status === 'Pass') return 'warning'
    if (status === 'Fail') return 'destructive'
    return 'secondary'
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

      {/* Import Dialog */}
      {isImportDialogOpen && (
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <StudentImport onSuccess={() => { refresh(); setIsImportDialogOpen(false) }} />
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Cohort Groups */}
      <div className="space-y-4">
        {allGroups.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No students yet. Use Import Students to add them.
          </Card>
        ) : allGroups.map((group) => (
          <Card key={group.id} className="overflow-hidden">
            <div
              className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between cursor-pointer hover:bg-gray-100"
              onClick={() => toggleCohort(group.id)}
            >
              <div className="flex items-center gap-2">
                {expandedCohorts[group.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <h2 className="font-semibold">{group.name}</h2>
                <span className="text-sm text-gray-500">({group.students.length} students)</span>
              </div>
            </div>

            {expandedCohorts[group.id] && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Email</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {group.students.map((student: Student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-2 font-medium">{student.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{student.email}</td>
                        <td className="px-4 py-2">
                          <Badge variant={statusVariant(student.final_status)}>
                            {student.final_status || 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(student)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(student.id)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </div>

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
                label="Cohort"
                value={editCohortId || 'none'}
                onValueChange={val => setEditCohortId(val === 'none' ? '' : val)}
              >
                <SelectItem value="none">No Cohort</SelectItem>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>
                ))}
              </Select>

              <Input
                name="notes"
                label="Notes"
                defaultValue={editingStudent.notes || ''}
                placeholder="Additional notes..."
              />

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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
