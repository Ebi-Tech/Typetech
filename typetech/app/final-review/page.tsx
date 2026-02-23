'use client'

import { useState, useMemo } from 'react'
import { useStudents } from '@/hooks/useStudents'
import { useAttendance } from '@/hooks/useAttendance'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectItem } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Filter, CheckCircle, XCircle, Clock, Save } from 'lucide-react'
import { Student, FinalStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function FinalReviewPage() {
  const { students, updateStudent } = useStudents()
  const [filter, setFilter] = useState<string>('all')
  const [editingWPM, setEditingWPM] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  // Get attendance summaries for all weeks
  const attendanceSummaries = useMemo(() => {
    if (!students) return {}
    
    return students.reduce((acc, student) => {
      // This would ideally come from a hook, but for now we'll simulate
      acc[student.id] = {
        totalPresent: Math.floor(Math.random() * 11), // Replace with actual data
        totalLate: Math.floor(Math.random() * 3),
        totalAbsent: Math.floor(Math.random() * 2)
      }
      return acc
    }, {} as Record<string, { totalPresent: number; totalLate: number; totalAbsent: number }>)
  }, [students])

  const filteredStudents = useMemo(() => {
    if (!students) return []
    
    return students.filter(student => {
      if (filter === 'all') return true
      if (filter === 'homerow') return student.typing_style === 'Homerow'
      if (filter === 'hunting') return student.typing_style === 'Hunting'
      if (filter === 'pending') return student.final_status === 'Pending'
      if (filter === 'complete') return student.final_status === 'Complete'
      if (filter === 'pass') return student.final_status === 'Pass'
      if (filter === 'fail') return student.final_status === 'Fail'
      return true
    })
  }, [students, filter])

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
      
      // Optionally, you can call updateStudent here if you want to refetch or update state
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
      
      // Optionally, you can call updateStudent here if you want to refetch or update state
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

  const getAttendanceRate = (studentId: string) => {
    const summary = attendanceSummaries[studentId]
    if (!summary) return 0
    return ((summary.totalPresent + summary.totalLate * 0.5) / 11 * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Final Review</h1>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-500" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectItem value="all">All Students</SelectItem>
            <SelectItem value="homerow">Homerow Only</SelectItem>
            <SelectItem value="hunting">Hunting Only</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
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
                {students?.filter(s => s.final_status === 'Complete').length || 0}
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
                {students?.filter(s => s.final_status === 'Pass').length || 0}
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
                {students?.filter(s => s.final_status === 'Pending').length || 0}
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
                {students?.filter(s => s.final_status === 'Fail').length || 0}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Style</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WPM</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Curriculum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => {
                const suggestion = getStatusSuggestion(student)
                const attendanceRate = getAttendanceRate(student.id)
                
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <Badge variant={student.typing_style === 'Homerow' ? 'success' : 'warning'}>
                        {student.typing_style || 'Not set'}
                      </Badge>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <span className="font-medium">{attendanceRate}%</span>
                        <span className="text-gray-500 text-xs block">
                          {attendanceSummaries[student.id]?.totalPresent || 0}P / 
                          {attendanceSummaries[student.id]?.totalLate || 0}L / 
                          {attendanceSummaries[student.id]?.totalAbsent || 0}A
                        </span>
                      </div>
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
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Complete">Complete</SelectItem>
                        <SelectItem value="Pass">Pass</SelectItem>
                        <SelectItem value="Fail">Fail</SelectItem>
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
