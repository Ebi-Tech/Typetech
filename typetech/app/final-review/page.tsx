'use client'

import { useState, useEffect, useMemo } from 'react'
import { useStudents } from '@/hooks/useStudents'
import { CohortSelector } from '@/components/cohorts/CohortSelector'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Filter, CheckCircle, XCircle, Clock, Save } from 'lucide-react'
import { Student, FinalStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function FinalReviewPage() {
  const { students, refresh } = useStudents()
  const [filter, setFilter] = useState<string>('all')
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  const [cohorts, setCohorts] = useState<Array<{ id: string; name: string }>>([])
  const [editingWPM, setEditingWPM] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  // Fetch cohorts
  const fetchCohorts = async () => {
    const { data } = await supabase.from('cohorts').select('*').order('name')
    setCohorts(data || [])
  }

  useEffect(() => {
    fetchCohorts()
  }, [])

  // Filter students by cohort
  const cohortFilteredStudents = selectedCohort
    ? students?.filter(s => s.cohort_id === selectedCohort)
    : students

  const filteredStudents = useMemo(() => {
    if (!cohortFilteredStudents) return []
    
    return cohortFilteredStudents.filter(student => {
      if (filter === 'all') return true
      if (filter === 'homerow') return student.typing_style === 'Homerow'
      if (filter === 'hunting') return student.typing_style === 'Hunting'
      if (filter === 'pending') return student.final_status === 'Pending'
      if (filter === 'complete') return student.final_status === 'Complete'
      if (filter === 'pass') return student.final_status === 'Pass'
      if (filter === 'fail') return student.final_status === 'Fail'
      return true
    })
  }, [cohortFilteredStudents, filter])

  const handleWPMChange = (studentId: string, value: string) => {
    const wpm = parseInt(value)
    if (!isNaN(wpm)) {
      setEditingWPM(prev => ({ ...prev, [studentId]: wpm }))
    }
  }

  const handleWPMUpdate = async (studentId: string) => {
    const wpm = editingWPM[studentId]
    if (!wpm) return

    setSaving(prev => ({ ...prev, [studentId]: true }))
    try {
      const { error } = await supabase
        .from('students')
        .update({ wpm_score: wpm })
        .eq('id', studentId)

      if (error) throw error
      
      setEditingWPM(prev => {
        const newState = { ...prev }
        delete newState[studentId]
        return newState
      })
      
      await refresh()
      toast.success('WPM updated')
    } catch (error) {
      toast.error('Failed to update WPM')
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }))
    }
  }

  const handleStatusChange = async (studentId: string, status: FinalStatus) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ final_status: status })
        .eq('id', studentId)

      if (error) throw error
      
      await refresh()
      toast.success(`Status updated to ${status}`)
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const getStatusSuggestion = (student: Student): string => {
    if (student.typing_style !== 'Homerow') return 'Fail'
    if (!student.wpm_score || student.wpm_score < 40) return 'Fail'
    if (student.curriculum_completed) return 'Complete'
    return 'Pass'
  }

  const applySuggestion = async (student: Student) => {
    const suggestion = getStatusSuggestion(student)
    await handleStatusChange(student.id, suggestion as FinalStatus)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Final Review</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <CohortSelector 
          selectedCohort={selectedCohort}
          onCohortChange={setSelectedCohort}
          cohorts={cohorts}
          onCohortCreated={fetchCohorts}
        />
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-500" />
          <Select value={filter} onValueChange={setFilter}>
            <option value="all">All Students</option>
            <option value="homerow">Homerow Only</option>
            <option value="hunting">Hunting Only</option>
            <option value="pending">Pending Review</option>
            <option value="complete">Complete</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready for Certificate</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredStudents?.filter(s => s.final_status === 'Complete').length || 0}
              </p>
            </div>
            <CheckCircle className="text-green-500" size={24} />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pass (No Curriculum)</p>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredStudents?.filter(s => s.final_status === 'Pass').length || 0}
              </p>
            </div>
            <Clock className="text-yellow-500" size={24} />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredStudents?.filter(s => s.final_status === 'Pending').length || 0}
              </p>
            </div>
            <Clock className="text-blue-500" size={24} />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredStudents?.filter(s => s.final_status === 'Fail').length || 0}
              </p>
            </div>
            <XCircle className="text-red-500" size={24} />
          </div>
        </Card>
      </div>

      {/* Main Review Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Style</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WPM</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Curriculum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents?.map((student) => {
                const suggestion = getStatusSuggestion(student)
                const cohort = cohorts.find(c => c.id === student.cohort_id)
                
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{cohort?.name || '—'}</Badge>
                    </td>
                    
                    <td className="px-4 py-3">
                      <Badge variant={student.typing_style === 'Homerow' ? 'success' : 'warning'}>
                        {student.typing_style || 'Not set'}
                      </Badge>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          defaultValue={student.wpm_score || ''}
                          onChange={(e) => handleWPMChange(student.id, e.target.value)}
                          className="w-20 h-8 text-sm"
                          placeholder="WPM"
                        />
                        {editingWPM[student.id] && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleWPMUpdate(student.id)}
                            disabled={saving[student.id]}
                          >
                            <Save size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <Badge variant={student.curriculum_completed ? 'success' : 'secondary'}>
                        {student.curriculum_completed ? 'Completed' : 'In Progress'}
                      </Badge>
                    </td>
                    
                    <td className="px-4 py-3">
                      <Badge variant={
                        suggestion === 'Complete' ? 'success' :
                        suggestion === 'Pass' ? 'warning' :
                        'destructive'
                      }>
                        {suggestion}
                      </Badge>
                    </td>
                    
                    <td className="px-4 py-3">
                      <Select
                        value={student.final_status}
                        onValueChange={(value) => handleStatusChange(student.id, value as FinalStatus)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Complete">Complete</option>
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                      </Select>
                    </td>
                    
                    <td className="px-4 py-3">
                      {student.final_status === 'Pending' && suggestion !== 'Pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => applySuggestion(student)}
                        >
                          Apply Suggestion
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
