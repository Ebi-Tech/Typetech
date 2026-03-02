import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getCallerIfAdmin() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { caller: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.app_metadata?.role !== 'admin') return { caller: null, error: NextResponse.json({ error: 'Forbidden: admins only' }, { status: 403 }) }
  return { caller: user, error: null }
}

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { caller, error } = await getCallerIfAdmin()
  if (error) return error

  const targetId = params.id

  if (caller!.id === targetId) {
    return NextResponse.json({ error: 'You are already an admin' }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetId,
    { app_metadata: { role: 'admin' } }
  )

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { caller, error } = await getCallerIfAdmin()
  if (error) return error

  const targetId = params.id

  if (caller!.id === targetId) {
    return NextResponse.json({ error: 'You cannot delete yourself' }, { status: 400 })
  }

  // Prevent deleting another admin
  const { data: { user: target } } = await supabaseAdmin.auth.admin.getUserById(targetId)
  if (target?.app_metadata?.role === 'admin') {
    return NextResponse.json({ error: 'Cannot delete an admin user' }, { status: 403 })
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
