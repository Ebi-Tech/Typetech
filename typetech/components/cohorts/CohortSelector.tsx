'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select, SelectItem } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import { Plus, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Cohort {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
}

interface CohortSelectorProps {
  selectedCohort: string | null
  onCohortChange: (cohortId: string | null) => void
  showAllOption?: boolean
}

export function CohortSelector({ selectedCohort, onCohortChange, showAllOption = true }: CohortSelectorProps) {
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCohort, setNewCohort] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    fetchCohorts()
  }, [])

  const fetchCohorts = async () => {
    try {
      const { data, error } = await supabase
        .from('cohorts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCohorts(data || [])
    } catch (error) {
      toast.error('Failed to load cohorts')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCohort = async () => {
    if (!newCohort.name) {
      toast.error('Cohort name is required')
      return
    }

    try {
      const { data, error } = await supabase
        .from('cohorts')
        .insert([newCohort])
        .select()
        .single()

      if (error) throw error

      setCohorts(prev => [data, ...prev])
      setIsCreateDialogOpen(false)
      setNewCohort({ name: '', description: '', start_date: '', end_date: '' })
      toast.success('Cohort created successfully')
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
          disabled={loading}
        >
          {showAllOption && <SelectItem value="all">All Cohorts</SelectItem>}
          {cohorts.map((cohort) => (
            <SelectItem key={cohort.id} value={cohort.id}>
              {cohort.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
        <Plus size={16} className="mr-1" />
        New Cohort
      </Button>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-lg font-semibold mb-4">Create New Cohort</h2>
          
          <div className="space-y-4">
            <Input
              label="Cohort Name"
              value={newCohort.name}
              onChange={(e) => setNewCohort(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Spring 2026"
              required
            />
            
            <Input
              label="Description"
              value={newCohort.description}
              onChange={(e) => setNewCohort(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
            />
            
            <Input
              label="Start Date"
              type="date"
              value={newCohort.start_date}
              onChange={(e) => setNewCohort(prev => ({ ...prev, start_date: e.target.value }))}
            />
            
            <Input
              label="End Date"
              type="date"
              value={newCohort.end_date}
              onChange={(e) => setNewCohort(prev => ({ ...prev, end_date: e.target.value }))}
            />
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCohort}>
                Create Cohort
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
