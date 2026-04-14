'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectItem } from '@/components/ui/Select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  Send, Save, Trash2, Users, ChevronDown, ChevronUp,
  Search, X, BookTemplate, CheckSquare, Square,
} from 'lucide-react'
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
  { value: 'all',    label: 'All Students' },
  { value: 'cohort', label: 'By Cohort' },
  { value: 'style',  label: 'By Typing Style' },
  { value: 'status', label: 'By Final Status' },
  { value: 'pick',   label: 'Select Specific Students' },
]

const TEMPLATES_KEY = 'typetech_message_templates'

export default function MessagesPage() {
  const [students, setStudents]         = useState<Student[]>([])
  const [cohorts, setCohorts]           = useState<Cohort[]>([])
  const [loadingStudents, setLoading]   = useState(true)

  // Compose
  const [subject, setSubject]                   = useState('')
  const [body, setBody]                         = useState('')
  const [selectedTemplateId, setTemplateId]     = useState('custom')

  // Bulk filter
  const [filterType, setFilterType]     = useState('all')
  const [filterCohort, setFilterCohort] = useState('')
  const [filterStyle, setFilterStyle]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Manual pick
  const [pickedIds, setPickedIds]   = useState<Set<string>>(new Set())
  const [pickSearch, setPickSearch] = useState('')

  // UI
  const [showPreview, setShowPreview]           = useState(false)
  const [sending, setSending]                   = useState(false)
  const [showConfirm, setShowConfirm]           = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName]   = useState('')
  const [savedTemplates, setSavedTemplates]     = useState<Template[]>([])

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [{ data: studs }, { data: cohortData }] = await Promise.all([
        supabase.from('students').select('id, name, email, cohort_id, typing_style, final_status').order('name'),
        supabase.from('cohorts').select('id, name'),
      ])
      setStudents(studs || [])
      setCohorts((cohortData || []).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      ))
      setLoading(false)
    }
    load()
    try {
      const stored = localStorage.getItem(TEMPLATES_KEY)
      if (stored) setSavedTemplates(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const allTemplates = useMemo(() => [...BUILTIN_TEMPLATES, ...savedTemplates], [savedTemplates])

  // ── Recipients ────────────────────────────────────────────────────────────
  const recipients = useMemo(() => {
    if (filterType === 'pick') {
      return students.filter(s => s.email && pickedIds.has(s.id))
    }
    return students.filter(s => {
      if (!s.email) return false
      if (filterType === 'cohort') return filterCohort ? s.cohort_id === filterCohort : true
      if (filterType === 'style')  return filterStyle  ? s.typing_style === filterStyle : true
      if (filterType === 'status') return filterStatus ? s.final_status === filterStatus : true
      return true
    })
  }, [students, filterType, filterCohort, filterStyle, filterStatus, pickedIds])

  // Students visible in the manual picker (filtered by search)
  const pickableStudents = useMemo(() => {
    const q = pickSearch.trim().toLowerCase()
    return q ? students.filter(s => s.name.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)) : students
  }, [students, pickSearch])

  // ── Picker helpers ────────────────────────────────────────────────────────
  const togglePick = (id: string) => {
    setPickedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAllVisible = () => {
    setPickedIds(prev => {
      const next = new Set(prev)
      pickableStudents.forEach(s => next.add(s.id))
      return next
    })
  }

  const clearAllVisible = () => {
    setPickedIds(prev => {
      const next = new Set(prev)
      pickableStudents.forEach(s => next.delete(s.id))
      return next
    })
  }

  const allVisibleSelected = pickableStudents.length > 0 &&
    pickableStudents.every(s => pickedIds.has(s.id))

  // ── Template ──────────────────────────────────────────────────────────────
  const handleSelectTemplate = (templateId: string) => {
    setTemplateId(templateId)
    const tpl = allTemplates.find(t => t.id === templateId)
    if (tpl && tpl.id !== 'custom') { setSubject(tpl.subject); setBody(tpl.body) }
    else { setSubject(''); setBody('') }
  }

  const selectedIsSaved = savedTemplates.some(t => t.id === selectedTemplateId)

  const handleUpdateTemplate = () => {
    if (!selectedIsSaved || !subject || !body) return
    const updated = savedTemplates.map(t =>
      t.id === selectedTemplateId ? { ...t, subject, body } : t
    )
    setSavedTemplates(updated)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated))
    toast.success('Template updated')
  }

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim() || !subject || !body) return
    const newTpl: Template = { id: `saved-${Date.now()}`, name: newTemplateName.trim(), subject, body }
    const updated = [...savedTemplates, newTpl]
    setSavedTemplates(updated)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated))
    toast.success(`Template "${newTpl.name}" saved`)
    setShowSaveTemplate(false)
    setNewTemplateName('')
  }

  const handleDeleteSavedTemplate = (id: string) => {
    const updated = savedTemplates.filter(t => t.id !== id)
    setSavedTemplates(updated)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated))
    if (selectedTemplateId === id) { setTemplateId('custom'); setSubject(''); setBody('') }
    toast.success('Template deleted')
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
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

  const canSend = !!(subject.trim() && body.trim() && recipients.length > 0)
  const previewRecipient = recipients[0]
  const previewBody = body
    .replace(/\{\{name\}\}/g, previewRecipient?.name?.split(' ')[0] || 'Student')
    .replace(/\{\{fullname\}\}/g, previewRecipient?.name || 'Student Name')

  if (loadingStudents) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-500">Loading…</div></div>
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send emails to students individually or in bulk</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Compose ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Templates */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Template</h2>
              {savedTemplates.length > 0 && <span className="text-xs text-gray-400">{savedTemplates.length} saved</span>}
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
            <div className="flex gap-2">
              {selectedIsSaved && (
                <Button variant="outline" size="sm" onClick={handleUpdateTemplate} disabled={!subject || !body}>
                  <Save size={14} className="mr-1.5" />
                  Update Template
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowSaveTemplate(true)} disabled={!subject || !body}>
                <Save size={14} className="mr-1.5" />
                Save as New
              </Button>
            </div>
          </Card>

          {/* Preview */}
          {body && (
            <Card className="p-4">
              <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">
                Preview
                {previewRecipient && <span className="font-normal text-gray-400 ml-1">(as sent to {previewRecipient.name.split(' ')[0]})</span>}
              </h2>
              <div className="border rounded-lg p-4 bg-gray-50">
                {subject && (
                  <p className="font-medium text-sm text-gray-900 mb-2">
                    Subject: {subject.replace(/\{\{name\}\}/g, previewRecipient?.name?.split(' ')[0] || 'Student')}
                  </p>
                )}
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
              onValueChange={val => {
                setFilterType(val)
                setFilterCohort(''); setFilterStyle(''); setFilterStatus('')
                setPickedIds(new Set()); setPickSearch('')
              }}
            >
              {FILTER_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </Select>

            {/* Bulk sub-filters */}
            {filterType === 'cohort' && (
              <Select label="Cohort" value={filterCohort || 'placeholder'} onValueChange={val => setFilterCohort(val === 'placeholder' ? '' : val)}>
                <SelectItem value="placeholder">All cohorts</SelectItem>
                {cohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </Select>
            )}
            {filterType === 'style' && (
              <Select label="Typing Style" value={filterStyle || 'placeholder'} onValueChange={val => setFilterStyle(val === 'placeholder' ? '' : val)}>
                <SelectItem value="placeholder">Any style</SelectItem>
                <SelectItem value="Hunting">Hunting</SelectItem>
                <SelectItem value="Homerow">Homerow</SelectItem>
              </Select>
            )}
            {filterType === 'status' && (
              <Select label="Final Status" value={filterStatus || 'placeholder'} onValueChange={val => setFilterStatus(val === 'placeholder' ? '' : val)}>
                <SelectItem value="placeholder">Any status</SelectItem>
                <SelectItem value="Complete">Complete</SelectItem>
                <SelectItem value="Pass">Pass</SelectItem>
                <SelectItem value="Fail">Fail</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </Select>
            )}

            {/* ── Manual picker ── */}
            {filterType === 'pick' ? (
              <div className="space-y-2">
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={pickSearch}
                    onChange={e => setPickSearch(e.target.value)}
                    className="w-full pl-8 pr-7 h-8 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {pickSearch && (
                    <button onClick={() => setPickSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Select all / Clear row */}
                <div className="flex items-center justify-between text-xs px-0.5">
                  <button
                    onClick={allVisibleSelected ? clearAllVisible : selectAllVisible}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {allVisibleSelected
                      ? <><CheckSquare size={12} /> Deselect all ({pickableStudents.length})</>
                      : <><Square size={12} /> Select all ({pickableStudents.length})</>
                    }
                  </button>
                  {pickedIds.size > 0 && (
                    <button onClick={() => setPickedIds(new Set())} className="text-gray-400 hover:text-red-500">
                      Clear all
                    </button>
                  )}
                </div>

                {/* Checkbox list */}
                <div className="max-h-64 overflow-y-auto border rounded-lg divide-y divide-gray-100">
                  {pickableStudents.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No students found</p>
                  ) : pickableStudents.map(s => (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                        pickedIds.has(s.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={pickedIds.has(s.id)}
                        onChange={() => togglePick(s.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400 truncate">{s.email}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <p className="text-xs text-gray-500 text-right">
                  {pickedIds.size} student{pickedIds.size !== 1 ? 's' : ''} selected
                </p>
              </div>
            ) : (
              /* Bulk mode: collapsible preview list */
              <>
                <button
                  onClick={() => setShowPreview(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-gray-500" />
                    <span className="font-medium text-gray-700">{recipients.length} recipient{recipients.length !== 1 ? 's' : ''}</span>
                  </div>
                  {showPreview ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </button>

                {showPreview && (
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
              </>
            )}

            <Button className="w-full" disabled={!canSend || sending} onClick={() => setShowConfirm(true)}>
              <Send size={15} className="mr-2" />
              {sending ? 'Sending…' : `Send to ${recipients.length} student${recipients.length !== 1 ? 's' : ''}`}
            </Button>
          </Card>

          {/* Recurring tip */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="text-sm font-semibold text-blue-800 mb-1">Recurring Reminders</h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              Save your weekly reminder as a template, then load it each week and hit Send in one click.
              For fully automated scheduling, Vercel Cron Jobs can trigger this endpoint on a schedule.
            </p>
          </Card>
        </div>
      </div>

      {/* ── Confirm Send ── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send message?</DialogTitle>
            <DialogDescription>
              This will send <strong>{recipients.length} email{recipients.length !== 1 ? 's' : ''}</strong> with subject:
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

      {/* ── Save Template ── */}
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
