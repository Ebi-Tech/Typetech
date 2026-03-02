'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStudents } from '@/hooks/useStudents'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Users, Award, Clock} from 'lucide-react'
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

interface Cohort {
  id: string
  name: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const { students, loading: studentsLoading } = useStudents()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [router])

  useEffect(() => {
    supabase.from('cohorts').select('*').order('name').then(({ data }) => {
      setCohorts(data || [])
    })
  }, [])

  if (isLoading || studentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  const totalStudents = students?.length || 0
  const complete = students?.filter(s => s.final_status === 'Complete').length || 0
  const pass = students?.filter(s => s.final_status === 'Pass').length || 0
  const fail = students?.filter(s => s.final_status === 'Fail').length || 0
  const pending = students?.filter(s => !s.final_status || s.final_status === 'Pending').length || 0
  const homerow = students?.filter(s => s.typing_style === 'Homerow').length || 0

  const statusData = [
    { name: 'Complete', value: complete, color: '#22c55e' },
    { name: 'Pass', value: pass, color: '#eab308' },
    { name: 'Fail', value: fail, color: '#ef4444' },
    { name: 'Pending', value: pending, color: '#6b7280' },
  ].filter(item => item.value > 0)

  const styleData = [
    { name: 'Homerow', value: homerow, color: '#3b82f6' },
    { name: 'Hunting', value: totalStudents - homerow, color: '#f97316' },
  ]

  const stats = [
    { title: 'Total Students', value: totalStudents, icon: Users, color: 'bg-blue-500' },
    { title: 'Complete', value: complete, icon: Award, color: 'bg-green-500' },
    { title: 'Pass', value: pass, icon: Award, color: 'bg-yellow-500' },
    { title: 'Pending Review', value: pending, icon: Clock, color: 'bg-purple-500' },
  ]

  // Build cohort summary from students data
  const cohortSummary = cohorts.map(cohort => {
    const cs = students?.filter(s => s.cohort_id === cohort.id) || []
    return {
      name: cohort.name,
      total: cs.length,
      complete: cs.filter(s => s.final_status === 'Complete').length,
      pass: cs.filter(s => s.final_status === 'Pass').length,
      fail: cs.filter(s => s.final_status === 'Fail').length,
      pending: cs.filter(s => !s.final_status || s.final_status === 'Pending').length,
    }
  })

  const unassigned = students?.filter(s => !s.cohort_id) || []
  if (unassigned.length > 0) {
    cohortSummary.push({
      name: 'No Cohort',
      total: unassigned.length,
      complete: unassigned.filter(s => s.final_status === 'Complete').length,
      pass: unassigned.filter(s => s.final_status === 'Pass').length,
      fail: unassigned.filter(s => s.final_status === 'Fail').length,
      pending: unassigned.filter(s => !s.final_status || s.final_status === 'Pending').length,
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat cards */}
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

      {/* Cohort Summary */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Cohort Summary</h2>
        {cohortSummary.length === 0 ? (
          <p className="text-sm text-gray-500">No cohorts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Cohort</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Total</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Complete</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Pass</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Fail</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cohortSummary.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-center">{row.total}</td>
                    <td className="px-4 py-3 text-center">
                      {row.complete > 0 ? <Badge variant="success">{row.complete}</Badge> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.pass > 0 ? <Badge variant="warning">{row.pass}</Badge> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.fail > 0 ? <Badge variant="destructive">{row.fail}</Badge> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.pending > 0 ? <Badge variant="secondary">{row.pending}</Badge> : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
