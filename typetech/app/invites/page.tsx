'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Mail, Copy, Send, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Invite {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
  token: string
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [newInviteEmail, setNewInviteEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvites(data || [])
    } catch (error) {
      toast.error('Failed to load invites')
    } finally {
      setLoading(false)
    }
  }

  const generateInviteToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  const sendInvite = async () => {
    if (!newInviteEmail) {
      toast.error('Please enter an email address')
      return
    }

    // Check if email is already invited
    const existing = invites.find(i => i.email === newInviteEmail)
    if (existing && existing.status === 'pending') {
      toast.error('An invite has already been sent to this email')
      return
    }

    setSending(true)
    try {
      const token = generateInviteToken()
      const inviteLink = `${window.location.origin}/login?invite=${token}`

      // Save invite to database
      const { error } = await supabase
        .from('invites')
        .insert([{
          email: newInviteEmail,
          token: token,
          status: 'pending'
        }])

      if (error) throw error

      // Copy link to clipboard
      await navigator.clipboard.writeText(inviteLink)
      
      toast.success('Invite link copied to clipboard!')
      setNewInviteEmail('')
      fetchInvites()
    } catch (error) {
      toast.error('Failed to create invite')
    } finally {
      setSending(false)
    }
  }

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/login?invite=${token}`
    await navigator.clipboard.writeText(link)
    toast.success('Invite link copied to clipboard')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      default:
        return <Badge variant="warning">Pending</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invite Facilitators</h1>
      </div>

      {/* Invite Form */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Send New Invite</h2>
        <div className="flex gap-4">
          <Input
            className="flex-1"
            placeholder="Enter email address (e.g., name@alueducation.com)"
            value={newInviteEmail}
            onChange={(e) => setNewInviteEmail(e.target.value)}
          />
          <Button onClick={sendInvite} disabled={sending}>
            <Send size={16} className="mr-2" />
            {sending ? 'Creating...' : 'Create Invite'}
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Invite links expire in 7 days. Users with @alueducation.com emails can also sign in directly.
        </p>
      </Card>

      {/* Invites List */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold">Recent Invites</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading invites...</div>
        ) : invites.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No invites sent yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-400" />
                        <span className="font-medium">{invite.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(invite.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(invite.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {invite.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyInviteLink(invite.token)}
                        >
                          <Copy size={16} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
