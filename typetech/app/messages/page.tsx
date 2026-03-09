'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectItem } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Send, BookTemplate, Save, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Student {
  id: string
  name: string
  email: string
  cohort_id: string | null
  typing_style: string | null
  final_status: string | null
}

interface Cohort {
  id: string
  name: string
}

interface Template {
  id: string
  name: string
  subject: string
  body: string
}

// ── Built-in templates ──────────────────────────────────────────────────────
const BUILTIN_TEMPLATES: Template[] = [
  {
    id: 'weekly-reminder',
    name: 'Weekly Class Reminder',
    subject: 'Reminder: Typing Class This Week',
    body: `Hi {{name}},

This is a friendly reminder that your typing class session is coming up this week. Please make sure to attend and come prepared.

Remember, consistent attendance is key to improving your typing speed and accuracy!

See you in class,
The Typetech Team`,
  },
  {
    id: 'attendance-warning',
    name: 'Low Attendance Warning',
    subject: 'Important: Your Attendance Needs Attention',
    body: `Hi {{name}},

We've noticed that your attendance in the typing class has been lower than expected. Regular attendance is required to successfully complete the course.

Please make every effort to attend upcoming sessions. If you're facing any challenges, don't hesitate to reach out to us.

Best regards,
The Typetech Team`,
  },
  {
    id: 'congratulations',
    name: 'Congratulations — Passed',
    subject: 'Congratulations on Completing the Typing Course! 🎉',
    body: `Hi {{name}},

Congratulations! You have successfully completed the ALU Typing Class. We're really proud of the effort and commitment you've shown throughout this course.

Your certificate will be sent to you shortly. Keep practising and continuing to improve!

Well done,
The Typetech Team`,
  },
  {
    id: 'homerow-reminder',
    name: 'Homerow Technique Reminder',
    subject: 'Quick Tip: Keep Practising Homerow Technique',
    body: `Hi {{name}},

Just a quick reminder to keep practising your homerow typing technique. Place your fingers on the ASDF and JKL; keys and resist looking at the keyboard!

Consistency now will pay off in speed and accuracy later.

Keep it up,
The Typetech Team`,
  },
  {
    id: 'custom',
    name: 'Custom Message',
    subject: '',
    body: '',
  },
]

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Students' },
  { value: 'cohort', label: 'By Cohort' },
  { value: 'style', label: 'By Typing Style' },
  { value: 'status', label: 'By Final Status' },
]

const TEMPLATES_STORAGE_KEY = 'typetech_message_templates'

