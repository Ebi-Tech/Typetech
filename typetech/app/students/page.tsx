'use client'

import { useState, useEffect } from 'react'
import { StudentImport } from '@/components/students/StudentImport'
import { useStudents } from '@/hooks/useStudents'
import { Student } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select, SelectItem } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Plus, Download, ChevronDown, ChevronRight, Search, X, ArrowRightLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CohortSelector } from '@/components/cohorts/CohortSelector'
import toast from 'react-hot-toast'

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
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [moveFromId, setMoveFromId] = useState('')
  const [moveToId, setMoveToId] = useState('')
  const [moving, setMoving] = useState(false)

  const fetchCohorts = async () => {
    const { data } = await supabase.from('cohorts').select('*')
    const sorted = (data || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    )
    setCohorts(sorted)
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

  const searchQ = studentSearch.trim().toLowerCase()

  const visibleGroups = (selectedCohort ? allGroups.filter(g => g.id === selectedCohort) : allGroups)
    .map(g => ({
      ...g,
      students: searchQ ? g.students.filter((s: Student) => s.name.toLowerCase().includes(searchQ)) : g.students
    }))
    .filter(g => g.students.length > 0)

  // Count of students in the selected "from" source for the move dialog
  const moveFromCount = moveFromId === 'none'
    ? noCohortStudents.length
    : (cohorts.find(c => c.id === moveFromId) ? studentsByCohort.find(g => g.id === moveFromId)?.students.length ?? 0 : 0)

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
    } catch {
      // Error handled in hook
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      await deleteStudent(id)
    }
  }

  const handleMove = async () => {
    if (!moveFromId || !moveToId || moveFromId === moveToId) return
    setMoving(true)
    try {
      const query = supabase.from('students').update({ cohort_id: moveToId })
      const { error } = moveFromId === 'none'
        ? await query.is('cohort_id', null)
        : await query.eq('cohort_id', moveFromId)
      if (error) throw error
      toast.success(`${moveFromCount} student${moveFromCount !== 1 ? 's' : ''} moved successfully.`)
      setIsMoveOpen(false)
      setMoveFromId('')
      setMoveToId('')
      refresh()
    } catch {
      toast.error('Failed to move students')
    } finally {
      setMoving(false)
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

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading students...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => { setMoveFromId(''); setMoveToId(''); setIsMoveOpen(true) }}>
            <ArrowRightLeft size={16} className="mr-2" />
            Move Students
          </Button>
          <Button onClick={() => setIsImportDialogOpen(true)}>
            <Plus size={16} className="mr-2" />
            Import Students
          </Button>
        </div>
      </div>

      {/* Cohort Filter + Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <CohortSelector
          selectedCohort={selectedCohort}
          onCohortChange={setSelectedCohort}
          cohorts={cohorts}
          onCohortCreated={fetchCohorts}
        />
        <div className="relative min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student..."
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
            className="w-full pl-9 pr-8 h-10 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {studentSearch && (
            <button
              onClick={() => setStudentSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Cohort Groups */}
      <div className="space-y-4">
        {visibleGroups.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No students yet. Use Import Students to add them.
          </Card>
        ) : visibleGroups.map((group) => (
          <Card key={group.id} className="overflow-hidden">
            <div
              className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2 cursor-pointer hover:bg-gray-100"
              onClick={() => toggleCohort(group.id)}
            >
              {(expandedCohorts[group.id] || !!searchQ) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <h2 className="font-semibold">{group.name}</h2>
              <span className="text-sm text-gray-500">({group.students.length} students)</span>
            </div>

            {(expandedCohorts[group.id] || !!searchQ) && (
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
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{student.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{student.email}</td>
                        <td className="px-4 py-2">
                          <Badge variant={statusVariant(student.final_status)}>
                            {student.final_status || 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(student)}>Edit</Button>
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(student.id)}>Delete</Button>
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

      {/* ── Import Dialog ── */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
          </DialogHeader>
          <StudentImport
            onRefresh={() => { refresh(); fetchCohorts() }}
            onSuccess={() => setIsImportDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Student Dialog ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={open => { setIsEditDialogOpen(open); if (!open) setEditingStudent(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            {editingStudent && (
              <DialogDescription>{editingStudent.name}</DialogDescription>
            )}
          </DialogHeader>
          {editingStudent && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              <Input name="name" label="Name" defaultValue={editingStudent.name} required />
              <Input name="email" label="Email" type="email" defaultValue={editingStudent.email} required />
              <Select
                label="Cohort"
                value={editCohortId || 'none'}
                onValueChange={val => setEditCohortId(val === 'none' ? '' : val)}
              >
                <SelectItem value="none">No Cohort</SelectItem>
                {cohorts.map(cohort => (
                  <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>
                ))}
              </Select>
              <Input
                name="notes"
                label="Notes"
                defaultValue={editingStudent.notes || ''}
                placeholder="Additional notes..."
              />
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Move Students Dialog ── */}
      <Dialog open={isMoveOpen} onOpenChange={open => { setIsMoveOpen(open); if (!open) { setMoveFromId(''); setMoveToId('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Students Between Cohorts</DialogTitle>
            <DialogDescription>
              Select a source and destination cohort. All students from the source will be moved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select
              label="Move from"
              value={moveFromId || 'placeholder'}
              onValueChange={val => { setMoveFromId(val === 'placeholder' ? '' : val); setMoveToId('') }}
            >
              <SelectItem value="placeholder">Select source cohort…</SelectItem>
              {noCohortStudents.length > 0 && (
                <SelectItem value="none">No Cohort ({noCohortStudents.length} students)</SelectItem>
              )}
              {cohorts.map(c => {
                const count = studentsByCohort.find(g => g.id === c.id)?.students.length ?? 0
                return (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({count} students)</SelectItem>
                )
              })}
            </Select>

            <Select
              label="Move to"
              value={moveToId || 'placeholder'}
              onValueChange={val => setMoveToId(val === 'placeholder' ? '' : val)}
            >
              <SelectItem value="placeholder">Select destination cohort…</SelectItem>
              {cohorts.filter(c => c.id !== moveFromId).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </Select>

            {moveFromId && moveToId && (
              <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <strong>{moveFromCount}</strong> student{moveFromCount !== 1 ? 's' : ''} will be moved from{' '}
                <strong>{moveFromId === 'none' ? 'No Cohort' : cohorts.find(c => c.id === moveFromId)?.name}</strong>{' '}
                to <strong>{cohorts.find(c => c.id === moveToId)?.name}</strong>.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveOpen(false)}>Cancel</Button>
            <Button
              disabled={!moveFromId || !moveToId || moveFromId === moveToId || moving}
              onClick={handleMove}
            >
              {moving ? 'Moving...' : `Move ${moveFromCount > 0 ? moveFromCount + ' ' : ''}Students`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
