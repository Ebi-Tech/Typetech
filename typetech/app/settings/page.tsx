'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectItem } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Save, Upload, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [requireMinAttendance, setRequireMinAttendance] = useState(false)
  const [templateUploading, setTemplateUploading] = useState(false)
  const [templateExists, setTemplateExists] = useState(false)
  const [nameX, setNameX] = useState('306')
  const [nameY, setNameY] = useState('350')
  const [nameFontSize, setNameFontSize] = useState('36')
  const templateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load saved position settings from localStorage
    setNameX(localStorage.getItem('cert_name_x') || '306')
    setNameY(localStorage.getItem('cert_name_y') || '350')
    setNameFontSize(localStorage.getItem('cert_name_size') || '36')

    // Check if a template already exists in storage
    const checkTemplate = async () => {
      const { data } = supabase.storage
        .from('certificate')
        .getPublicUrl('certificate-templates/template.pdf')
      const res = await fetch(data.publicUrl, { method: 'HEAD' })
      setTemplateExists(res.ok)
    }
    checkTemplate()
  }, [])

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setTemplateUploading(true)
    try {
      const { error } = await supabase.storage
        .from('certificate')
        .upload('certificate-templates/template.pdf', file, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (error) throw error

      setTemplateExists(true)
      toast.success('Template uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload template')
    } finally {
      setTemplateUploading(false)
      if (templateInputRef.current) templateInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setSaving(true)
    localStorage.setItem('cert_name_x', nameX)
    localStorage.setItem('cert_name_y', nameY)
    localStorage.setItem('cert_name_size', nameFontSize)
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
        <TabsList className="grid w-full grid-cols-4">
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
              
              <Input
                label="Academic Year"
                defaultValue="2026"
                placeholder="Enter academic year"
              />
              
              <Select label="Default Term" defaultValue="spring">
                <SelectItem value="fall">Fall Semester</SelectItem>
                <SelectItem value="spring">Spring Semester</SelectItem>
                <SelectItem value="summer">Summer Session</SelectItem>
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
                    The student's name will be stamped on top at the position you configure below
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
                <div className="grid grid-cols-3 gap-4">
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
            <h2 className="text-lg font-semibold mb-4">User Management</h2>
            
            <div className="mb-4">
              <Button>Add New User</Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Role</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Last Active</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2">Admin User</td>
                    <td className="px-4 py-2 text-sm">admin@typetech.com</td>
                    <td className="px-4 py-2">
                      <Badge variant="success">Admin</Badge>
                    </td>
                    <td className="px-4 py-2 text-sm">Just now</td>
                    <td className="px-4 py-2">
                      <Button size="sm" variant="ghost">Edit</Button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Teacher One</td>
                    <td className="px-4 py-2 text-sm">teacher@typetech.com</td>
                    <td className="px-4 py-2">
                      <Badge variant="secondary">Teacher</Badge>
                    </td>
                    <td className="px-4 py-2 text-sm">2 hours ago</td>
                    <td className="px-4 py-2">
                      <Button size="sm" variant="ghost">Edit</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
