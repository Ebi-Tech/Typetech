import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { email, inviteLink } = await request.json()

    if (!email || !inviteLink) {
      return NextResponse.json({ error: 'Missing email or invite link' }, { status: 400 })
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

    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: email,
      subject: "You've been invited to Typetech",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2563eb;">You've been invited to Typetech</h2>
          <p>You've been invited to access the Typetech typing class admin dashboard.</p>
          <p>Click the link below to sign in. This link expires in 7 days.</p>
          <a
            href="${inviteLink}"
            style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #2563eb; color: white; border-radius: 6px; text-decoration: none; font-weight: 600;"
          >
            Accept Invite
          </a>
          <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">
            If you weren't expecting this invite, you can ignore this email.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to send invite email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
