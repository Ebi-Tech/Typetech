'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select, SelectItem } from '@/components/ui/Select'
import { Plus, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface CohortSelectorProps {
  selectedCohort: string | null
  onCohortChange: (cohortId: string | null) => void
  cohorts: Array<{ id: string; name: string }>
  onCohortCreated?: () => void
}

export function CohortSelector({ 
  selectedCohort, 
  onCohortChange, 
  cohorts, 
  onCohortCreated 
}: CohortSelectorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newCohortName, setNewCohortName] = useState('')

  const handleCreateCohort = async () => {
    if (!newCohortName.trim()) {
      toast.error('Cohort name is required')
      return
    }

    try {
      const { error } = await supabase
        .from('cohorts')
        .insert([{ name: newCohortName.trim() }])

      if (error) throw error

      toast.success('Cohort created')
      setNewCohortName('')
      setIsCreating(false)
      onCohortCreated?.()
    } catch (error) {
      toast.error('Failed to create cohort')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 flex-1">
        <Filter size={16} className="text-gray-500" />
        <Select
          value={selectedCohort || ''}
          onValueChange={(value) => onCohortChange(value === 'all' ? null : value)}
        >
          <SelectItem value="all">All Cohorts</SelectItem>
          {cohorts.map((cohort) => (
            <SelectItem key={cohort.id} value={cohort.id}>
              {cohort.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      {!isCreating ? (
        <Button variant="outline" size="sm" onClick={() => setIsCreating(true)}>
          <Plus size={16} className="mr-1" />
          New Cohort
        </Button>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={newCohortName}
            onChange={(e) => setNewCohortName(e.target.value)}
            placeholder="Cohort 1"
            className="px-2 py-1 text-sm border rounded-md w-32"
            autoFocus
          />
          <Button size="sm" onClick={handleCreateCohort}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}
