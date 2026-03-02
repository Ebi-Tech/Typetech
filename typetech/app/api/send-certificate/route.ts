import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { studentName, studentEmail, certificateUrl } = await request.json()

    if (!studentName || !studentEmail || !certificateUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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
      subject: 'Congratulations! Your Typing Class Certificate',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Congratulations, ${studentName}!</h2>
          <p>Your certificate of completion for the Typing Class is attached to this email.</p>
          <p>Well done on completing the curriculum and meeting the requirements of 40 WPM!</p>
          <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">
            Keeping improving yourself!<BR />
            Turikumwe 🎉
          </p>
        </div>
      `,
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
