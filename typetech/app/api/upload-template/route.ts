import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TEMPLATE_PATH = 'certificate-template/template.pdf'

// Returns a short-lived signed upload URL so the browser can PUT the certificate
// template PDF directly to Supabase Storage. Vercel's serverless functions cap
// request bodies at 4.5MB regardless of plan — proxying the file through this
// route (as before) hit that ceiling on larger templates. Routing the actual
// bytes straight from the browser to Supabase avoids that limit entirely.
export async function POST() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin.storage
      .from('certificates')
      .createSignedUploadUrl(TEMPLATE_PATH, { upsert: true })

    if (error) throw error

    return NextResponse.json({ path: data.path, token: data.token })
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Signed upload URL error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
