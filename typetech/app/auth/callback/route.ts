import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superAdmins'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const inviteToken = requestUrl.searchParams.get('invite')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }) } catch { }
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }) } catch { }
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email || ''

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const superAdmin = isSuperAdmin(email)

    // Only invited users are allowed — no domain bypass — except the
    // hardcoded super admin(s), who always get in regardless of invite state
    let isAuthorized = superAdmin
    if (!isAuthorized) {
      const { data: invite } = await supabaseAdmin
        .from('invites')
        .select('status, expires_at')
        .eq('email', email)
        .single()

      isAuthorized = !!invite && (
        invite.status === 'accepted' ||
        (invite.status === 'pending' && new Date(invite.expires_at) > new Date())
      )
    }

    if (!isAuthorized) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`)
    }

    // Super admins are always kept promoted to admin, even if their app_metadata drifted
    if (superAdmin && user?.app_metadata?.role !== 'admin') {
      await supabaseAdmin.auth.admin.updateUserById(user!.id, { app_metadata: { role: 'admin' } })
    }

    // Mark the invite token as accepted if one was used
    if (inviteToken) {
      await supabaseAdmin
        .from('invites')
        .update({ status: 'accepted' })
        .eq('token', inviteToken)
        .eq('status', 'pending')
    }
  }

  return NextResponse.redirect(requestUrl.origin)
}
