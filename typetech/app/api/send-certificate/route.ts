import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

function toHtml(text: string) {
  return text
    .split(/\n\n+/)
    .map(p => `<p style="margin: 0 0 12px 0;">${p.replace(/\n/g, '<br />')}</p>`)
    .join('')
}

export async function POST(request: Request) {
  try {
    const { studentName, studentEmail, certificateUrl, subject, body } = await request.json()

    if (!studentName || !studentEmail || !certificateUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const firstName = studentName.split(' ')[0]

    // Use custom template if provided, otherwise fall back to default
    const emailSubject = subject
      ? subject.replace(/\{\{name\}\}/g, firstName).replace(/\{\{fullname\}\}/g, studentName)
      : 'Congratulations! Your Typing Class Certificate'

    const emailHtml = body
      ? `<div style="font-family: sans-serif;">${
          toHtml(
            body
              .replace(/\{\{name\}\}/g, firstName)
              .replace(/\{\{fullname\}\}/g, studentName)
          )
        }</div>`
      : `<div style="font-family: sans-serif;">
          <p>Congratulations, ${studentName}!</p>
          <p>Your certificate of completion for the Typing Class is attached to this email.</p>
          <p>Well done on completing the curriculum and meeting the requirements of 40 WPM!</p>
          <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">
            Keep improving yourself!<br />Turikumwe 🎉
          </p>
        </div>`

    const pdfResponse = await fetch(certificateUrl)
    if (!pdfResponse.ok) throw new Error('Failed to fetch certificate PDF')
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: studentEmail,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: `${studentName.replace(/\s+/g, '_')}_Certificate.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to send certificate email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
