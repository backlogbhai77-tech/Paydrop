import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req) {
  try {
    const { clientEmail, clientName, portalUrl, projectTitle } = await req.json()

    const data = await resend.emails.send({
      from: 'PayDrop <onboarding@resend.dev>',
      to: [clientEmail],
      subject: `Deliverable Preview Ready: ${projectTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a;">Hello ${clientName || 'Client'},</h2>
          <p style="color: #475569; font-size: 14px;">Your files for <strong>${projectTitle}</strong> are ready for inspection on PayDrop.</p>
          <div style="margin: 24px 0;">
            <a href="${portalUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              View Deliverables & Release Payment
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This link includes protected watermarked previews. Full master assets will unlock automatically upon payment settlement.</p>
        </div>
      `,
    })

    return Response.json({ success: true, data })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

