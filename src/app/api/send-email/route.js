import nodemailer from 'nodemailer'

const escapeHtml = value => String(value ?? '').replace(/[&<>\"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;',
}[char]))

export async function POST(req) {
  try {
    const body = await req.json()
    const clientEmail = String(body.clientEmail || '').trim()
    const clientName = String(body.clientName || 'Client').trim()
    const projectTitle = String(body.projectTitle || 'Your Project').trim()
    const portalUrl = String(body.portalUrl || '').trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return Response.json({ success: false, error: 'A valid client email is required.' }, { status: 400 })
    }
    if (!portalUrl) {
      return Response.json({ success: false, error: 'The client portal URL is required.' }, { status: 400 })
    }

    let parsedUrl
    try { parsedUrl = new URL(portalUrl) } catch {
      return Response.json({ success: false, error: 'The client portal URL is invalid.' }, { status: 400 })
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
      return Response.json({ success: false, error: 'The client portal must use HTTPS.' }, { status: 400 })
    }

    const smtpUser = process.env.GMAIL_USER || process.env.SMTP_USER
    const smtpPass = process.env.GMAIL_APP_PASS || process.env.SMTP_PASS
    if (!smtpUser || !smtpPass) {
      return Response.json({ success: false, error: 'Email is not configured. Set GMAIL_USER and GMAIL_APP_PASS (or SMTP_USER and SMTP_PASS) in the deployment environment.' }, { status: 503 })
    }

    const safeName = escapeHtml(clientName)
    const safeTitle = escapeHtml(projectTitle)
    const safeUrl = escapeHtml(parsedUrl.toString())
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })

    const info = await transporter.sendMail({
      from: `"PayDrop" <${smtpUser}>`,
      to: clientEmail,
      subject: `Deliverable Preview Ready: ${projectTitle}`.slice(0, 180),
      text: `Hello ${clientName},\n\nYour deliverables for ${projectTitle} are ready on PayDrop.\n\nOpen your project: ${parsedUrl.toString()}\n\nNote: PayDrop's current payment flow is a demo and does not confirm that real funds have been received.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#0f172a"><h2>Hello ${safeName},</h2><p>Your files for <strong>${safeTitle}</strong> are ready for review on PayDrop.</p><p><a href="${safeUrl}" style="display:inline-block;background:#063D2A;color:#fff;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Open project preview</a></p><p style="font-size:12px;color:#64748b">Payment status is currently a demo workflow and does not confirm receipt of real funds.</p></div>`,
    })

    return Response.json({ success: true, messageId: info.messageId })
  } catch (error) {
    console.error('PayDrop email dispatch failed:', error)
    return Response.json({ success: false, error: 'Email could not be sent. Check the email configuration and server logs.' }, { status: 500 })
  }
}
