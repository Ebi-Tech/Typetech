'use client'

import { useState, useEffect, useMemo } from 'react'
import { useStudents } from '@/hooks/useStudents'
import { CohortSelector } from '@/components/cohorts/CohortSelector'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select, SelectItem } from '@/components/ui/Select'
import { ChevronLeft, ChevronRight, Save, Cloud, CheckCircle2, Download, Search, X, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { AttendanceStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Cohort {
  id: string
  name: string
}


export default function AttendancePage() {
  const [currentWeek, setCurrentWeek] = useState(1)
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({})
  const [typingStyleData, setTypingStyleData] = useState<Record<string, string>>({})
  const [gradeData, setGradeData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { students, loading: studentsLoading } = useStudents()

  const naturalSort = (arr: { id: string; name: string }[]) =>
    arr.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

  // Fetch cohorts
  const fetchCohorts = async () => {
    const { data } = await supabase.from('cohorts').select('*')
    setCohorts(naturalSort(data || []))
  }

  useEffect(() => {
    supabase.from('cohorts').select('*').then(({ data }) => {
      setCohorts(naturalSort(data || []))
    })
  }, [])

  // Filter students by cohort — memoized so the reference only changes when
  // students or selectedCohort actually change, preventing the fetch useEffect
  // from looping (new array reference on every render was re-triggering it)
  const filteredStudents = useMemo(
    () => selectedCohort ? students?.filter(s => s.cohort_id === selectedCohort) : students,
    [students, selectedCohort]
  )

  // Further filter by search query for table display only (summary cards use filteredStudents)
  const displayedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return filteredStudents
    return filteredStudents?.filter(s => s.name.toLowerCase().includes(q))
  }, [filteredStudents, searchQuery])

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

  const autoSaveToast = (label: string) => toast.success(`✓ ${label} saved`, {
    duration: 2000,
    position: 'top-center',
    style: { background: '#10b981', color: 'white', fontSize: '14px', padding: '8px 16px' },
  })

  const handleStatusChange = async (studentId: string, value: string) => {
    setSyncing(true)
    if (value === 'blank-status') {
      setAttendanceData(prev => { const next = { ...prev }; delete next[studentId]; return next })
      await supabase.from('attendance').delete().eq('student_id', studentId).eq('week_number', currentWeek)
    } else {
      const status = value as AttendanceStatus
      setAttendanceData(prev => ({ ...prev, [studentId]: status }))
      await saveAttendance(studentId, currentWeek, status)
    }
    setSyncing(false)
    setLastSync(new Date())
    autoSaveToast('Attendance')
  }

  const handleTypingStyleChange = async (studentId: string, value: string) => {
    setSyncing(true)
    if (value === 'blank-style') {
      setTypingStyleData(prev => { const next = { ...prev }; delete next[studentId]; return next })
      await Promise.all([
        supabase.from('week_data').update({ typing_style: null }).eq('student_id', studentId).eq('week_number', currentWeek),
        supabase.from('students').update({ typing_style: null }).eq('id', studentId),
      ])
    } else {
      setTypingStyleData(prev => ({ ...prev, [studentId]: value }))
      await Promise.all([
        saveWeekData(studentId, currentWeek, { typing_style: value }),
        supabase.from('students').update({ typing_style: value }).eq('id', studentId),
      ])
    }
    setSyncing(false)
    setLastSync(new Date())
    autoSaveToast('Typing style')
  }

  const handleGradeChange = async (studentId: string, value: string) => {
    setSyncing(true)
    if (value === 'blank-grade') {
      setGradeData(prev => { const next = { ...prev }; delete next[studentId]; return next })
      await Promise.all([
        supabase.from('week_data').update({ grade: null }).eq('student_id', studentId).eq('week_number', currentWeek),
        supabase.from('students').update({ final_status: null }).eq('id', studentId),
      ])
    } else {
      setGradeData(prev => ({ ...prev, [studentId]: value }))
      await Promise.all([
        saveWeekData(studentId, currentWeek, { grade: value }),
        supabase.from('students').update({ final_status: value }).eq('id', studentId),
      ])
    }
    setSyncing(false)
    setLastSync(new Date())
    autoSaveToast('Grade')
  }

  const handleClearWeek = async () => {
    if (!filteredStudents || filteredStudents.length === 0) return
    setClearing(true)
    try {
      const studentIds = filteredStudents.map(s => s.id)
      await Promise.all([
        supabase.from('attendance').delete().eq('week_number', currentWeek).in('student_id', studentIds),
        supabase.from('week_data').delete().eq('week_number', currentWeek).in('student_id', studentIds),
      ])
      setAttendanceData({})
      setTypingStyleData({})
      setGradeData({})
      setShowClearDialog(false)
      toast.success(`Week ${currentWeek} data cleared.`)
    } catch {
      toast.error('Failed to clear week data')
    } finally {
      setClearing(false)
    }
  }

  const handleExport = async () => {
    try {
      // Fetch all students
      const { data: allStudents } = await supabase
        .from('students')
        .select('*')
        .order('name')

      if (!allStudents || allStudents.length === 0) {
        toast.error('No students to export')
        return
      }

      // Fetch all attendance records across all weeks
      const { data: allAttendance } = await supabase
        .from('attendance')
        .select('*')

      // Find all unique weeks that have recorded data
      const weeks = [...new Set(allAttendance?.map(a => a.week_number) || [])].sort((a, b) => a - b)

      // Build map: student_id -> week -> status
      const attendanceMap: Record<string, Record<number, string>> = {}
      allAttendance?.forEach(record => {
        if (!attendanceMap[record.student_id]) attendanceMap[record.student_id] = {}
        attendanceMap[record.student_id][record.week_number] = record.status
      })

      // Build CSV headers and rows
      const headers = [
        'Name', 'Email', 'Cohort',
        ...weeks.map(w => `Week ${w} Attendance`),
        'Typing Style', 'Final Status'
      ]

      const rows = allStudents.map(student => {
        const cohortName = cohorts.find(c => c.id === student.cohort_id)?.name || '—'
        const weekCols = weeks.map(w => attendanceMap[student.id]?.[w] || '—')
        return [
          student.name,
          student.email || '—',
          cohortName,
          ...weekCols,
          student.typing_style || '—',
          student.final_status || '—'
        ]
      })

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `typetech_attendance_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
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

        // Sync to students table so dashboard/certificates reflect changes
        const studentUpdates: Record<string, string> = {}
        if (grade) studentUpdates.final_status = grade
        if (typingStyle) studentUpdates.typing_style = typingStyle
        if (Object.keys(studentUpdates).length > 0) {
          saves.push(supabase.from('students').update(studentUpdates).eq('id', student.id))
        }

        return Promise.all(saves)
      })

      await Promise.all(promises)
      toast.success(`Week ${currentWeek} data saved!`)
      setLastSync(new Date())
    } catch {
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Attendance Tracking</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCurrentWeek(currentWeek - 1)} disabled={currentWeek === 1}>
              <ChevronLeft size={16} />
            </Button>
            <select
              value={currentWeek}
              onChange={(e) => setCurrentWeek(Number(e.target.value))}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Week {i + 1}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={() => setCurrentWeek(currentWeek + 1)} disabled={currentWeek === 11}>
              <ChevronRight size={16} />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={16} className="mr-1.5" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => setShowClearDialog(true)}
          >
            <Trash2 size={16} className="mr-1.5" />
            Clear Week
          </Button>
          <Button size="sm" onClick={handleManualSave} disabled={saving}>
            <Save size={16} className="mr-1.5" />
            {saving ? 'Saving…' : 'Save Week'}
          </Button>
        </div>
      </div>

      {/* Cohort Filter + Search */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <CohortSelector
          selectedCohort={selectedCohort}
          onCohortChange={setSelectedCohort}
          cohorts={cohorts}
          onCohortCreated={fetchCohorts}
        />
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 h-10 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Summary — compact bar on mobile, full cards on desktop */}
      <div className="md:hidden flex items-center gap-3 flex-wrap bg-white border rounded-lg px-4 py-2.5 text-sm">
        <span className="text-gray-500 font-medium">Week {currentWeek}</span>
        <span className="text-gray-700">{summary.total} students</span>
        <span className="text-green-600 font-medium">✓ {summary.present} present</span>
        <span className="text-yellow-600 font-medium">⏱ {summary.late} late</span>
        <span className="text-red-600 font-medium">✗ {summary.absent} absent</span>
      </div>
      <div className="hidden md:grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-blue-600 font-semibold text-sm">Total</span>
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
          Changes here won&apos;t affect other weeks.
        </p>
      </Card>

      {/* Attendance Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Style
                  <span className="hidden md:block text-xs font-normal text-gray-400 normal-case">Typing (Wk {currentWeek})</span>
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                  <span className="hidden md:block text-xs font-normal text-gray-400 normal-case">(Wk {currentWeek})</span>
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
                  <span className="hidden md:block text-xs font-normal text-gray-400 normal-case">(Wk {currentWeek})</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedStudents?.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap font-medium text-sm md:text-base">
                    {student.name}
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.email}
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <Select
                      value={typingStyleData[student.id] || 'blank-style'}
                      onValueChange={(value) => handleTypingStyleChange(student.id, value)}
                    >
                      <SelectItem value="blank-style">—</SelectItem>
                      <SelectItem value="Hunting">Hunting</SelectItem>
                      <SelectItem value="Homerow">Homerow</SelectItem>
                    </Select>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <Select
                      value={gradeData[student.id] || 'blank-grade'}
                      onValueChange={(value) => handleGradeChange(student.id, value)}
                    >
                      <SelectItem value="blank-grade">—</SelectItem>
                      <SelectItem value="Pass">Pass</SelectItem>
                      <SelectItem value="Fail">Fail</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                    </Select>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <Select
                      value={attendanceData[student.id] || 'blank-status'}
                      onValueChange={(value) => handleStatusChange(student.id, value)}
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

      {/* Clear Week Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-700">Clear Week {currentWeek} data?</DialogTitle>
            <DialogDescription>
              This will permanently delete all attendance, typing style, and grade entries for{' '}
              <strong>Week {currentWeek}</strong>
              {selectedCohort ? ` (${cohorts.find(c => c.id === selectedCohort)?.name})` : ' (all cohorts)'}.
              Other weeks are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancel</Button>
            <Button variant="destructive" disabled={clearing} onClick={handleClearWeek}>
              {clearing ? 'Clearing…' : 'Clear Week'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
