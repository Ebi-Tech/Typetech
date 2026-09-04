import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const certificatePath = (studentId: string, studentName: string) => {
  const safeName = studentName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')

  return `${studentId}/${safeName}_Certificate.pdf`
}

const createSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const saveCertificate = async (
  supabaseAdmin: ReturnType<typeof createSupabaseAdmin>,
  studentId: string,
  path: string,
) => {
  const { data: urlData } = supabaseAdmin.storage
    .from('certificates')
    .getPublicUrl(path)

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
  return urlData.publicUrl
}

export async function POST(request: Request) {
  try {
    // The browser sends only this small JSON request to our server. The PDF itself is
    // uploaded straight to Supabase with the returned short-lived token, avoiding
    // hosting-provider request-size limits (HTTP 413).
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json() as {
        action?: 'sign' | 'confirm'
        studentId?: string
        studentName?: string
      }

      if (!body.studentId || !body.studentName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const supabaseAdmin = createSupabaseAdmin()
      const path = certificatePath(body.studentId, body.studentName)

      if (body.action === 'sign') {
        const { data, error } = await supabaseAdmin.storage
          .from('certificates')
          .createSignedUploadUrl(path, { upsert: true })

        if (error) throw error
        return NextResponse.json({ path: data.path, token: data.token })
      }

      if (body.action === 'confirm') {
        const url = await saveCertificate(supabaseAdmin, body.studentId, path)
        return NextResponse.json({ url })
      }

      return NextResponse.json({ error: 'Invalid upload action' }, { status: 400 })
    }

    // Preserve the original multipart API for any existing callers. New certificate
    // generation uses the signed-upload flow above.
    const formData = await request.formData()
    const file = formData.get('file') as File
    const studentId = formData.get('studentId') as string
    const studentName = formData.get('studentName') as string

    if (!file || !studentId || !studentName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const path = certificatePath(studentId, studentName)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('certificates')
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const url = await saveCertificate(supabaseAdmin, studentId, path)
    return NextResponse.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Certificate upload error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