export default function MessagesPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  // Compose state
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('custom')

  // Recipient filter state
  const [filterType, setFilterType] = useState('all')
  const [filterCohort, setFilterCohort] = useState('')
  const [filterStyle, setFilterStyle] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // UI state
  const [showRecipients, setShowRecipients] = useState(false)
  const [sending, setSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([])

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [{ data: studs }, { data: cohortData }] = await Promise.all([
        supabase.from('students').select('id, name, email, cohort_id, typing_style, final_status').order('name'),
        supabase.from('cohorts').select('id, name'),
      ])
      setStudents(studs || [])
      const sorted = (cohortData || []).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
      setCohorts(sorted)
      setLoadingStudents(false)
    }
    load()

    // Load saved templates from localStorage
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
      if (stored) setSavedTemplates(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  // ── All templates = built-in + saved ──────────────────────────────────────
  const allTemplates = useMemo(() => [...BUILTIN_TEMPLATES, ...savedTemplates], [savedTemplates])

  // ── Filtered recipients ────────────────────────────────────────────────────
  const recipients = useMemo(() => {
    return students.filter(s => {
      if (!s.email) return false
      if (filterType === 'cohort') return filterCohort ? s.cohort_id === filterCohort : true
      if (filterType === 'style') return filterStyle ? s.typing_style === filterStyle : true
      if (filterType === 'status') return filterStatus ? s.final_status === filterStatus : true
      return true
    })
  }, [students, filterType, filterCohort, filterStyle, filterStatus])

  // ── Template selection ─────────────────────────────────────────────────────
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tpl = allTemplates.find(t => t.id === templateId)
    if (tpl && tpl.id !== 'custom') {
      setSubject(tpl.subject)
      setBody(tpl.body)
    } else if (tpl?.id === 'custom') {
      setSubject('')
      setBody('')
    }
  }

  // ── Save template ──────────────────────────────────────────────────────────
  const handleSaveTemplate = () => {
    if (!newTemplateName.trim() || !subject || !body) return
    const newTpl: Template = {
      id: `saved-${Date.now()}`,
      name: newTemplateName.trim(),
      subject,
      body,
    }
    const updated = [...savedTemplates, newTpl]
    setSavedTemplates(updated)
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated))
    toast.success(`Template "${newTpl.name}" saved`)
    setShowSaveTemplate(false)
    setNewTemplateName('')
  }

  const handleDeleteSavedTemplate = (id: string) => {
    const updated = savedTemplates.filter(t => t.id !== id)
    setSavedTemplates(updated)
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated))
    if (selectedTemplateId === id) {
      setSelectedTemplateId('custom')
      setSubject('')
      setBody('')
    }
    toast.success('Template deleted')
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) return
    setSending(true)
    setShowConfirm(false)
    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, recipients }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      toast.success(`Sent to ${data.sent} student${data.sent !== 1 ? 's' : ''}${data.failed > 0 ? ` (${data.failed} failed)` : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send messages')
    } finally {
      setSending(false)
    }
  }

  const canSend = subject.trim() && body.trim() && recipients.length > 0

  // Preview: substitute {{name}} with first recipient's name for display
  const previewBody = body.replace(/\{\{name\}\}/g, recipients[0]?.name?.split(' ')[0] || 'Student')
    .replace(/\{\{fullname\}\}/g, recipients[0]?.name || 'Student Name')

  if (loadingStudents) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Send emails to students individually or in bulk</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Compose ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Template picker */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Template</h2>
              {savedTemplates.length > 0 && (
                <span className="text-xs text-gray-400">{savedTemplates.length} saved</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allTemplates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl.id)}
                  className={`flex items-center justify-between text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    selectedTemplateId === tpl.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BookTemplate size={14} className="flex-shrink-0" />
                    <span className="truncate">{tpl.name}</span>
                  </div>
                  {savedTemplates.some(s => s.id === tpl.id) && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteSavedTemplate(tpl.id) }}
                      className="ml-2 flex-shrink-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Compose */}
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Compose</h2>
            <Input
              label="Subject"
              value={subject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
              placeholder="Enter email subject…"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={12}
                placeholder="Write your message here…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                Variables: <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code> → first name,{' '}
                <code className="bg-gray-100 px-1 rounded">{'{{fullname}}'}</code> → full name
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveTemplate(true)}
                disabled={!subject || !body}
              >
                <Save size={14} className="mr-1.5" />
                Save as Template
              </Button>
            </div>
          </Card>

          {/* Preview */}
          {body && (
            <Card className="p-4">
              <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">
                Preview
                {recipients[0] && <span className="font-normal text-gray-400 ml-1">(as sent to {recipients[0].name.split(' ')[0]})</span>}
              </h2>
              <div className="border rounded-lg p-4 bg-gray-50">
                {subject && <p className="font-medium text-sm text-gray-900 mb-2">Subject: {subject.replace(/\{\{name\}\}/g, recipients[0]?.name?.split(' ')[0] || 'Student')}</p>}
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{previewBody}</div>
              </div>
            </Card>
          )}
        </div>

        {/* ── Right: Recipients ── */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Recipients</h2>

            <Select
              label="Send to"
              value={filterType}
              onValueChange={val => { setFilterType(val); setFilterCohort(''); setFilterStyle(''); setFilterStatus('') }}
            >
              {FILTER_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </Select>

            {filterType === 'cohort' && (
              <Select
                label="Cohort"
                value={filterCohort || 'placeholder'}
                onValueChange={val => setFilterCohort(val === 'placeholder' ? '' : val)}
              >
                <SelectItem value="placeholder">All cohorts</SelectItem>
                {cohorts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </Select>
            )}

            {filterType === 'style' && (
              <Select
                label="Typing Style"
                value={filterStyle || 'placeholder'}
                onValueChange={val => setFilterStyle(val === 'placeholder' ? '' : val)}
              >
                <SelectItem value="placeholder">Any style</SelectItem>
                <SelectItem value="Hunting">Hunting</SelectItem>
                <SelectItem value="Homerow">Homerow</SelectItem>
              </Select>
            )}

            {filterType === 'status' && (
              <Select
                label="Final Status"
                value={filterStatus || 'placeholder'}
                onValueChange={val => setFilterStatus(val === 'placeholder' ? '' : val)}
              >
                <SelectItem value="placeholder">Any status</SelectItem>
                <SelectItem value="Complete">Complete</SelectItem>
                <SelectItem value="Pass">Pass</SelectItem>
                <SelectItem value="Fail">Fail</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </Select>
            )}

            {/* Count + toggle */}
            <button
              onClick={() => setShowRecipients(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm"
            >
              <div className="flex items-center gap-2">
                <Users size={15} className="text-gray-500" />
                <span className="font-medium text-gray-700">{recipients.length} recipient{recipients.length !== 1 ? 's' : ''}</span>
              </div>
              {showRecipients ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
            </button>

            {showRecipients && (
              <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-2">
                {recipients.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No matching students</p>
                ) : recipients.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-800">{r.name}</span>
                    <span className="text-xs text-gray-400 truncate ml-2 max-w-[140px]">{r.email}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!canSend || sending}
              onClick={() => setShowConfirm(true)}
            >
              <Send size={15} className="mr-2" />
              {sending ? 'Sending…' : `Send to ${recipients.length} student${recipients.length !== 1 ? 's' : ''}`}
            </Button>
          </Card>

          {/* Recurring tip */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="text-sm font-semibold text-blue-800 mb-1">Recurring Reminders</h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              Save your weekly reminder as a template, then open it each week and hit Send.
              For fully automated scheduling, Vercel Cron Jobs can trigger this endpoint on a schedule.
            </p>
          </Card>
        </div>
      </div>

      {/* ── Confirm Send Dialog ── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send message?</DialogTitle>
            <DialogDescription>
              This will send <strong>{recipients.length} email{recipients.length !== 1 ? 's' : ''}</strong> with the subject:
              <br /><em className="text-gray-700">"{subject}"</em>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending}>
              <Send size={14} className="mr-1.5" />
              {sending ? 'Sending…' : 'Confirm Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Template Dialog ── */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Give this template a name so you can reuse it later.</DialogDescription>
          </DialogHeader>
          <Input
            label="Template name"
            value={newTemplateName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTemplateName(e.target.value)}
            placeholder="e.g. Week 3 Reminder"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
            <Button disabled={!newTemplateName.trim()} onClick={handleSaveTemplate}>
              <Save size={14} className="mr-1.5" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
