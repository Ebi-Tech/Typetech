import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

    // Only invited users are allowed — no domain bypass
    const { data: invite } = await supabaseAdmin
      .from('invites')
      .select('status, expires_at')
      .eq('email', email)
      .single()

    const isAuthorized = !!invite && (
      invite.status === 'accepted' ||
      (invite.status === 'pending' && new Date(invite.expires_at) > new Date())
    )

    if (!isAuthorized) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`)
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
