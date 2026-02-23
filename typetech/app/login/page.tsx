'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Card } from '@/components/ui/Card'

// Allowed email domains and specific emails
const ALLOWED_DOMAINS = ['alueducation.com']
const ALLOWED_EMAILS = ['difebi14@gmail.com']

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams?.get('invite') || null // Safe access
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
        return
      }

      // If there's an invite token, validate it
      if (inviteToken) {
        await validateInvite(inviteToken)
      }
      
      setLoading(false)
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email) {
          const email = session.user.email
          const domain = email.split('@')[1]
          const isAllowed = ALLOWED_DOMAINS.includes(domain) || ALLOWED_EMAILS.includes(email)
          
          // If there was an invite, mark it as accepted
          if (inviteToken) {
            await supabase
              .from('invites')
              .update({ 
                status: 'accepted', 
                accepted_at: new Date().toISOString() 
              })
              .eq('token', inviteToken)
          }
          
          if (!isAllowed && !inviteToken) {
            await supabase.auth.signOut()
            setError('This email is not authorized to access this application')
          } else {
            router.push('/dashboard')
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, inviteToken])

  const validateInvite = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('email, status, expires_at')
        .eq('token', token)
        .single()

      if (error || !data) {
        setError('Invalid or expired invite link')
        return
      }

      if (data.status !== 'pending') {
        setError('This invite has already been used')
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invite link has expired')
        return
      }

      setInviteEmail(data.email)
    } catch (error) {
      setError('Invalid invite link')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <p>Loading...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Typetech</h1>
          <p className="text-gray-600 mt-2">
            {inviteEmail 
              ? `Sign in with your Google account to accept invite for ${inviteEmail}`
              : 'Sign in to access the admin dashboard'
            }
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!error && (
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="light"
            providers={['google']}
            onlyThirdPartyProviders
            redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined}
          />
        )}

        <p className="text-xs text-gray-500 text-center mt-6">
          {inviteEmail 
            ? 'Use the email address above to sign in'
            : 'Only @alueducation.com emails or invited users can sign in'
          }
        </p>
      </Card>
    </div>
  )
}
