'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Select, SelectItem } from '@/components/ui/Select'
import { useStudents } from '@/hooks/useStudents'
import { Upload, X, Plus, AlertTriangle, ArrowRight, UserPlus, SkipForward } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Cohort {
  id: string
  name: string
}

interface ConflictStudent {
  name: string
  email: string
  currentCohortName: string
}

type ConflictAction = 'move' | 'add' | 'skip'

const CONFLICT_OPTIONS: {
  value: ConflictAction
  label: string
  description: (targetName: string) => string
  icon: React.ReactNode
  color: string
} [] = [
  {
    value: 'move',
    label: 'Move to this cohort',
    description: (target) => `Reassign them from their current cohort to "${target}". Their existing records stay intact.`,
    icon: <ArrowRight size={16} />,
    color: 'blue',
  },
  {
    value: 'add',
    label: 'Add as new student',
    description: () => 'Create a fresh record in this cohort alongside their existing one.',
    icon: <UserPlus size={16} />,
    color: 'green',
  },
  {
    value: 'skip',
    label: 'Skip these students',
    description: () => 'Leave them where they are. Only the others will be imported.',
    icon: <SkipForward size={16} />,
    color: 'gray',
  },
]

export function StudentImport({ onSuccess, onRefresh }: { onSuccess?: () => void; onRefresh?: () => void }) {
  const [pastedData, setPastedData] = useState('')
  const [parsedStudents, setParsedStudents] = useState<Array<{ name: string; email: string }>>([])
  const [selectedCohort, setSelectedCohort] = useState<string>('cohort-placeholder')
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [skippedStudents, setSkippedStudents] = useState<Array<{ name: string; email: string }>>([])
  const [isCreatingCohort, setIsCreatingCohort] = useState(false)
  const [newCohortName, setNewCohortName] = useState('')

  // Conflict resolution
  const [conflicts, setConflicts] = useState<ConflictStudent[]>([])
  const [conflictAction, setConflictAction] = useState<ConflictAction>('move')
  const [showConflictStep, setShowConflictStep] = useState(false)
  const [checkingConflicts, setCheckingConflicts] = useState(false)

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
    onRefresh?.()
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
      setShowConflictStep(false)
      setConflicts([])
      toast.success(`Parsed ${students.length} students`)
    } catch {
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

    // Detect conflicts before proceeding
    setCheckingConflicts(true)
    try {
      const emails = parsedStudents.map(s => s.email)
      const { data: existing } = await supabase
        .from('students')
        .select('id, email, cohort_id')
        .in('email', emails)

      const existingMap = new Map((existing || []).map(r => [r.email, r]))
      const conflictList: ConflictStudent[] = parsedStudents
        .filter(s => {
          const ex = existingMap.get(s.email)
          return ex && ex.cohort_id && ex.cohort_id !== selectedCohort
        })
        .map(s => {
          const ex = existingMap.get(s.email)!
          const cohortName = cohorts.find(c => c.id === ex.cohort_id)?.name || 'another cohort'
          return { name: s.name, email: s.email, currentCohortName: cohortName }
        })

      if (conflictList.length > 0) {
        setConflicts(conflictList)
        setConflictAction('move') // default to the smoothest option
        setShowConflictStep(true)
        return
      }
    } finally {
      setCheckingConflicts(false)
    }

    // No conflicts — proceed directly
    await executeImport('skip')
  }

  const executeImport = async (action: ConflictAction) => {
    const names = parsedStudents.map(s => s.name)
    const emails = parsedStudents.map(s => s.email)
    const result = await importStudents(names, emails, selectedCohort, action)
    setSkippedStudents(result?.skipped ?? [])
    setConflicts([])
    setShowConflictStep(false)
    setPastedData('')
    setParsedStudents([])
    setSelectedCohort('cohort-placeholder')
    onRefresh?.()
    if ((result?.skipped ?? []).length === 0) onSuccess?.()
  }

  const clearAll = () => {
    setPastedData('')
    setParsedStudents([])
    setSelectedCohort('cohort-placeholder')
    setSkippedStudents([])
    setConflicts([])
    setShowConflictStep(false)
  }

  const targetCohortName = cohorts.find(c => c.id === selectedCohort)?.name || 'this cohort'
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
            placeholder={"John Smith\tjohn@email.com\nJane Doe\tjane@email.com\nBob Wilson\tbob@email.com"}
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

        {/* Preview table */}
        {parsedStudents.length > 0 && !showConflictStep && (
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
                disabled={loading || checkingConflicts || isImportDisabled}
                className={isImportDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <Upload size={15} className="mr-2" />
                {checkingConflicts ? 'Checking…' : `Import ${parsedStudents.length} Students`}
              </Button>
              {isImportDisabled && (
                <p className="text-xs text-red-500 mt-2">Select a cohort to enable import</p>
              )}
            </div>
          </div>
        )}

        {/* ── Conflict resolution step ── */}
        {showConflictStep && conflicts.length > 0 && (
          <div className="border border-amber-300 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-amber-50 px-4 py-3 border-b border-amber-300 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {conflicts.length} student{conflicts.length !== 1 ? 's' : ''} already assigned elsewhere
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  These names exist in the app but are currently in a different cohort. Choose how to handle them.
                </p>
              </div>
            </div>

            {/* Conflict list */}
            <div className="max-h-44 overflow-y-auto divide-y divide-gray-100">
              {conflicts.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm bg-white">
                  <div>
                    <span className="font-medium text-gray-800">{s.name}</span>
                    <span className="text-gray-400 text-xs ml-2">{s.email}</span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5 ml-2 shrink-0">
                    {s.currentCohortName}
                  </span>
                </div>
              ))}
            </div>

            {/* Action selection */}
            <div className="p-4 bg-gray-50 border-t border-amber-200 space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                How should we handle them?
              </p>
              {CONFLICT_OPTIONS.map(opt => {
                const isSelected = conflictAction === opt.value
                const borderColor = isSelected
                  ? opt.color === 'blue' ? 'border-blue-500 bg-blue-50'
                    : opt.color === 'green' ? 'border-green-500 bg-green-50'
                    : 'border-gray-400 bg-gray-100'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                const iconColor = isSelected
                  ? opt.color === 'blue' ? 'text-blue-600'
                    : opt.color === 'green' ? 'text-green-600'
                    : 'text-gray-600'
                  : 'text-gray-400'
                const titleColor = isSelected
                  ? opt.color === 'blue' ? 'text-blue-800'
                    : opt.color === 'green' ? 'text-green-800'
                    : 'text-gray-700'
                  : 'text-gray-700'

                return (
                  <button
                    key={opt.value}
                    onClick={() => setConflictAction(opt.value)}
                    className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors ${borderColor}`}
                  >
                    <span className={`mt-0.5 flex-shrink-0 ${iconColor}`}>{opt.icon}</span>
                    <div>
                      <p className={`text-sm font-medium ${titleColor}`}>{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.description(targetCohortName)}</p>
                    </div>
                    {isSelected && (
                      <span className={`ml-auto flex-shrink-0 w-4 h-4 rounded-full border-2 mt-0.5
                        ${opt.color === 'blue' ? 'border-blue-500 bg-blue-500'
                          : opt.color === 'green' ? 'border-green-500 bg-green-500'
                          : 'border-gray-500 bg-gray-500'}
                      `} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer buttons */}
            <div className="px-4 py-3 bg-gray-50 border-t border-amber-200 flex items-center justify-between">
              <button
                onClick={() => setShowConflictStep(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <Button onClick={() => executeImport(conflictAction)} disabled={loading}>
                {loading ? 'Importing…' : `Proceed — import ${parsedStudents.length} students`}
              </Button>
            </div>
          </div>
        )}

        {/* Skipped students (after import with skip action) */}
        {skippedStudents.length > 0 && (
          <div className="border border-yellow-300 rounded-lg overflow-hidden bg-yellow-50">
            <div className="px-4 py-3 border-b border-yellow-300">
              <p className="text-sm font-semibold text-yellow-800">
                {skippedStudents.length} student{skippedStudents.length > 1 ? 's' : ''} were skipped
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">These remain in their current cohort. Use the Students page to move them manually.</p>
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
