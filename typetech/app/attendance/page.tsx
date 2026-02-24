'use client'

import { useState, useEffect } from 'react'
import { useStudents } from '@/hooks/useStudents'
import { CohortSelector } from '@/components/cohorts/CohortSelector'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select, SelectItem } from '@/components/ui/Select'
import { ChevronLeft, ChevronRight, Save, Cloud, CheckCircle2 } from 'lucide-react'
import { AttendanceStatus, FinalStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AttendancePage() {
  const [currentWeek, setCurrentWeek] = useState(1)
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({})
  const [gradeData, setGradeData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  const [cohorts, setCohorts] = useState<unknown[]>([])
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  
  const { students, loading: studentsLoading, updateStudent } = useStudents()

  // Fetch cohorts
  const fetchCohorts = async () => {
    const { data } = await supabase.from('cohorts').select('*').order('name')
    setCohorts(data || [])
  }

  useEffect(() => {
    fetchCohorts()
  }, [])

  // Filter students by cohort
  const filteredStudents = selectedCohort
    ? students?.filter(s => s.cohort_id === selectedCohort)
    : students

  // Load attendance data for current week
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!filteredStudents) return

      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('week_number', currentWeek)

      if (data) {
        const attendanceMap: Record<string, AttendanceStatus> = {}
        data.forEach(record => {
          attendanceMap[record.student_id] = record.status
        })
        setAttendanceData(attendanceMap)
      }
    }

    fetchAttendance()
  }, [currentWeek, filteredStudents])

  // Load grade data from students
  useEffect(() => {
    if (filteredStudents) {
      const gradeMap: Record<string, string> = {}
      filteredStudents.forEach(student => {
        gradeMap[student.id] = student.final_status || 'grade-placeholder'
      })
      setGradeData(gradeMap)
    }
  }, [filteredStudents])

  const saveAttendance = async (studentId: string, weekNumber: number, status: AttendanceStatus) => {
    try {
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('week_number', weekNumber)
        .single()

      if (existing) {
        await supabase
          .from('attendance')
          .update({ status })
          .eq('id', existing.id)
      } else {
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
  }

  const handleStatusChange = async (studentId: string, value: string) => {
    if (value === 'status-placeholder') return
    
    const status = value as AttendanceStatus
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }))
    
    // Show saving message
    setSyncMessage('Saving...')
    setSyncing(true)
    
    // Save to database
    const success = await saveAttendance(studentId, currentWeek, status)
    
    setSyncing(false)
    if (success) {
      setLastSync(new Date())
      setSyncMessage(null)
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
    } else {
      toast.error('Failed to save')
    }
  }

  const handleGradeChange = async (studentId: string, value: string) => {
    if (value === 'grade-placeholder') return
    
    setGradeData(prev => ({
      ...prev,
      [studentId]: value
    }))
    
    try {
      await updateStudent(studentId, { final_status: value as FinalStatus })
      toast.success('Grade updated', {
        duration: 2000,
        icon: '✓',
        style: {
          background: '#10b981',
          color: 'white',
        },
      })
    } catch (error) {
      toast.error('Failed to update grade')
    }
  }

  const handleManualSave = async () => {
    if (!filteredStudents) return
    
    setSaving(true)
    try {
      const promises = filteredStudents.map(async (student) => {
        const status = attendanceData[student.id]
        if (!status) return
        
        const { data: existing } = await supabase
          .from('attendance')
          .select('id')
          .eq('student_id', student.id)
          .eq('week_number', currentWeek)
          .single()

        if (existing) {
          return supabase
            .from('attendance')
            .update({ status })
            .eq('id', existing.id)
        } else {
          return supabase
            .from('attendance')
            .insert([{
              student_id: student.id,
              week_number: currentWeek,
              status
            }])
        }
      })

      await Promise.all(promises)
      toast.success(`Week ${currentWeek} attendance saved!`)
      setLastSync(new Date())
    } catch (error) {
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const getAttendanceSummary = () => {
    if (!filteredStudents) return { present: 0, late: 0, absent: 0, total: 0 }
    
    const summary = filteredStudents.reduce((acc, student) => {
      const status = attendanceData[student.id]
      if (status === 'Present') acc.present++
      else if (status === 'Late') acc.late++
      else if (status === 'Absent') acc.absent++
      return acc
    }, { present: 0, late: 0, absent: 0 })
    
    return { ...summary, total: filteredStudents.length }
  }

  const summary = getAttendanceSummary()

  if (studentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading attendance...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sync Status Indicator */}
      {syncing && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <Cloud size={16} className="animate-pulse" />
            <span className="text-sm font-medium">Saving...</span>
          </div>
        </div>
      )}

      {lastSync && !syncing && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span className="text-sm font-medium">All changes saved</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance Tracking</h1>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentWeek(currentWeek - 1)}
            disabled={currentWeek === 1}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="font-semibold text-lg">Week {currentWeek}</span>
          <Button
            variant="outline"
            onClick={() => setCurrentWeek(currentWeek + 1)}
          >
            <ChevronRight size={16} />
          </Button>
          <Button onClick={handleManualSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Cohort Filter */}
      <div className="flex items-center gap-4 mb-4">
        <CohortSelector 
          selectedCohort={selectedCohort}
          onCohortChange={setSelectedCohort}
          cohorts={cohorts}
          onCohortCreated={fetchCohorts}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-blue-600 font-semibold">Total</span>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">{summary.present}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-green-600 font-semibold">✓</span>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Late</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <span className="text-yellow-600 font-semibold">⏱</span>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <span className="text-red-600 font-semibold">✗</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Typing Style
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade (Pass/Fail/Complete)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents?.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-600">
                      {student.typing_style || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select
                      value={gradeData[student.id] || 'grade-placeholder'}
                      onValueChange={(value) => handleGradeChange(student.id, value)}
                    >
                      <SelectItem value="grade-placeholder">Select grade</SelectItem>
                      <SelectItem value="Pass">Pass</SelectItem>
                      <SelectItem value="Fail">Fail</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                    </Select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select
                      value={attendanceData[student.id] || 'status-placeholder'}
                      onValueChange={(value) => handleStatusChange(student.id, value)}
                    >
                      <SelectItem value="status-placeholder">Select status</SelectItem>
                      <SelectItem value="Present">Present</SelectItem>
                      <SelectItem value="Late">Late</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info Note */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Cloud className="text-blue-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-blue-800">Auto-Save Enabled</h3>
            <p className="text-sm text-blue-700">
              Changes are saved automatically. The Save All button is available for manual backup.
              Tracking {filteredStudents?.length || 0} students for Week {currentWeek}.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
