import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Delete in dependency order (children before parents)
    await supabaseAdmin.from('email_logs').delete().not('id', 'is', null)
    await supabaseAdmin.from('certificates').delete().not('id', 'is', null)
    await supabaseAdmin.from('attendance').delete().not('id', 'is', null)
    await supabaseAdmin.from('week_data').delete().not('id', 'is', null)
    await supabaseAdmin.from('students').delete().not('id', 'is', null)

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Wipe error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
