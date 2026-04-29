import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

interface Recipient {
  id: string
  name: string
  email: string
}

export async function POST(request: Request) {
  try {
    const { subject, body, recipients } = await request.json() as {
      subject: string
      body: string
      recipients: Recipient[]
    }

    if (!subject || !body || !recipients?.length) {
      return NextResponse.json({ error: 'Missing subject, body, or recipients' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        // Substitute {{name}} in subject and body
        const personalizedSubject = subject.replace(/\{\{name\}\}/g, recipient.name.split(' ')[0])
        const personalizedBody = body
          .replace(/\{\{name\}\}/g, recipient.name.split(' ')[0])
          .replace(/\{\{fullname\}\}/g, recipient.name)

        // Wrap plain text in simple HTML if no HTML tags present
        const htmlBody = personalizedBody.includes('<')
          ? personalizedBody
          : personalizedBody
              .split('\n')
              .map(line => line.trim() ? `<p style="margin:0 0 12px 0;font-family:sans-serif;font-size:15px;color:#374151;">${line}</p>` : '<br/>')
              .join('')

        const html = `
          <div style="font-family:sans-serif;">
            ${htmlBody}
            <p style="margin-top:32px;font-size:12px;color:#9ca3af;">
              This message was sent via Typetech — ALU Typing Class Admin.
            </p>
          </div>
        `

        await transporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL,
          to: recipient.email,
          cc: process.env.SMTP_CC_EMAIL || undefined,
          subject: personalizedSubject,
          html,
        })

        // Log to email_logs
        await supabaseAdmin.from('email_logs').insert({
          student_id: recipient.id,
          email_type: 'notification',
          recipient_email: recipient.email,
          subject: personalizedSubject,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({ success: true, sent, failed })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Failed to send messages' }, { status: 500 })
  }
}
