'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Select, SelectItem } from '@/components/ui/Select'
import { useStudents } from '@/hooks/useStudents'
import { Upload, X, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Cohort {
  id: string
  name: string
}

export function StudentImport({ onSuccess, onRefresh }: { onSuccess?: () => void; onRefresh?: () => void }) {
  const [pastedData, setPastedData] = useState('')
  const [parsedStudents, setParsedStudents] = useState<Array<{ name: string; email: string }>>([])
  const [selectedCohort, setSelectedCohort] = useState<string>('cohort-placeholder')
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [skippedStudents, setSkippedStudents] = useState<Array<{ name: string; email: string }>>([])
  const [isCreatingCohort, setIsCreatingCohort] = useState(false)
  const [newCohortName, setNewCohortName] = useState('')
  const { importStudents, loading } = useStudents()

  const refreshCohorts = () => {
    supabase.from('cohorts').select('id, name').then(({ data }) => {
      const sorted = (data || []).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
      setCohorts(sorted)
    })
  }

  useEffect(() => {
    refreshCohorts()
  }, [])

  const handleCreateCohort = async () => {
    if (!newCohortName.trim()) {
      toast.error('Cohort name is required')
      return
    }
    const duplicate = cohorts.some(
      c => c.name.toLowerCase() === newCohortName.trim().toLowerCase()
    )
    if (duplicate) {
      toast.error('A cohort with that name already exists')
      return
    }
    const { data, error } = await supabase
      .from('cohorts')
      .insert([{ name: newCohortName.trim() }])
      .select()
      .single()
    if (error) {
      toast.error('Failed to create cohort')
      return
    }
    toast.success('Cohort created')
    setNewCohortName('')
    setIsCreatingCohort(false)
    refreshCohorts()
    setSelectedCohort(data.id)
    onRefresh?.() // Let parent know a new cohort exists
  }

  const parsePastedData = () => {
    try {
      const lines = pastedData.trim().split('\n')
      const students = lines
        .map(line => {
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
    if (parsedStudents.length === 0) {
      toast.error('No students to import')
      return
    }

    if (!selectedCohort || selectedCohort === 'cohort-placeholder') {
      toast.error('Please select a cohort before importing')
      return
    }
    
    const names = parsedStudents.map(s => s.name)
    const emails = parsedStudents.map(s => s.email)

    const result = await importStudents(names, emails, selectedCohort)
    setSkippedStudents(result?.skipped ?? [])
    setPastedData('')
    setParsedStudents([])
    setSelectedCohort('cohort-placeholder')
    onRefresh?.() // Always refresh parent data (students + cohorts)
    if ((result?.skipped ?? []).length === 0) onSuccess?.() // Close dialog only when fully clean
  }

  const clearAll = () => {
    setPastedData('')
    setParsedStudents([])
    setSelectedCohort('cohort-placeholder')
    setSkippedStudents([])
  }

  const isImportDisabled = !selectedCohort || selectedCohort === 'cohort-placeholder' || parsedStudents.length === 0

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Import Students</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Cohort <span className="text-red-500">*</span>
          </label>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Select
                value={selectedCohort}
                onValueChange={setSelectedCohort}
              >
                <SelectItem value="cohort-placeholder">Select a cohort</SelectItem>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </SelectItem>
                ))}
              </Select>
              {(!selectedCohort || selectedCohort === 'cohort-placeholder') && (
                <p className="text-xs text-red-500 mt-1">Cohort is required</p>
              )}
            </div>
            {!isCreatingCohort ? (
              <Button variant="outline" size="sm" onClick={() => setIsCreatingCohort(true)} className="shrink-0 mt-0.5">
                <Plus size={14} className="mr-1" />
                New Cohort
              </Button>
            ) : (
              <div className="flex gap-1.5 shrink-0 mt-0.5">
                <input
                  type="text"
                  value={newCohortName}
                  onChange={e => setNewCohortName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateCohort(); if (e.key === 'Escape') setIsCreatingCohort(false) }}
                  placeholder="Cohort name"
                  autoFocus
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button size="sm" onClick={handleCreateCohort}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsCreatingCohort(false); setNewCohortName('') }}>
                  <X size={14} />
                </Button>
              </div>
            )}
          </div>
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
          <Button onClick={parsePastedData} variant="outline" disabled={!pastedData}>
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
              <Button 
                onClick={handleImport} 
                disabled={loading || isImportDisabled}
                className={isImportDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              >
                Import {parsedStudents.length} Students
              </Button>
              {isImportDisabled && (
                <p className="text-xs text-red-500 mt-2">Select a cohort to enable import</p>
              )}
            </div>
          </div>
        )}

        {skippedStudents.length > 0 && (
          <div className="border border-yellow-300 rounded-lg overflow-hidden bg-yellow-50">
            <div className="px-4 py-3 border-b border-yellow-300">
              <p className="text-sm font-semibold text-yellow-800">
                {skippedStudents.length} student{skippedStudents.length > 1 ? 's' : ''} skipped — already assigned to a different cohort
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">These were not moved. To reassign them, edit each student individually in the Students page.</p>
            </div>
            <table className="min-w-full divide-y divide-yellow-200">
              <thead className="bg-yellow-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-yellow-700 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-yellow-700 uppercase">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-200">
                {skippedStudents.map((s, i) => (
                  <tr key={i} className="bg-yellow-50">
                    <td className="px-4 py-2 text-sm text-yellow-900">{s.name}</td>
                    <td className="px-4 py-2 text-sm text-yellow-900 font-mono">{s.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-yellow-300">
              <button
                onClick={() => setSkippedStudents([])}
                className="text-xs text-yellow-700 hover:text-yellow-900 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
