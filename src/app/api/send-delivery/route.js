import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { db } from '../../../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    // 1. CREATE PAYMENT ORDER (Direct REST API - Zero NPM Package Required)
    if (action === 'create-order') {
      const { deliveryId, amount } = body

      if (!deliveryId || !amount) {
        return NextResponse.json({ success: false, error: 'deliveryId and amount are required' }, { status: 400 })
      }

      const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY
      const key_secret = process.env.RAZORPAY_KEY_SECRET

      // Sandbox Mock Fallback (Agar keys set nahi hain toh UI crash nahi hoga)
      if (!key_id || !key_secret) {
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
        return NextResponse.json({ success: false, error: order.error?.description || 'Razorpay order failed' }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        isMock: false
      })
    }

    // 2. VERIFY PAYMENT SIGNATURE & UNLOCK FILES
    if (action === 'verify-payment') {
      const { deliveryId, razorpay_order_id, razorpay_payment_id, razorpay_signature, isMock } = body

      if (!deliveryId) {
        return NextResponse.json({ success: false, error: 'deliveryId is missing' }, { status: 400 })
      }

      // Sandbox Verification
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
        return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 })
      }

      const docRef = doc(db, 'deliveries', deliveryId)
      await updateDoc(docRef, {
        status: 'Paid',
        paidAt: new Date().toISOString(),
        paymentGatewayId: razorpay_payment_id
      })

      return NextResponse.json({ success: true, verified: true })
    }

    // 3. DISPATCH CLIENT HANDOVER EMAIL
    const { clientEmail, clientName, creatorName, projectTitle, amount, deliveryUrl, isReminder } = body

    if (!clientEmail) {
      return NextResponse.json({ success: false, error: 'Client email is required' }, { status: 400 })
    }

    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({
        success: true,
        message: 'Mock email success (configure SMTP_USER/PASS for live dispatch)',
        deliveryUrl
      })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass }
    })

    const subject = isReminder
      ? `Payment Reminder: ${projectTitle} Deliverables Awaiting Release`
      : `Vault Ready: ${projectTitle} Deliverables from ${creatorName || 'Creator'}`

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
        <h2 style="color: #0f172a; margin-top: 0;">PayDrop Vault</h2>
        <p>Hello <strong>${clientName}</strong>,</p>
        <p>${creatorName || 'Your creator'} has uploaded deliverables for <strong>${projectTitle}</strong>.</p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
          <span style="font-size: 11px; color: #64748b;">TOTAL DUE</span>
          <div style="font-size: 24px; font-weight: 800; color: #0f172a;">₹${Number(amount || 0).toLocaleString('en-IN')}</div>
        </div>
        <div style="text-align: center;">
          <a href="${deliveryUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: bold; border-radius: 10px; display: inline-block;">
            Inspect & Unlock Deliverables →
          </a>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `"PayDrop" <${smtpUser}>`,
      to: clientEmail,
      subject,
      html: htmlContent
    })

    return NextResponse.json({ success: true, message: 'Email dispatched' })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
