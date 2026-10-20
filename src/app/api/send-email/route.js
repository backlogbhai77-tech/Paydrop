import nodemailer from 'nodemailer'

export async function POST(req) {
  try {
    const body = await req.json()
    const { clientEmail, clientName, portalUrl, projectTitle } = body

    if (!clientEmail) {
      return Response.json(
        { success: false, error: 'Client email is required' },
        { status: 400 }
      )
    }

    // Gmail Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    })

    // Ensuring portal URL always points to main live public site (No Vercel preview login wall)
    let finalLink = portalUrl
    if (portalUrl && portalUrl.includes('/d/')) {
      const vaultId = portalUrl.split('/d/')[1]
      finalLink = `https://paydrop-two.vercel.app/d/${vaultId}`
    } else if (!portalUrl) {
      finalLink = 'https://paydrop-two.vercel.app'
    }

    const mailOptions = {
      from: process.env.GMAIL_USER, // Strict Gmail user match for smooth delivery to ANY recipient
      to: clientEmail.trim(),       // Client's exact email address
      subject: `Deliverable Preview Ready: ${projectTitle || 'Your Project'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-bottom: 12px;">Hello ${clientName || 'Client'},</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">Your files for <strong>${projectTitle || 'your project'}</strong> are ready for inspection on PayDrop.</p>
          
          <div style="margin: 28px 0;">
            <a href="${finalLink}" target="_blank" style="background-color: #063D2A; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              View Preview & Release Payment →
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 12px; line-height: 1.4;">Watermarked previews are available immediately. Master files unlock automatically once payment is settled.</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', info.messageId)
    return Response.json({ success: true, messageId: info.messageId })

  } catch (error) {
    console.error('Nodemailer Error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
