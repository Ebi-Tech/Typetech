'use client'

import { useState, useEffect } from 'react'
import { useStudents } from '@/hooks/useStudents'
import { CohortSelector } from '@/components/cohorts/CohortSelector'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select, SelectItem } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Download, Mail, CheckCircle, Eye, Trash2 } from 'lucide-react'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'


const BUILTIN_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'congratulations',
    name: 'Congratulations — Passed',
    subject: 'Congratulations on Completing the Typing Course! 🎉',
    body: `Hi {{name}},

Congratulations! You have successfully completed the ALU Typing Class. We're really proud of the effort and commitment you've shown throughout this course.

Your certificate is attached to this email. Keep practising and continuing to improve!

Well done,
The Typetech Team`,
  },
]

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

interface Cohort {
  id: string
  name: string
}

interface CertStatus {
  certificate_url: string | null
  generated_at: string | null
  email_sent: boolean
  email_sent_at?: string | null
  email_attempts?: number
}

export default function CertificatesPage() {
  const { students, refresh } = useStudents()
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [certificateStatus, setCertificateStatus] = useState<Record<string, CertStatus>>({})

  // Email template picker
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [savedEmailTemplates, setSavedEmailTemplates] = useState<EmailTemplate[]>([])
  const [pickedTemplateId, setPickedTemplateId] = useState('congratulations')

  // Fetch cohorts
  const fetchCohorts = async () => {
    const { data } = await supabase.from('cohorts').select('*').order('name')
    setCohorts(data || [])
  }

  useEffect(() => {
    supabase.from('cohorts').select('*').order('name').then(({ data }) => {
      setCohorts(data || [])
    })
  }, [])

  // Filter students who are eligible for certificates (Complete or Pass)
  const eligibleStudents = students?.filter(s => 
    s.final_status === 'Complete' || s.final_status === 'Pass'
  ) || []

  // Apply cohort filter
  const filteredStudents = eligibleStudents.filter(student => {
    if (selectedCohort && student.cohort_id !== selectedCohort) return false
    if (filter === 'all') return true
    if (filter === 'complete') return student.final_status === 'Complete'
    if (filter === 'pass') return student.final_status === 'Pass'
    return true
  })

  // Load saved message templates from Supabase
  useEffect(() => {
    supabase.from('message_templates').select('*').order('created_at').then(({ data }) => {
      setSavedEmailTemplates(data || [])
    })
  }, [])

  const allEmailTemplates = [...BUILTIN_EMAIL_TEMPLATES, ...savedEmailTemplates]
  const pickedTemplate = allEmailTemplates.find(t => t.id === pickedTemplateId) ?? BUILTIN_EMAIL_TEMPLATES[0]

  // Load certificate status for students
  useEffect(() => {
    const loadCertificateStatus = async () => {
      if (filteredStudents.length === 0) return
      
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .in('student_id', filteredStudents.map(s => s.id))

      if (data) {
        const statusMap: Record<string, CertStatus> = {}
        data.forEach(cert => {
          statusMap[cert.student_id] = cert
        })
        setCertificateStatus(statusMap)
      }
    }

    loadCertificateStatus()
  }, [filteredStudents])

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const toggleAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id))
    }
  }

  const generateCertificate = async (studentId: string, studentName: string) => {
    try {
      // Fetch the template — cache-bust so a newly uploaded template is always fresh
      const { data: templateUrlData } = supabase.storage
        .from('certificates')
        .getPublicUrl('certificate-template/template.pdf')

      const templateResponse = await fetch(`${templateUrlData.publicUrl}?v=${Date.now()}`)
      if (!templateResponse.ok) {
        throw new Error('No template found. Please upload one in Settings > Certificates.')
      }
      const templateBytes = await templateResponse.arrayBuffer()

      // Load the template
      const pdfDoc = await PDFDocument.load(templateBytes)
      pdfDoc.registerFontkit(fontkit)
      const pages = pdfDoc.getPages()
      const firstPage = pages[0]
      const { width } = firstPage.getSize()

      // Embed Alex Brush (hosted in /public/fonts/)
      const fontResponse = await fetch('/fonts/AlexBrush-Regular.ttf')
      if (!fontResponse.ok) throw new Error('Alex Brush font not found at /fonts/AlexBrush-Regular.ttf')
      const fontBytes = new Uint8Array(await fontResponse.arrayBuffer())
      const alexBrush = await pdfDoc.embedFont(fontBytes)

      const fontSize = 48
      // Always center horizontally; Y is configurable from Settings > Certificates
      // Default 308 = ~48% from top on the A4 landscape template (842×595 pts)
      const nameY = Number(localStorage.getItem('cert_name_y') || 308)
      const textWidth = alexBrush.widthOfTextAtSize(studentName, fontSize)

      firstPage.drawText(studentName, {
        x: width / 2 - textWidth / 2,
        y: nameY,
        size: fontSize,
        font: alexBrush,
        color: rgb(0, 0, 0),
      })

      const pdfBytes = await pdfDoc.save()
      const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })

      const formData = new FormData()
      formData.append('file', pdfBlob, `${studentName.replace(/\s+/g, '_')}_Certificate.pdf`)
      formData.append('studentId', studentId)
      formData.append('studentName', studentName)

      const res = await fetch('/api/upload-certificate', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Upload failed')
      }

      const { url } = await res.json()

      setCertificateStatus(prev => ({
        ...prev,
        [studentId]: {
          certificate_url: url,
          generated_at: new Date().toISOString(),
          email_sent: false
        }
      }))

      return url
    } catch (error) {
      console.error('Error generating certificate:', error)
      throw error
    }
  }

  const handleGenerateSelected = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Select at least one student')
      return
    }

    setGenerating(true)
    let success = 0
    const errors: string[] = []

    for (const studentId of selectedStudents) {
      const student = students?.find(s => s.id === studentId)
      if (!student) continue

      try {
        await generateCertificate(studentId, student.name)
        success++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`${student.name}: ${msg}`)
        console.error('Certificate generation failed for', student.name, err)
      }
    }

    await refresh()
    if (errors.length > 0) {
      toast.error(`${errors.length} failed: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ''}`, { duration: 8000 })
    }
    if (success > 0) {
      toast.success(`Generated ${success} certificate${success !== 1 ? 's' : ''}`)
    }
    setGenerating(false)
  }

  const openTemplatePicker = () => {
    if (selectedStudents.length === 0) {
      toast.error('Select at least one student')
      return
    }
    setShowTemplatePicker(true)
  }

  const handleSendEmails = async () => {
    setShowTemplatePicker(false)
    setSending(true)
    let success = 0
    let failed = 0

    for (const studentId of selectedStudents) {
      const student = students?.find(s => s.id === studentId)
      if (!student) continue

      try {
        const cert = certificateStatus[studentId]
        if (!cert?.certificate_url) {
          throw new Error('Generate the certificate first before emailing')
        }

        const res = await fetch('/api/send-certificate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: student.name,
            studentEmail: student.email,
            certificateUrl: cert.certificate_url,
            subject: pickedTemplate.subject,
            body: pickedTemplate.body,
          }),
        })

        if (!res.ok) throw new Error('Email failed')

        await supabase.from('certificates').update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          email_attempts: (cert.email_attempts || 0) + 1,
        }).eq('student_id', studentId)

        await supabase.from('students').update({
          certificate_emailed: true,
          certificate_emailed_at: new Date().toISOString(),
        }).eq('id', studentId)

        await supabase.from('email_logs').insert([{
          student_id: studentId,
          email_type: 'certificate',
          recipient_email: student.email,
          subject: pickedTemplate.subject,
          status: 'sent',
          metadata: { certificate_url: cert.certificate_url },
        }])

        success++
      } catch (error) {
        failed++
        await supabase.from('email_logs').insert([{
          student_id: studentId,
          email_type: 'certificate',
          recipient_email: student.email,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        }])
      }
    }

    await refresh()
    toast.success(`Sent ${success} emails${failed > 0 ? `, ${failed} failed` : ''}`)
    setSending(false)
  }

  const handleDownload = async (studentId: string, studentName: string) => {
    try {
      const cert = certificateStatus[studentId]
      if (cert?.certificate_url) {
        // Append timestamp to bypass browser cache so a regenerated cert always shows fresh
        window.open(`${cert.certificate_url}?v=${Date.now()}`, '_blank')
      } else {
        const url = await generateCertificate(studentId, studentName)
        window.open(`${url}?v=${Date.now()}`, '_blank')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed: ${msg}`, { duration: 8000 })
    }
  }

  const handleDeleteCertificate = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('student_id', studentId)
      if (error) throw error
      setCertificateStatus(prev => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      toast.success('Certificate deleted — you can now regenerate it')
    } catch {
      toast.error('Failed to delete certificate')
    }
  }

  const getStatusBadge = (studentId: string) => {
    const cert = certificateStatus[studentId]
    if (!cert) return <Badge variant="secondary">Not Generated</Badge>
    if (cert.email_sent) return <Badge variant="success">Emailed</Badge>
    return <Badge variant="warning">Generated</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Certificates</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <CohortSelector 
          selectedCohort={selectedCohort}
          onCohortChange={setSelectedCohort}
          cohorts={cohorts}
          onCohortCreated={fetchCohorts}
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectItem value="all">All Eligible</SelectItem>
          <SelectItem value="complete">Complete Only</SelectItem>
          <SelectItem value="pass">Pass Only</SelectItem>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eligible Students</p>
              <p className="text-2xl font-bold">{filteredStudents.length}</p>
            </div>
            <Badge variant="success">Ready</Badge>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Certificates Generated</p>
              <p className="text-2xl font-bold">
                {Object.values(certificateStatus).filter(c => c?.certificate_url).length}
              </p>
            </div>
            <CheckCircle className="text-green-500" size={24} />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Emails Sent</p>
              <p className="text-2xl font-bold">
                {Object.values(certificateStatus).filter(c => c?.email_sent).length}
              </p>
            </div>
            <Mail className="text-blue-500" size={24} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Selected</p>
              <p className="text-2xl font-bold">{selectedStudents.length}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAll}
            >
              {selectedStudents.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={handleGenerateSelected}
          disabled={generating || selectedStudents.length === 0}
        >
          <Download size={16} className="mr-2" />
          {generating ? 'Generating...' : 'Generate Selected'}
        </Button>
        <Button
          onClick={openTemplatePicker}
          disabled={sending || selectedStudents.length === 0}
        >
          <Mail size={16} className="mr-2" />
          {sending ? 'Sending...' : 'Email Selected'}
        </Button>
      </div>

      {/* Students List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => {
                const cohort = cohorts.find(c => c.id === student.cohort_id)
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={student.final_status === 'Complete' ? 'success' : 'warning'}>
                        {student.final_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{cohort?.name || '—'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(student.id)}
                    </td>
                    <td className="px-4 py-3">
                      {certificateStatus[student.id]?.email_sent ? (
                        <Badge variant="success">Sent</Badge>
                      ) : certificateStatus[student.id]?.certificate_url ? (
                        <Badge variant="warning">Pending</Badge>
                      ) : (
                        <Badge variant="secondary">—</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(student.id, student.name)}
                          title="View/Download Certificate"
                        >
                          <Eye size={16} />
                        </Button>
                        {certificateStatus[student.id]?.certificate_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCertificate(student.id)}
                            title="Delete certificate so it can be regenerated"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                        {(certificateStatus[student.id]?.email_attempts ?? 0) > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {certificateStatus[student.id].email_attempts} attempts
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Template picker dialog */}
      <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose email template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            {allEmailTemplates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => setPickedTemplateId(tpl.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  pickedTemplateId === tpl.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <p className="font-medium">{tpl.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{tpl.subject}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplatePicker(false)}>Cancel</Button>
            <Button onClick={handleSendEmails} disabled={sending}>
              <Mail size={14} className="mr-1.5" />
              Send to {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
