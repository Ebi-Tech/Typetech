'use client'

import { useState, useEffect } from 'react'
import { useStudents } from '@/hooks/useStudents'
import { CohortSelector } from '@/components/cohorts/CohortSelector'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select, SelectItem } from '@/components/ui/Select'
import { ChevronLeft, ChevronRight, Save, Cloud, CheckCircle2 } from 'lucide-react'
import { AttendanceStatus, TypingStyle } from '@/types/database'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface WeekData {
  student_id: string
  typing_style?: string
  grade?: string
}

export default function AttendancePage() {
  const [currentWeek, setCurrentWeek] = useState(1)
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({})
  const [typingStyleData, setTypingStyleData] = useState<Record<string, string>>({})
  const [gradeData, setGradeData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  const [cohorts, setCohorts] = useState<any[]>([])
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  
  const { students, loading: studentsLoading } = useStudents()

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

  // Load ALL week-specific data for current week
  useEffect(() => {
    const fetchWeekData = async () => {
      if (!filteredStudents || filteredStudents.length === 0) return

      // Fetch attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('week_number', currentWeek)

      if (attendance) {
        const attendanceMap: Record<string, AttendanceStatus> = {}
        attendance.forEach(record => {
          attendanceMap[record.student_id] = record.status
        })
        setAttendanceData(attendanceMap)
      }

      // Fetch week-specific data (typing style and grade)
      const { data: weekData } = await supabase
        .from('week_data')
        .select('*')
        .eq('week_number', currentWeek)

      if (weekData) {
        const typingMap: Record<string, string> = {}
        const gradeMap: Record<string, string> = {}
        
        weekData.forEach(record => {
          if (record.typing_style) typingMap[record.student_id] = record.typing_style
          if (record.grade) gradeMap[record.student_id] = record.grade
        })
        
        setTypingStyleData(typingMap)
        setGradeData(gradeMap)
      }
    }

    fetchWeekData()
  }, [currentWeek, filteredStudents])

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

  const saveWeekData = async (
    studentId: string, 
    weekNumber: number, 
    updates: { typing_style?: string; grade?: string }
  ) => {
    try {
      const { data: existing } = await supabase
        .from('week_data')
        .select('id')
        .eq('student_id', studentId)
        .eq('week_number', weekNumber)
        .single()

      if (existing) {
        await supabase
          .from('week_data')
          .update(updates)
          .eq('id', existing.id)
      } else {
        await supabase
          .from('week_data')
          .insert([{
            student_id: studentId,
            week_number: weekNumber,
            ...updates
          }])
      }
      return true
    } catch (error) {
      console.error('Auto-save failed:', error)
      return false
    }
  }

  const handleStatusChange = async (studentId: string, value: string) => {
    if (value === 'blank-status') return
    
    const status = value as AttendanceStatus
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }))
    
    setSyncMessage('Saving...')
    setSyncing(true)
    
    const success = await saveAttendance(studentId, currentWeek, status)
    
    setSyncing(false)
    if (success) {
      setLastSync(new Date())
      setSyncMessage(null)
      toast.success('✓ Attendance saved', {
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
  }

  const handleTypingStyleChange = async (studentId: string, value: string) => {
    if (value === 'blank-style') return
    
    setTypingStyleData(prev => ({
      ...prev,
      [studentId]: value
    }))
    
    setSyncMessage('Saving...')
    setSyncing(true)
    
    const success = await saveWeekData(studentId, currentWeek, { typing_style: value })
    
    setSyncing(false)
    if (success) {
      setLastSync(new Date())
      setSyncMessage(null)
      toast.success('✓ Typing style saved', {
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
  }

  const handleGradeChange = async (studentId: string, value: string) => {
    if (value === 'blank-grade') return
    
    setGradeData(prev => ({
      ...prev,
      [studentId]: value
    }))
    
    setSyncMessage('Saving...')
    setSyncing(true)
    
    const success = await saveWeekData(studentId, currentWeek, { grade: value })
    
    setSyncing(false)
    if (success) {
      setLastSync(new Date())
      setSyncMessage(null)
      toast.success('✓ Grade saved', {
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
  }

  const handleManualSave = async () => {
    if (!filteredStudents) return
    
    setSaving(true)
    try {
      const promises = filteredStudents.map(async (student) => {
        const saves = []
        
        // Save attendance
        const status = attendanceData[student.id]
        if (status) {
          saves.push(saveAttendance(student.id, currentWeek, status))
        }
        
        // Save week data
        const typingStyle = typingStyleData[student.id]
        const grade = gradeData[student.id]
        if (typingStyle || grade) {
          saves.push(saveWeekData(student.id, currentWeek, { 
            typing_style: typingStyle, 
            grade 
          }))
        }
        
        return Promise.all(saves)
      })

      await Promise.all(promises)
      toast.success(`Week ${currentWeek} data saved!`)
      setLastSync(new Date())
    } catch (error) {
      toast.error('Failed to save')
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
            {saving ? 'Saving...' : 'Save Week'}
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

      {/* Info Banner */}
      <Card className="p-3 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700">
          <span className="font-semibold">Week {currentWeek}:</span> All fields are week-specific. 
          Changes here won't affect other weeks.
        </p>
      </Card>

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
                  <span className="block text-xs font-normal text-gray-400">(Week {currentWeek})</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                  <span className="block text-xs font-normal text-gray-400">(Week {currentWeek})</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
                  <span className="block text-xs font-normal text-gray-400">(Week {currentWeek})</span>
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
                    <Select
                      value={typingStyleData[student.id] || 'blank-style'}
                      onValueChange={(value) => {
                        if (value !== 'blank-style') {
                          handleTypingStyleChange(student.id, value)
                        }
                      }}
                    >
                      <SelectItem value="blank-style">—</SelectItem>
                      <SelectItem value="Hunting">Hunting</SelectItem>
                      <SelectItem value="Homerow">Homerow</SelectItem>
                    </Select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select
                      value={gradeData[student.id] || 'blank-grade'}
                      onValueChange={(value) => {
                        if (value !== 'blank-grade') {
                          handleGradeChange(student.id, value)
                        }
                      }}
                    >
                      <SelectItem value="blank-grade">—</SelectItem>
                      <SelectItem value="Pass">Pass</SelectItem>
                      <SelectItem value="Fail">Fail</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                    </Select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select
                      value={attendanceData[student.id] || 'blank-status'}
                      onValueChange={(value) => {
                        if (value !== 'blank-status') {
                          handleStatusChange(student.id, value)
                        }
                      }}
                    >
                      <SelectItem value="blank-status">—</SelectItem>
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
    </div>
  )
}
