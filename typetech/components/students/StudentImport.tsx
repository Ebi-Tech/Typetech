'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Select, SelectItem } from '@/components/ui/Select'
import { useStudents } from '@/hooks/useStudents'
import { Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Cohort {
  id: string
  name: string
}

export function StudentImport() {
  const [pastedData, setPastedData] = useState('')
  const [parsedStudents, setParsedStudents] = useState<Array<{ name: string; email: string }>>([])
  const [selectedCohort, setSelectedCohort] = useState<string>('')
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const { importStudents, loading } = useStudents()

  useEffect(() => {
    fetchCohorts()
  }, [])

  const fetchCohorts = async () => {
    const { data } = await supabase
      .from('cohorts')
      .select('id, name')
      .order('name')
    setCohorts(data || [])
  }

  const parsePastedData = () => {
    try {
      const lines = pastedData.trim().split('\n')
      const students = lines
        .map(line => {
          // Handle tab-separated or comma-separated
          const parts = line.includes('\t') ? line.split('\t') : line.split(',')
          if (parts.length >= 2) {
            return {
              name: parts[0].trim(),
              email: parts[1].trim()
            }
          }
          return null
        })
        .filter((s): s is { name: string; email: string } => s !== null)

      if (students.length === 0) {
        toast.error('No valid data found. Make sure each line has name and email.')
        return
      }

      setParsedStudents(students)
      toast.success(`Parsed ${students.length} students`)
    } catch (err) {
      toast.error('Failed to parse data')
    }
  }

  const handleImport = async () => {
    if (parsedStudents.length === 0) return
    
    const names = parsedStudents.map(s => s.name)
    const emails = parsedStudents.map(s => s.email)
    
    await importStudents(names, emails, selectedCohort || undefined)
    setPastedData('')
    setParsedStudents([])
    setSelectedCohort('')
  }

  const clearAll = () => {
    setPastedData('')
    setParsedStudents([])
    setSelectedCohort('')
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Import Students</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Cohort
          </label>
          <Select
            value={selectedCohort}
            onValueChange={setSelectedCohort}
          >
            <SelectItem value="">No Cohort</SelectItem>
            {cohorts.map((cohort) => (
              <SelectItem key={cohort.id} value={cohort.id}>
                {cohort.name}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste from Google Sheets (Name and Email columns)
          </label>
          <textarea
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="John Smith	john@email.com&#10;Jane Doe	jane@email.com&#10;Bob Wilson	bob@email.com"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={parsePastedData} variant="outline">
            <Upload size={16} className="mr-2" />
            Parse Data
          </Button>
          {pastedData && (
            <Button onClick={clearAll} variant="ghost">
              <X size={16} className="mr-2" />
              Clear
            </Button>
          )}
        </div>

        {parsedStudents.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parsedStudents.slice(0, 5).map((student, index) => (
                  <tr key={index}>
                    <td className="px-6 py-2 text-sm">{student.name}</td>
                    <td className="px-6 py-2 text-sm">{student.email}</td>
                  </tr>
                ))}
                {parsedStudents.length > 5 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-2 text-sm text-gray-500">
                      ...and {parsedStudents.length - 5} more
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            <div className="p-4 bg-gray-50 border-t">
              <Button onClick={handleImport} disabled={loading || !selectedCohort}>
                Import {parsedStudents.length} Students to {cohorts.find(c => c.id === selectedCohort)?.name || 'cohort'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
