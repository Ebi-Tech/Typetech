import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Pass cache: 'no-store' to every fetch the Supabase SDK makes internally
// so Next.js never serves a stale listUsers() response
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (url: RequestInfo | URL, init?: RequestInit) =>
        fetch(url, { ...init, cache: 'no-store' }),
    },
  }
)

export async function GET() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
