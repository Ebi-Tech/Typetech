'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<unknown>(null)

  // Check session once
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setIsLoading(false)
    }

    checkSession()

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // 🔥 NO pathname here

  // Handle redirects separately
  useEffect(() => {
    if (isLoading) return

    if (!session && pathname !== '/login') {
      router.replace('/login')
    }

    if (session && pathname === '/login') {
      router.replace('/dashboard')
    }
  }, [session, pathname, isLoading, router])

  if (isLoading && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return <>{children}</>
}
