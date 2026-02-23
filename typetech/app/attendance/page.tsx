'use client'

import { useState, useEffect } from 'react'
import { useStudents } from '@/hooks/useStudents'
import { CohortSelector } from '@/components/cohorts/CohortSelector'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select, SelectItem } from '@/components/ui/Select'
import { ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react'
import { AttendanceStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AttendancePage() {
  const [currentWeek, setCurrentWeek] = useState(1)
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({})
  const [saving, setSaving] = useState(false)
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  
  const { students, loading: studentsLoading } = useStudents()

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

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }))
  }

  const handleSave = async () => {
    if (!filteredStudents) return
    
    setSaving(true)
    try {
      const promises = filteredStudents.map(async (student) => {
        const status = attendanceData[student.id] || 'Present'
        
        // Check if record exists
        const { data: existing } = await supabase
          .from('attendance')
          .select('id')
          .eq('student_id', student.id)
          .eq('week_number', currentWeek)
          .single()

        if (existing) {
          // Update
          return supabase
            .from('attendance')
            .update({ status })
            .eq('id', existing.id)
        } else {
          // Insert
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
    } catch (error) {
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const getAttendanceSummary = () => {
    if (!filteredStudents) return { present: 0, late: 0, absent: 0, total: 0 }
    
    const summary = filteredStudents.reduce((acc, student) => {
      const status = attendanceData[student.id] || 'Present'
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
          <Button onClick={handleSave} disabled={saving}>
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
                  Current Style
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
                    {student.typing_style && (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        student.typing_style === 'Homerow' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {student.typing_style}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select
                      value={attendanceData[student.id] || 'Present'}
                      onValueChange={(value) => handleStatusChange(student.id, value as AttendanceStatus)}
                    >
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

      {/* Progress Note */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-blue-800">Weekly Attendance Tracking</h3>
            <p className="text-sm text-blue-700">
              Tracking {filteredStudents?.length || 0} students for Week {currentWeek}. 
              Use the cohort filter to focus on specific groups.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
