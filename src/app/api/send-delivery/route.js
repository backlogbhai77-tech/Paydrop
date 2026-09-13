import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req) {
  try {
    const { clientEmail, clientName, creatorName, projectTitle, amount, deliveryUrl } = await req.json()

    if (!clientEmail) {
      return NextResponse.json({ error: "Client email is required" }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS
      }
    })

    await transporter.sendMail({
      from: `"ReleaseDrop Escrow" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
      subject: `Protected Deliverables Ready: ${projectTitle} from ${creatorName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #070B14; color: #F8FAFC; border-radius: 16px; border: 1px solid #1E293B;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">⚡ ReleaseDrop</span>
            <span style="background: rgba(37, 99, 235, 0.2); color: #60A5FA; border: 1px solid rgba(37, 99, 235, 0.4); font-size: 10px; font-family: monospace; padding: 2px 8px; border-radius: 9999px; margin-left: 8px;">ESCROW PROTECTED</span>
          </div>

          <h2 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px 0;">Final Production Files Ready</h2>
          <p style="font-size: 14px; color: #94A3B8; line-height: 1.6; margin: 0 0 20px 0;">
            Hi <strong>${clientName || 'there'}</strong>,<br/>
            <strong>${creatorName}</strong> has prepared and escrow-locked the final master assets for <strong>${projectTitle}</strong>.
          </p>

          <div style="background: #0B132B; border: 1px solid #1E293B; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
            <div style="font-size: 10px; font-family: monospace; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Required Settlement</div>
            <div style="font-size: 26px; font-weight: 900; color: #38BDF8; margin-top: 4px;">₹${Number(amount).toLocaleString('en-IN')}</div>
            <div style="font-size: 12px; color: #94A3B8; margin-top: 6px;">Watermarked inspection mode is active until payment authorization.</div>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${deliveryUrl}" style="background: #2563EB; color: #FFFFFF; padding: 14px 28px; border-radius: 12px; font-size: 13px; font-weight: 800; text-decoration: none; display: inline-block;">
              Inspect & Unlock Master Files →
            </a>
          </div>

          <p style="font-size: 11px; color: #64748B; line-height: 1.5; border-top: 1px solid #1E293B; padding-top: 18px; margin: 0;">
            This link is protected by ReleaseDrop Escrow. Master production assets will decrypt instantly upon verified settlement.
          </p>
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Email send failed:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
