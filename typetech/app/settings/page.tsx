'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectItem } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Save, Mail, Database, Shield, Bell, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [requireMinAttendance, setRequireMinAttendance] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('Settings saved successfully')
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
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

        {/* Email Settings */}
        <TabsContent value="email">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Email Configuration</h2>
            <div className="space-y-4">
              <Input
                label="SMTP Host"
                defaultValue="smtp.gmail.com"
                placeholder="smtp.gmail.com"
              />
              
              <Input
                label="SMTP Port"
                type="number"
                defaultValue="587"
                placeholder="587"
              />
              
              <Input
                label="SMTP Username"
                defaultValue="typing@yourdepartment.edu"
                placeholder="email@domain.com"
              />
              
              <Input
                label="SMTP Password"
                type="password"
                defaultValue=""
                placeholder="Enter SMTP password"
              />
              
              <Input
                label="From Email"
                defaultValue="typing@yourdepartment.edu"
                placeholder="from@domain.com"
              />
              
              <Input
                label="From Name"
                defaultValue="Typing Department"
                placeholder="From Name"
              />
              
              <Button variant="outline">
                <Mail size={16} className="mr-2" />
                Test Email Connection
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Certificate Settings */}
        <TabsContent value="certificates">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Certificate Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificate Template
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Drag and drop your certificate template, or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF format recommended
                  </p>
                  <Button variant="outline" className="mt-4">
                    Upload Template
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Placeholder Settings</h3>
                <Input
                  label="Name Placeholder"
                  defaultValue="{{studentName}}"
                  placeholder="{{studentName}}"
                />
                <Input
                  label="Date Placeholder"
                  defaultValue="{{date}}"
                  placeholder="{{date}}"
                />
                <Input
                  label="Course Placeholder"
                  defaultValue="Typing Class"
                  placeholder="{{courseName}}"
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Certificate Rules</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="complete-cert" defaultChecked className="rounded" />
                    <label htmlFor="complete-cert">Generate for "Complete" status</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="pass-cert" defaultChecked className="rounded" />
                    <label htmlFor="pass-cert">Generate for "Pass" status</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="auto-email" defaultChecked className="rounded" />
                    <label htmlFor="auto-email">Auto-send emails after generation</label>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Attendance Settings */}
        <TabsContent value="attendance">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Attendance Settings</h2>
            // Attendance state
            const [requireMinAttendance, setRequireMinAttendance] = useState(false);

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
