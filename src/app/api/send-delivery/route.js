import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req) {
  try {
    const { clientEmail, clientName, creatorName, projectTitle, amount, deliveryUrl, isReminder } = await req.json()

    if (!clientEmail) {
      return NextResponse.json({ success: false, error: 'Client email is required' }, { status: 400 })
    }

    // SMTP Configuration Check
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpUser || !smtpPass) {
      console.log('SMTP keys not set in env. Delivery Link:', deliveryUrl)
      return NextResponse.json({
        success: true,
        message: 'Mock dispatch success (Configure SMTP_USER & SMTP_PASS in Vercel for live inbox delivery)',
        deliveryUrl
      })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    })

    const subject = isReminder
      ? `Payment Reminder: ${projectTitle} Deliverables Awaiting Release`
      : `Vault Sealed: ${projectTitle} Deliverables from ${creatorName}`

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #2563eb; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">ReleaseDrop Escrow Portal</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Tamper-Proof Creative Handoff</p>
        </div>
        <div style="padding: 28px; color: #1e293b;">
          <p style="font-size: 14px; margin-top: 0;">Hello <strong>${clientName}</strong>,</p>
          <p style="font-size: 13px; line-height: 1.6; color: #475569;">
            ${creatorName} has uploaded the final deliverables for <strong>${projectTitle}</strong>. 
            You can inspect the watermarked drafts and unlock original raw master assets upon settlement clearance.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-family: monospace;">Settlement Due</span>
            <div style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 2px;">₹${Number(amount || 0).toLocaleString('en-IN')}</div>
          </div>
          <div style="text-align: center; margin: 26px 0;">
            <a href="${deliveryUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: bold; border-radius: 10px; display: inline-block;">
              Inspect & Unlock Files →
            </a>
          </div>
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">
            Secured via ReleaseDrop Escrow. No registration required.
          </p>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `"ReleaseDrop" <${smtpUser}>`,
      to: clientEmail,
      subject,
      html: htmlContent
    })

    return NextResponse.json({ success: true, message: 'Email dispatched successfully' })
  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
