'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectItem } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Save, Upload, CheckCircle, Trash2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { User } from '@supabase/supabase-js'

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [showWipeDialog, setShowWipeDialog] = useState(false)
  const [wipeConfirmText, setWipeConfirmText] = useState('')
  const [wiping, setWiping] = useState(false)
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([])
  const [cohortToDelete, setCohortToDelete] = useState<string>('placeholder')
  const [showDeleteCohortDialog, setShowDeleteCohortDialog] = useState(false)
  const [deletingCohort, setDeletingCohort] = useState(false)
  const [requireMinAttendance, setRequireMinAttendance] = useState(false)
  const [templateUploading, setTemplateUploading] = useState(false)
  const [templateExists, setTemplateExists] = useState(false)
  const [nameX, setNameX] = useState('306')
  const [nameY, setNameY] = useState('350')
  const [nameFontSize, setNameFontSize] = useState('36')
  const [selectedTerm, setSelectedTerm] = useState('trimester1')
  const [academicYear, setAcademicYear] = useState('2026')
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const templateInputRef = useRef<HTMLInputElement>(null)

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/users', { cache: 'no-store' })
      const data = await res.json()
      if (data.users) setUsers(data.users)
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchCohorts = async () => {
    const { data } = await supabase.from('cohorts').select('id, name')
    const sorted = (data || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    )
    setCohorts(sorted)
  }

  const handleDeleteCohort = async () => {
    if (!cohortToDelete || cohortToDelete === 'placeholder') return
    setDeletingCohort(true)
    try {
      // Unassign all students in this cohort first
      await supabase.from('students').update({ cohort_id: null }).eq('cohort_id', cohortToDelete)
      const { error } = await supabase.from('cohorts').delete().eq('id', cohortToDelete)
      if (error) throw error
      toast.success('Cohort deleted. Students have been unassigned.')
      setCohortToDelete('placeholder')
      setShowDeleteCohortDialog(false)
      fetchCohorts()
    } catch {
      toast.error('Failed to delete cohort')
    } finally {
      setDeletingCohort(false)
    }
  }

  useEffect(() => {
    fetchCohorts()
    // Load saved position settings from localStorage
    setNameX(localStorage.getItem('cert_name_x') || '306')
    setNameY(localStorage.getItem('cert_name_y') || '350')
    setNameFontSize(localStorage.getItem('cert_name_size') || '36')
    setSelectedTerm(localStorage.getItem('selected_term') || 'trimester1')
    setAcademicYear(localStorage.getItem('academic_year') || '2026')

    // Get current user role
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id)
        setIsAdmin(user.app_metadata?.role === 'admin')
      }
    })

    const loadUsers = async () => {
      setUsersLoading(true)
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        const data = await res.json()
        if (data.users) setUsers(data.users)
      } finally {
        setUsersLoading(false)
      }
    }
    loadUsers()

    // Check if a template already exists in storage
    const checkTemplate = async () => {
      const { data } = supabase.storage
        .from('certificates')
        .getPublicUrl('certificate-template/template.pdf')
      const res = await fetch(data.publicUrl, { method: 'HEAD' })
      setTemplateExists(res.ok)
    }
    checkTemplate()
  }, [])

  // Auto-refresh user list when an invite is accepted or when admin returns to tab
  useEffect(() => {
    const channel = supabase
      .channel('settings-users-refresh')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'invites' },
        (payload) => {
          if (payload.new?.status === 'accepted') {
            fetchUsers()
          }
        }
      )
      .subscribe()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchUsers()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setTemplateUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')

      setTemplateExists(true)
      toast.success('Template uploaded successfully')
    } catch {
      toast.error('Failed to upload template')
    } finally {
      setTemplateUploading(false)
      if (templateInputRef.current) templateInputRef.current.value = ''
    }
  }

  const handleWipeData = async () => {
    setWiping(true)
    try {
      const res = await fetch('/api/wipe-data', { method: 'POST' })
      if (!res.ok) throw new Error('Wipe failed')
      toast.success('All student data has been deleted')
      setShowWipeDialog(false)
      setWipeConfirmText('')
    } catch {
      toast.error('Failed to delete data')
    } finally {
      setWiping(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Remove this facilitator? They will lose access immediately.')) return
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('User removed successfully')
    } else {
      toast.error(data.error || 'Failed to remove user')
    }
  }

  const handlePromoteUser = async (userId: string, email: string) => {
    if (!confirm(`Make ${email} an admin? They will be able to manage and remove other users.`)) return
    const res = await fetch(`/api/users/${userId}`, { method: 'PATCH' })
    const data = await res.json()
    if (res.ok) {
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, app_metadata: { ...u.app_metadata, role: 'admin' } }
          : u
      ))
      toast.success(`${email} is now an admin`)
    } else {
      toast.error(data.error || 'Failed to promote user')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    localStorage.setItem('cert_name_x', nameX)
    localStorage.setItem('cert_name_y', nameY)
    localStorage.setItem('cert_name_size', nameFontSize)
    localStorage.setItem('selected_term', selectedTerm)
    localStorage.setItem('academic_year', academicYear)
    toast.success('Settings saved')
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">General Settings</h2>
            <div className="space-y-4">
              <Input
                label="App Name"
                defaultValue="Typetech"
                placeholder="Enter app name"
              />
              
              <Input
                label="Department Name"
                defaultValue="Typing Department"
                placeholder="Enter department name"
              />
              
              <Select
                label="Academic Year"
                value={academicYear}
                onValueChange={setAcademicYear}
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </Select>

              <Select
                label="Default Term"
                value={selectedTerm}
                onValueChange={setSelectedTerm}
              >
                <SelectItem value="trimester1">Trimester 1 (January)</SelectItem>
                <SelectItem value="trimester2">Trimester 2 (May)</SelectItem>
                <SelectItem value="trimester3">Trimester 3 (September)</SelectItem>
              </Select>
              
              <div className="flex items-center gap-2">
                <input type="checkbox" id="maintenance" className="rounded" />
                <label htmlFor="maintenance" className="text-sm">
                  Maintenance Mode
                </label>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Certificate Settings */}
        <TabsContent value="certificates">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Certificate Settings</h2>
            <div className="space-y-6">

              {/* Template Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificate Template (PDF)
                </label>
                {templateExists && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <CheckCircle size={16} />
                    <span>Template uploaded and ready</span>
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Upload your Canva-designed certificate PDF
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    The student&apos;s name will be stamped on top at the position you configure below
                  </p>
                  <input
                    ref={templateInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleTemplateUpload}
                  />
                  <Button
                    variant="outline"
                    className="mt-4"
                    disabled={templateUploading}
                    onClick={() => templateInputRef.current?.click()}
                  >
                    <Upload size={16} className="mr-2" />
                    {templateUploading ? 'Uploading...' : templateExists ? 'Replace Template' : 'Upload Template'}
                  </Button>
                </div>
              </div>

              {/* Name Position */}
              <div className="space-y-3">
                <h3 className="font-medium">Name Position on Certificate</h3>
                <p className="text-xs text-gray-500">
                  PDF coordinates start from the bottom-left. For a standard Canva certificate, try X: 306, Y: 350.
                  Adjust until the name lands in the right spot, then click Save Changes.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Input
                    label="Center X (points)"
                    type="number"
                    value={nameX}
                    onChange={e => setNameX(e.target.value)}
                    placeholder="306"
                  />
                  <Input
                    label="Y from bottom (points)"
                    type="number"
                    value={nameY}
                    onChange={e => setNameY(e.target.value)}
                    placeholder="350"
                  />
                  <Input
                    label="Font Size"
                    type="number"
                    value={nameFontSize}
                    onChange={e => setNameFontSize(e.target.value)}
                    placeholder="36"
                  />
                </div>
              </div>

            </div>
          </Card>
        </TabsContent>

        {/* Attendance Settings */}
        <TabsContent value="attendance">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Attendance Settings</h2>
            <div className="space-y-4">
              <Input
                label="Total Weeks"
                type="number"
                defaultValue="11"
                min="1"
                max="20"
              />
              
              <Select label="Default Status" defaultValue="present">
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </Select>
              
              <div className="space-y-2">
                <h3 className="font-medium">Attendance Rules</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="late-half" defaultChecked className="rounded" />
                    <label htmlFor="late-half">Count Late as half attendance</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="min-attendance"
                      className="rounded"
                      checked={requireMinAttendance}
                      onChange={e => setRequireMinAttendance(e.target.checked)}
                    />
                    <label htmlFor="min-attendance">Require minimum attendance to pass</label>
                  </div>
                </div>
              </div>
              
              {requireMinAttendance && (
                <Input
                  label="Minimum Attendance Required (%)"
                  type="number"
                  defaultValue="80"
                  min="0"
                  max="100"
                />
              )}
            </div>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">User Management</h2>
              <div className="flex items-center gap-3">
                {!isAdmin && (
                  <span className="text-xs text-gray-500">Only admins can remove users</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUsers}
                  disabled={usersLoading}
                >
                  <RefreshCw size={14} className={`mr-1 ${usersLoading ? 'animate-spin' : ''}`} />
                  {usersLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>
            {users.length === 0 ? (
              <p className="text-sm text-gray-500">Loading users...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Role</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Last Sign In</th>
                      {isAdmin && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => {
                      const userIsAdmin = user.app_metadata?.role === 'admin'
                      const isSelf = user.id === currentUserId
                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">
                            {user.email}
                            {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.user_metadata?.full_name || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {userIsAdmin
                              ? <Badge variant="success">Admin</Badge>
                              : <Badge variant="secondary">Facilitator</Badge>
                            }
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.last_sign_in_at
                              ? new Date(user.last_sign_in_at).toLocaleDateString()
                              : 'Never'}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              {!userIsAdmin && !isSelf && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handlePromoteUser(user.id, user.email || '—')}
                                    className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                  >
                                    Make Admin
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 size={14} className="mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <div className="border-2 border-red-200 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
          <p className="text-sm text-gray-500 mt-1">
            These actions are irreversible. Proceed with extreme caution.
          </p>
        </div>
        <div className="flex items-center justify-between py-4 border-t border-red-100">
          <div className="flex-1 mr-6">
            <p className="font-medium">Delete a cohort</p>
            <p className="text-sm text-gray-500">
              Removes the cohort permanently. Students in it will be unassigned but not deleted.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Select value={cohortToDelete} onValueChange={setCohortToDelete}>
              <SelectItem value="placeholder">Select cohort…</SelectItem>
              {cohorts.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </Select>
            <Button
              variant="destructive"
              disabled={!cohortToDelete || cohortToDelete === 'placeholder'}
              onClick={() => setShowDeleteCohortDialog(true)}
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between py-4 border-t border-red-100">
          <div>
            <p className="font-medium">Delete all student data</p>
            <p className="text-sm text-gray-500">
              Permanently removes all students, attendance records, grades, and certificates. This cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setShowWipeDialog(true)}
          >
            <Trash2 size={16} className="mr-2" />
            Delete All Data
          </Button>
        </div>
      </div>

      {/* Delete Cohort Confirmation Dialog */}
      <Dialog open={showDeleteCohortDialog} onOpenChange={(open) => {
        setShowDeleteCohortDialog(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">Delete cohort?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{cohorts.find(c => c.id === cohortToDelete)?.name}</strong>. Students currently in this cohort will be unassigned but not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteCohortDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deletingCohort} onClick={handleDeleteCohort}>
              {deletingCohort ? 'Deleting...' : 'Delete Cohort'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wipe Confirmation Dialog */}
      <Dialog open={showWipeDialog} onOpenChange={(open) => {
        setShowWipeDialog(open)
        if (!open) setWipeConfirmText('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">Delete all student data?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>all students, attendance records, grades, and certificates</strong> from the system. This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-700">
              To confirm, type <span className="font-mono font-bold text-red-600">I want to delete</span> below:
            </p>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="I want to delete"
              value={wipeConfirmText}
              onChange={e => setWipeConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowWipeDialog(false)
              setWipeConfirmText('')
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={wipeConfirmText !== 'I want to delete' || wiping}
              onClick={handleWipeData}
            >
              {wiping ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
