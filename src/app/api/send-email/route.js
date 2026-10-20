import nodemailer from 'nodemailer'

export async function POST(req) {
  try {
    const { clientEmail, clientName, portalUrl, projectTitle } = await req.json()

    // Gmail Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    })

    const mailOptions = {
      from: `"PayDrop" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
      subject: `Deliverable Preview Ready: ${projectTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a;">Hello ${clientName || 'Client'},</h2>
          <p style="color: #475569; font-size: 14px;">Your deliverables for <strong>${projectTitle}</strong> are ready on PayDrop.</p>
          <div style="margin: 24px 0;">
            <a href="${portalUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              View Preview & Release Payment
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">Watermarked previews are available immediately. Master files unlock once payment is settled.</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    return Response.json({ success: true, messageId: info.messageId })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
