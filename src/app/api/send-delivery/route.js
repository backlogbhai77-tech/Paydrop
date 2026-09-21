import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { db } from '../../../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

// Safe Razorpay instance init
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY
  const key_secret = process.env.RAZORPAY_KEY_SECRET

  if (!key_id || !key_secret) return null
  return new Razorpay({ key_id, key_secret })
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    // -------------------------------------------------------------
    // ACTION 1: CREATE PAYMENT ORDER (Razorpay Test/Live)
    // -------------------------------------------------------------
    if (action === 'create-order') {
      const { deliveryId, amount } = body

      if (!deliveryId || !amount) {
        return NextResponse.json({ success: false, error: 'deliveryId and amount are required' }, { status: 400 })
      }

      const razorpay = getRazorpayInstance()

      // Sandbox Mock Fallback if Keys aren't configured in .env yet
      if (!razorpay) {
        return NextResponse.json({
          success: true,
          orderId: `order_mock_${Date.now()}`,
          amount: Math.round(Number(amount) * 100),
          currency: 'INR',
          isMock: true
        })
      }

      const options = {
        amount: Math.round(Number(amount) * 100), // Amount in paise
        currency: 'INR',
        receipt: `rcpt_${deliveryId.slice(0, 10)}_${Date.now().toString().slice(-6)}`,
        notes: { deliveryId }
      }

      const order = await razorpay.orders.create(options)
      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        isMock: false
      })
    }

    // -------------------------------------------------------------
    // ACTION 2: VERIFY PAYMENT SIGNATURE & UNLOCK FILES
    // -------------------------------------------------------------
    if (action === 'verify-payment') {
      const { deliveryId, razorpay_order_id, razorpay_payment_id, razorpay_signature, isMock } = body

      if (!deliveryId) {
        return NextResponse.json({ success: false, error: 'deliveryId is missing' }, { status: 400 })
      }

      // If simulated sandbox mode
      if (isMock) {
        const docRef = doc(db, 'deliveries', deliveryId)
        await updateDoc(docRef, {
          status: 'Paid',
          paidAt: new Date().toISOString(),
          paymentGatewayId: 'MOCK_TEST_PAID'
        })
        return NextResponse.json({ success: true, verified: true, mode: 'sandbox' })
      }

      // Live Cryptographic Verification
      const secret = process.env.RAZORPAY_KEY_SECRET || ''
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ success: false, error: 'Invalid payment signature' }, { status: 400 })
      }

      // Safe Server-Side status update
      const docRef = doc(db, 'deliveries', deliveryId)
      await updateDoc(docRef, {
        status: 'Paid',
        paidAt: new Date().toISOString(),
        paymentGatewayId: razorpay_payment_id
      })

      return NextResponse.json({ success: true, verified: true })
    }

    // -------------------------------------------------------------
    // ACTION 3: DISPATCH CLIENT HANDOVER EMAIL
    // -------------------------------------------------------------
    const { clientEmail, clientName, creatorName, projectTitle, amount, deliveryUrl, isReminder } = body

    if (!clientEmail) {
      return NextResponse.json({ success: false, error: 'Client email is required' }, { status: 400 })
    }

    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({
        success: true,
        message: 'Mock dispatch success (Configure SMTP_USER & SMTP_PASS for inbox delivery)',
        deliveryUrl
      })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass }
    })

    const subject = isReminder
      ? `Payment Reminder: ${projectTitle} Deliverables Awaiting Release`
      : `Vault Sealed: ${projectTitle} Deliverables from ${creatorName || 'Your Creator'}`

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #0f172a; padding: 28px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">PayDrop Vault</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.75; font-family: monospace;">PAYMENT-LOCKED ESCROW HANDOVER</p>
        </div>
        <div style="padding: 32px; color: #1e293b;">
          <p style="font-size: 14px; margin-top: 0;">Hello <strong>${clientName}</strong>,</p>
          <p style="font-size: 13px; line-height: 1.6; color: #475569;">
            ${creatorName || 'The creator'} has uploaded the final deliverables for <strong>${projectTitle}</strong>. 
            You can inspect watermarked drafts in your browser and automatically unlock master files upon payment clearance.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 24px 0; text-align: center;">
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-family: monospace; font-weight: bold;">Settlement Due</span>
            <div style="font-size: 28px; font-weight: 900; color: #0f172a; margin-top: 2px;">₹${Number(amount || 0).toLocaleString('en-IN')}</div>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${deliveryUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 13px 32px; font-size: 13px; font-weight: bold; border-radius: 12px; display: inline-block;">
              Inspect & Unlock Deliverables →
            </a>
          </div>
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">
            Secured via PayDrop Escrow. Zero registration required for clients.
          </p>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `"PayDrop" <${smtpUser}>`,
      to: clientEmail,
      subject,
      html: htmlContent
    })

    return NextResponse.json({ success: true, message: 'Email dispatched successfully' })
  } catch (error) {
    console.error('API send-delivery error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
