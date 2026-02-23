'use client'

import { Menu, Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </Button>
        <h2 className="text-lg font-semibold">Welcome back, Admin</h2>
      </div>
      
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm">
          <Bell size={20} />
        </Button>
        <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium">
          A
        </div>
      </div>
    </header>
  )
}
