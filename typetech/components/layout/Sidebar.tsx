'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Award,
  Settings,
  LogOut,
  Mail,
  MessageSquare,
  User,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { name: 'Certificates', href: '/certificates', icon: Award },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Invites', href: '/invites', icon: Mail },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null)
    })
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      toast.success('Signed out successfully')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <aside
      className={cn(
        // Base: flex column, white background, border
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-shrink-0 flex-col bg-white border-r shadow-lg transition-transform duration-200 ease-in-out',
        // Desktop: sticky in normal flow, no shadow needed, always visible
        'lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:shadow-none lg:translate-x-0',
        // Mobile: slide in/out
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo row */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between px-6 border-b">
        <h1 className="text-xl font-bold text-blue-600">Typetech</h1>
        <button
          onClick={onClose}
          className="lg:hidden rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User + sign-out */}
      <div className="flex-shrink-0 border-t p-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
            <User size={16} className="text-blue-600" />
          </div>
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-gray-900">
            {userEmail || '—'}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
