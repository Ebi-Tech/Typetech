'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface InviteNotification {
  id: string
  email: string
}

const STORAGE_KEY = 'typetech_cleared_invite_ids'

function getClearedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<InviteNotification[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('invites')
      .select('id, email')
      .eq('status', 'accepted')

    if (!data) return
    const cleared = getClearedIds()
    setNotifications(data.filter(inv => !cleared.includes(inv.id)))
  }

  useEffect(() => {
    supabase
      .from('invites')
      .select('id, email')
      .eq('status', 'accepted')
      .then(({ data }) => {
        if (!data) return
        const cleared = getClearedIds()
        setNotifications(data.filter(inv => !cleared.includes(inv.id)))
      })

    // Poll every 60 s as a fallback
    const interval = setInterval(fetchNotifications, 60_000)

    // Realtime — fires when an invite row is updated to accepted
    // Requires Realtime enabled on the invites table in Supabase dashboard
    const channel = supabase
      .channel('invite-accepted')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'invites' },
        (payload) => {
          if (payload.new?.status === 'accepted') {
            fetchNotifications()
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  // Close popover when clicking outside
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const clearAll = () => {
    const cleared = getClearedIds()
    const updated = [...new Set([...cleared, ...notifications.map(n => n.id)])]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setNotifications([])
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No new notifications
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map(n => (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <span className="text-xs font-bold text-green-700">
                        {n.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{n.email}</p>
                      <p className="text-xs text-gray-500">Accepted their invite</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
