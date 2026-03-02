import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const studentId = formData.get('studentId') as string
    const studentName = formData.get('studentName') as string

    if (!file || !studentId || !studentName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileName = `${studentName.replace(/\s+/g, '_')}_Certificate.pdf`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('certificates')
      .upload(`${studentId}/${fileName}`, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage
      .from('certificates')
      .getPublicUrl(`${studentId}/${fileName}`)

    const { error: dbError } = await supabaseAdmin
      .from('certificates')
      .upsert({
        student_id: studentId,
        certificate_url: urlData.publicUrl,
        generated_at: new Date().toISOString(),
        email_sent: false,
        email_attempts: 0,
      })

    if (dbError) throw dbError

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Certificate upload error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
