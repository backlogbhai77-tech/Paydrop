import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { db } from '../../../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    // -------------------------------------------------------------
    // 1. ACTION: CREATE RAZORPAY PAYMENT ORDER
    // -------------------------------------------------------------
    if (action === 'create-order') {
      const { deliveryId, amount } = body

      if (!deliveryId || !amount) {
        return NextResponse.json({ success: false, error: 'deliveryId and amount are required' }, { status: 400 })
      }

      const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY
      const key_secret = process.env.RAZORPAY_KEY_SECRET

      // Sandbox / Mock Fallback if keys are missing
      if (!key_id || !key_secret) {
        console.log(`[PayDrop Mock] Razorpay Order Created for Vault: ${deliveryId}`)
        return NextResponse.json({
          success: true,
          orderId: `order_mock_${Date.now()}`,
          amount: Math.round(Number(amount) * 100),
          currency: 'INR',
          isMock: true
        })
      }

      const authHeader = Buffer.from(`${key_id}:${key_secret}`).toString('base64')
      
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(Number(amount) * 100),
          currency: 'INR',
          receipt: `rcpt_${deliveryId.slice(0, 10)}`,
          notes: { deliveryId }
        })
      })

      const order = await rzpRes.json()

      if (!rzpRes.ok) {
        return NextResponse.json({ success: false, error: order.error?.description || 'Razorpay order creation failed' }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        isMock: false
      })
    }

    // -------------------------------------------------------------
    // 2. ACTION: VERIFY PAYMENT SIGNATURE & UNLOCK ESCROW VAULT
    // -------------------------------------------------------------
    if (action === 'verify-payment') {
      const { deliveryId, razorpay_order_id, razorpay_payment_id, razorpay_signature, isMock } = body

      if (!deliveryId) {
        return NextResponse.json({ success: false, error: 'deliveryId is required' }, { status: 400 })
      }

      // Sandbox Verification Mode
      if (isMock) {
        const docRef = doc(db, 'deliveries', deliveryId)
        await updateDoc(docRef, {
          status: 'Paid',
          paidAt: new Date().toISOString(),
          paymentGatewayId: 'MOCK_SANDBOX_SUCCESS'
        })
        return NextResponse.json({ success: true, verified: true, mode: 'sandbox' })
      }

      const secret = process.env.RAZORPAY_KEY_SECRET || ''
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (expectedSignature !== razorpay_signature) {
        return NextResponse.json({ success: false, error: 'Invalid Razorpay Signature' }, { status: 400 })
      }

      const docRef = doc(db, 'deliveries', deliveryId)
      await updateDoc(docRef, {
        status: 'Paid',
        paidAt: new Date().toISOString(),
        paymentGatewayId: razorpay_payment_id
      })

      return NextResponse.json({ success: true, verified: true })
    }

    // -------------------------------------------------------------
    // 3. ACTION: AUTOMATED BACKGROUND EMAIL DISPATCH (PayDrop Theme)
    // -------------------------------------------------------------
    const { clientEmail, clientName, creatorName, projectTitle, amount, deliveryUrl, isReminder } = body

    if (!clientEmail) {
      return NextResponse.json({ success: false, error: 'Client email is required' }, { status: 400 })
    }

    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpUser || !smtpPass) {
      console.log(`[PayDrop Mock Email] Dispatched in background to ${clientEmail} -> URL: ${deliveryUrl}`)
      return NextResponse.json({
        success: true,
        message: 'Mock email dispatch successful (Configure SMTP_USER & SMTP_PASS for live SMTP)',
        deliveryUrl
      })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass }
    })

    const subject = isReminder
      ? `[Payment Reminder] ${projectTitle} - Deliverables Awaiting Escrow Release`
      : `[PayDrop Vault] ${projectTitle} - Deliverables ready from ${creatorName || 'Creator'}`

    // NEW BRANDED EMAIL TEMPLATE (Soft Mint + Emerald Theme)
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #F0F5EE; border-radius: 24px; padding: 32px; color: #0F172A;">
        
        <!-- Header -->
        <div style="margin-bottom: 24px; text-align: left;">
          <div style="display: inline-block; background: #94EC36; color: #063D2A; font-weight: 900; font-size: 18px; padding: 8px 16px; border-radius: 12px; margin-bottom: 12px;">
            P
          </div>
          <h2 style="color: #063D2A; margin: 0; font-size: 22px; font-weight: 800;">PayDrop Studio</h2>
          <p style="color: #64748B; font-size: 12px; margin-top: 4px;">Automated Escrow & Deliverable Handover</p>
        </div>

        <!-- Body Box -->
        <div style="background: #FFFFFF; border-radius: 20px; padding: 24px; border: 1px solid #E2E8F0; margin-bottom: 24px;">
          <p style="font-size: 14px; margin-top: 0; color: #334155;">Hello <strong>${clientName || 'Client'}</strong>,</p>
          <p style="font-size: 14px; color: #334155; leading-height: 1.6;">
            <strong>${creatorName || 'Your Creator'}</strong> has uploaded secured master deliverables for project: <br/>
            <span style="font-size: 16px; font-weight: 800; color: #063D2A;">"${projectTitle}"</span>
          </p>

          <div style="background: #063D2A; border-radius: 16px; padding: 20px; text-align: center; color: #FFFFFF; margin: 20px 0;">
            <span style="font-size: 11px; color: #94EC36; letter-spacing: 1px; font-weight: 700; text-transform: uppercase;">SECURED ESCROW AMOUNT</span>
            <div style="font-size: 28px; font-weight: 900; color: #FFFFFF; margin-top: 4px; font-family: monospace;">
              ₹${Number(amount || 0).toLocaleString('en-IN')}
            </div>
            <span style="font-size: 10px; color: #A7F3D0;">Funds remain in escrow until you approve final files</span>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${deliveryUrl}" style="background: #063D2A; color: #FFFFFF; text-decoration: none; padding: 14px 32px; font-weight: 800; font-size: 13px; border-radius: 14px; display: inline-block; border: 1px solid #063D2A;">
              Inspect & Unlock Deliverables →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <p style="text-align: center; font-size: 11px; color: #94A3B8; margin: 0;">
          Protected by PayDrop Studio • SSL Encrypted Escrow Vault
        </p>
      </div>
    `

    await transporter.sendMail({
      from: `"PayDrop Vault" <${smtpUser}>`,
      to: clientEmail,
      subject,
      html: htmlContent
    })

    return NextResponse.json({ success: true, message: 'Background email dispatched successfully' })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
