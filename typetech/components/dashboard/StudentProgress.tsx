'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Student } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Search } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface Cohort {
  id: string
  name: string
}

interface Props {
  students: Student[]
  cohorts: Cohort[]
}

interface WeekRecord {
  typing_style: string | null
  grade: string | null
}

interface TooltipPayload {
  payload: {
    attendance: string | null
    typingStyle: string | null
    grade: string | null
    attValue: number
    styleValue: number | null
  }
}

const WEEKS = Array.from({ length: 11 }, (_, i) => i + 1)

function AttendanceTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm space-y-1">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="text-gray-600">Attendance: <span className="font-medium text-gray-900">{d.attendance || 'Not recorded'}</span></p>
      <p className="text-gray-600">Style: <span className="font-medium text-gray-900">{d.typingStyle || 'Not recorded'}</span></p>
      <p className="text-gray-600">Grade: <span className="font-medium text-gray-900">{d.grade || 'Not recorded'}</span></p>
    </div>
  )
}

export function StudentProgress({ students, cohorts }: Props) {
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [weekData, setWeekData] = useState<Record<number, WeekRecord>>({})
  const [attendance, setAttendance] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedStudent = students.find(s => s.id === selectedId) || null

  const filteredStudents = search.trim().length > 0
    ? students
        .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 8)
    : []

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)

    Promise.all([
      supabase
        .from('week_data')
        .select('week_number, typing_style, grade')
        .eq('student_id', selectedId),
      supabase
        .from('attendance')
        .select('week_number, status')
        .eq('student_id', selectedId),
    ]).then(([{ data: wd }, { data: att }]) => {
      const wdMap: Record<number, WeekRecord> = {}
      wd?.forEach(r => { wdMap[r.week_number] = { typing_style: r.typing_style, grade: r.grade } })

      const attMap: Record<number, string> = {}
      att?.forEach(r => { attMap[r.week_number] = r.status })

      setWeekData(wdMap)
      setAttendance(attMap)
      setLoading(false)
    })
  }, [selectedId])

  const selectStudent = (s: Student) => {
    setSelectedId(s.id)
    setSearch(s.name)
    setShowDropdown(false)
  }

  const cohortName = selectedStudent?.cohort_id
    ? cohorts.find(c => c.id === selectedStudent.cohort_id)?.name ?? 'Unknown'
    : 'No Cohort'

  // First week that has a recorded typing style
  const firstStyle = WEEKS.map(w => weekData[w]?.typing_style).find(s => s != null) ?? null
  const currentStyle = selectedStudent?.typing_style ?? null

  // Attendance rate
  const present = WEEKS.filter(w => attendance[w] === 'Present').length
  const late = WEEKS.filter(w => attendance[w] === 'Late').length
  const attendanceRate = Math.round((present + late * 0.5) / 11 * 100)

  // Chart data — attValue on left axis (0-3), styleValue on right axis (0=Hunting, 1=Homerow)
  const chartData = WEEKS.map(week => {
    const att = attendance[week] ?? null
    const wd = weekData[week] ?? null
    const style = wd?.typing_style ?? null
    return {
      week: `W${week}`,
      attValue: att === 'Present' ? 3 : att === 'Late' ? 2 : att === 'Absent' ? 1 : 0,
      styleValue: style === 'Homerow' ? 1 : style === 'Hunting' ? 0 : null,
      attendance: att,
      typingStyle: style,
      grade: wd?.grade ?? null,
      fill: att === 'Present' ? '#22c55e' : att === 'Late' ? '#eab308' : att === 'Absent' ? '#ef4444' : '#e5e7eb',
    }
  })

  const styleChanged = firstStyle && currentStyle && firstStyle !== currentStyle

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Student Progress</h2>

      {/* Search */}
      <div className="relative mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a student name to search..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setSelectedId(null)
              setShowDropdown(true)
            }}
            onFocus={() => { if (search && !selectedId) setShowDropdown(true) }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            className="w-full pl-9 pr-4 h-10 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {showDropdown && filteredStudents.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
            {filteredStudents.map(s => {
              const cn = s.cohort_id ? cohorts.find(c => c.id === s.cohort_id)?.name : null
              return (
                <button
                  key={s.id}
                  onMouseDown={() => selectStudent(s)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className="text-gray-400 text-xs">{cn ?? 'No Cohort'}</span>
                </button>
              )
            })}
          </div>
        )}

        {showDropdown && search.trim().length > 0 && filteredStudents.length === 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg px-4 py-3 text-sm text-gray-500">
            No students found
          </div>
        )}
      </div>

      {/* Content */}
      {!selectedStudent && (
        <p className="text-sm text-gray-400 text-center py-8">Search and select a student to view their progress</p>
      )}

      {selectedStudent && loading && (
        <p className="text-sm text-gray-400 text-center py-8">Loading history...</p>
      )}

      {selectedStudent && !loading && (
        <div className="space-y-6">

          {/* Student header */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              {selectedStudent.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{selectedStudent.name}</p>
              <p className="text-xs text-gray-500">{cohortName}</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2 items-center">
              <Badge variant={
                selectedStudent.final_status === 'Complete' ? 'success' :
                selectedStudent.final_status === 'Pass' ? 'warning' :
                selectedStudent.final_status === 'Fail' ? 'destructive' : 'secondary'
              }>
                {selectedStudent.final_status || 'Pending'}
              </Badge>
              <span className="text-sm text-gray-500">Attendance: <span className="font-semibold text-gray-900">{attendanceRate}%</span></span>
              {selectedStudent.wpm_score && (
                <span className="text-sm text-gray-500">WPM: <span className="font-semibold text-gray-900">{selectedStudent.wpm_score}</span></span>
              )}
            </div>
          </div>

          {/* Typing style journey */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Typing Style Journey</p>
            {firstStyle ? (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Started:</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${firstStyle === 'Homerow' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {firstStyle}
                  </span>
                </div>
                {styleChanged && (
                  <>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Now:</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${currentStyle === 'Homerow' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {currentStyle}
                      </span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">✓ Progressed</span>
                  </>
                )}
                {!styleChanged && currentStyle && (
                  <span className="text-xs text-gray-500">→ Consistent throughout</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No typing style recorded yet</p>
            )}
          </div>

          {/* Attendance + Typing Style chart */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Weekly Attendance & Typing Style</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Present</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" />Late</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Absent</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" />No data</span>
              <span className="flex items-center gap-1">
                <svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#6366f1" strokeWidth="2"/><circle cx="10" cy="5" r="3" fill="#6366f1"/></svg>
                Typing style (Hunting → Homerow)
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="att" hide domain={[0, 3]} />
                  <YAxis
                    yAxisId="style"
                    orientation="right"
                    domain={[-0.3, 1.3]}
                    ticks={[0, 1]}
                    tickFormatter={v => v === 0 ? 'Hunting' : 'Homerow'}
                    tick={{ fontSize: 11, fill: '#6366f1' }}
                    width={62}
                  />
                  <Tooltip content={<AttendanceTooltip />} />
                  <Bar yAxisId="att" dataKey="attValue" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="style"
                    type="stepAfter"
                    dataKey="styleValue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Week-by-week detail */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Week-by-Week Detail</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <td className="pr-4 pb-2 font-medium">Week</td>
                    {WEEKS.map(w => <td key={w} className="text-center pb-2 min-w-[42px]">W{w}</td>)}
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr>
                    <td className="pr-4 py-1.5 text-xs text-gray-500 whitespace-nowrap">Style</td>
                    {WEEKS.map(w => {
                      const style = weekData[w]?.typing_style
                      return (
                        <td key={w} className="text-center py-1.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                            style === 'Homerow' ? 'bg-blue-100 text-blue-700' :
                            style === 'Hunting' ? 'bg-orange-100 text-orange-700' :
                            'text-gray-300'
                          }`}>
                            {style === 'Homerow' ? 'HR' : style === 'Hunting' ? 'H' : '—'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="pr-4 py-1.5 text-xs text-gray-500 whitespace-nowrap">Grade</td>
                    {WEEKS.map(w => {
                      const grade = weekData[w]?.grade
                      return (
                        <td key={w} className="text-center py-1.5">
                          {grade ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                              grade === 'Complete' ? 'bg-green-100 text-green-700' :
                              grade === 'Pass' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {grade === 'Complete' ? 'C' : grade === 'Pass' ? 'P' : 'F'}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mt-2 text-xs text-gray-400">
              <span>HR = Homerow · H = Hunting · C = Complete · P = Pass · F = Fail</span>
            </div>
          </div>

        </div>
      )}
    </Card>
  )
}
