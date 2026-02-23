'use client'

import { useStudents } from '@/hooks/useStudents'
import { useAttendance } from '@/hooks/useAttendance'
import { Card } from '@/components/ui/Card'
import { Users, Award, Clock, Target } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

export default function DashboardPage() {
  const { students, loading } = useStudents()
  const { getAttendanceSummary } = useAttendance(1) // Current week

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  // Calculate stats
  const totalStudents = students.length
  const complete = students.filter(s => s.final_status === 'Complete').length
  const pass = students.filter(s => s.final_status === 'Pass').length
  const fail = students.filter(s => s.final_status === 'Fail').length
  const pending = students.filter(s => s.final_status === 'Pending').length
  const homerow = students.filter(s => s.typing_style === 'Homerow').length
  const hunting = students.filter(s => s.typing_style === 'Hunting').length

  // Status distribution for pie chart
  const statusData = [
    { name: 'Complete', value: complete, color: '#22c55e' },
    { name: 'Pass', value: pass, color: '#eab308' },
    { name: 'Fail', value: fail, color: '#ef4444' },
    { name: 'Pending', value: pending, color: '#6b7280' },
  ].filter(item => item.value > 0)

  // Style distribution for bar chart
  const styleData = [
    { name: 'Homerow', value: homerow, color: '#3b82f6' },
    { name: 'Hunting', value: hunting, color: '#f97316' },
  ]

  const stats = [
    { title: 'Total Students', value: totalStudents, icon: Users, color: 'bg-blue-500' },
    { title: 'Complete', value: complete, icon: Award, color: 'bg-green-500' },
    { title: 'Pass', value: pass, icon: Award, color: 'bg-yellow-500' },
    { title: 'Pending Review', value: pending, icon: Clock, color: 'bg-purple-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-full text-white`}>
                <stat.icon size={24} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Status Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Typing Style Bar Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Typing Style Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={styleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {styleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Students */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Students</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Email</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Style</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">WPM</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.slice(0, 5).map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-2">{student.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{student.email}</td>
                  <td className="px-4 py-2">
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
                  <td className="px-4 py-2">{student.wpm_score || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      student.final_status === 'Complete' ? 'bg-green-100 text-green-800' :
                      student.final_status === 'Pass' ? 'bg-yellow-100 text-yellow-800' :
                      student.final_status === 'Fail' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {student.final_status}
                    </span>
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
