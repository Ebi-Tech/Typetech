'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { NotificationBell } from './NotificationBell'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/attendance': 'Attendance',
  '/certificates': 'Certificates',
  '/messages': 'Messages',
  '/invites': 'Invites',
  '/settings': 'Settings',
}

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const [userInitial, setUserInitial] = useState('A')
  const [userName, setUserName] = useState('Admin')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const displayName =
        user.user_metadata?.full_name || user.email || 'Admin'
      setUserName(displayName.split(' ')[0])
      setUserInitial(displayName[0].toUpperCase())
    })
  }, [])

  const pageTitle = PAGE_TITLES[pathname] ?? 'Typetech'

  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Page title — brand on mobile (sidebar hidden), page on desktop */}
        <span className="font-semibold text-gray-900 lg:hidden">Typetech</span>
        <span className="hidden font-semibold text-gray-900 lg:block">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <div className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-gray-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            {userInitial}
          </div>
          <span className="hidden text-sm font-medium text-gray-700 md:block">
            {userName}
          </span>
        </div>
      </div>
    </header>
  )
}
