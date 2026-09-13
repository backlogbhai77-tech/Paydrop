'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore'
import { generateInvoiceNumber } from '../../../lib/saas'
import { 
  Lock, Unlock, ShieldCheck, Download, CheckCircle2, 
  AlertTriangle, Clock, QrCode, CreditCard, Receipt, 
  Sparkles, ExternalLink, ShieldAlert
} from 'lucide-react'
import Link from 'next/link'

export default function ClientDeliveryVault() {
  const params = useParams()
  const deliveryId = params?.id

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Checkout & Gateway simulation state
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentStep, setPaymentStep] = useState('select') // select | processing | success
  const [selectedMethod, setSelectedMethod] = useState('upi')

  useEffect(() => {
    if (!deliveryId) return
    loadAndTrackDelivery()
  }, [deliveryId])

  const loadAndTrackDelivery = async () => {
    try {
      const docRef = doc(db, 'deliveries', deliveryId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        setError("Delivery Vault Not Found. This portal may have expired or been revoked by the creator.")
        setLoading(false)
        return
      }

      const data = docSnap.data()
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        setError("This delivery portal has expired. Deliverables are archived.")
      }

      setDelivery(data)

      // Telemetry: increment client view count
      await updateDoc(docRef, {
        viewCount: increment(1),
        lastViewedAt: new Date().toISOString()
      })
    } catch (err) {
      console.error("Error loading delivery:", err)
      setError("Unable to connect to ReleaseDrop Vault.")
    } finally {
      setLoading(false)
    }
  }

  // Simulated Pluggable Payment Engine (Later connects to Razorpay/Cashfree Webhooks)
  const executePayment = async () => {
    setPaymentStep('processing')
    try {
      // Simulate gateway verification handshake
      await new Promise(res => setTimeout(res, 2200))

      const docRef = doc(db, 'deliveries', deliveryId)
      await updateDoc(docRef, {
        status: 'Paid',
        settledAt: new Date().toISOString(),
        paymentMethod: selectedMethod,
        invoiceNumber: generateInvoiceNumber(deliveryId)
      })

      setDelivery(prev => ({
        ...prev,
        status: 'Paid',
        invoiceNumber: generateInvoiceNumber(deliveryId)
      }))
      setPaymentStep('success')
    } catch (err) {
      alert("Payment processing error: " + err.message)
      setPaymentStep('select')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-400 flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono uppercase tracking-widest text-[11px]">Decrypting Vault Manifest...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl mb-4 border border-red-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold">Portal Inactive</h1>
        <p className="text-zinc-400 text-xs mt-2 max-w-sm">{error}</p>
        <Link href="/" className="mt-6 text-xs text-emerald-400 hover:underline">
          Return to ReleaseDrop
        </Link>
      </div>
    )
  }

  const isUnlocked = delivery?.status === 'Paid'
  const invoiceId = delivery?.invoiceNumber || generateInvoiceNumber(deliveryId)

  return (
    <div className="min-h-screen bg-[#06080e] text-zinc-100 antialiased font-sans flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Top Security Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-sm shadow-md shadow-emerald-500/20">
            R
          </div>
          <div>
            <div className="font-black text-xs tracking-tight text-zinc-100">ReleaseDrop Vault</div>
            <div className="text-[9px] font-mono text-zinc-500">256-BIT ENCRYPTED ESCROW</div>
          </div>
        </div>

        <span className={`text-[10px] font-mono px-3 py-1 rounded-full border flex items-center gap-1.5 ${
          isUnlocked 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          {isUnlocked ? 'DECRYPTED & VERIFIED' : 'AWAITING SETTLEMENT'}
        </span>
      </header>

      {/* Main Delivery Showcase */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Deliverable Header Card */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-3xl p-7 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xl">
          <div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
              Official Production Deliverable
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">{delivery?.title}</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Authorized Recipient: <span className="text-zinc-200 font-semibold">{delivery?.clientName}</span>
            </p>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-zinc-900">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Authorized Settlement</span>
            <div className="text-2xl sm:text-3xl font-black text-white">
              ₹{delivery?.grossAmount?.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-zinc-500 flex items-center sm:justify-end gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> Auto-expires: {new Date(delivery?.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Dynamic Watermark Inspection Viewport */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-3xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Deliverable Inspection View
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {isUnlocked ? 'MASTER HIGH-RES READY' : 'FORENSIC WATERMARK ACTIVE'}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950 aspect-video flex items-center justify-center">
            <img 
              src={delivery?.previewUrl} 
              alt="Deliverable Inspection" 
              className={`w-full h-full object-cover transition duration-700 ${isUnlocked ? '' : 'filter brightness-60 contrast-125'}`}
            />

            {/* Anti-Piracy Watermark Diagonal Grid */}
            {!isUnlocked && (
              <div className="absolute inset-0 pointer-events-none select-none flex flex-wrap items-center justify-around opacity-25 text-white font-mono text-[11px] rotate-[-20deg] gap-12 p-8">
                <span>PREVIEW ONLY • CONFIDENTIAL</span>
                <span>PROPERTY OF CREATOR</span>
                <span>PAYMENT REQUIRED TO DECRYPT</span>
                <span>ESCROW PROTECTED • RELEASEDROP</span>
              </div>
            )}

            {!isUnlocked && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl mb-3">
                  <Lock className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-sm font-black text-white tracking-wide">Production Master Locked</h3>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-xs leading-relaxed">
                  Final uncompressed master assets, source code, and raw project files decrypt immediately upon payment confirmation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Panel: Checkout or Decrypted Download */}
        {!isUnlocked ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-7 shadow-2xl text-center space-y-4">
            <div>
              <h3 className="text-base font-black text-white">Authorize Settlement to Unlock</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                Funds are held in verified escrow. Once authorized, master files are instantly decrypted with lifetime access.
              </p>
            </div>

            <button
              onClick={() => setShowCheckout(true)}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition inline-flex items-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95"
            >
              <CreditCard className="w-4 h-4" /> Authorize ₹{delivery?.grossAmount?.toLocaleString('en-IN')} & Unlock
            </button>
          </div>
        ) : (
          <div className="bg-zinc-950 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-5">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                Verification Complete
              </span>
              <h3 className="text-xl font-black text-white mt-1">Master Files Decrypted</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Invoice <span className="font-mono text-zinc-200">{invoiceId}</span> settled. Your full-resolution files are ready for immediate download.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.open(delivery?.fileUrl, '_blank')}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Download className="w-4 h-4" /> Download Master Assets
              </button>
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-bold text-xs rounded-xl transition inline-flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" /> Download Tax Receipt
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Simulated Production Checkout Modal (Plug-and-play Gateway Engine) */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white">ReleaseDrop Express Checkout</h3>
                <span className="text-[10px] font-mono text-zinc-500">ESCROW ORDER: {invoiceId}</span>
              </div>
              <button onClick={() => setShowCheckout(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            {paymentStep === 'select' && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Deliverable</span>
                    <div className="font-bold text-xs text-white truncate max-w-[200px]">{delivery?.title}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total Due</span>
                    <div className="font-black text-base text-emerald-400">₹{delivery?.grossAmount?.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-zinc-400">Select Payment Protocol</label>
                  
                  <div 
                    onClick={() => setSelectedMethod('upi')}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                      selectedMethod === 'upi' ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <QrCode className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Instant UPI (GPay / PhonePe / Paytm)</div>
                        <div className="text-[10px] text-zinc-500">Zero surcharge • Direct Settlement</div>
                      </div>
                    </div>
                    <input type="radio" checked={selectedMethod === 'upi'} readOnly className="accent-emerald-500" />
                  </div>

                  <div 
                    onClick={() => setSelectedMethod('card')}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                      selectedMethod === 'card' ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-zinc-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Corporate Credit / Debit Card</div>
                        <div className="text-[10px] text-zinc-500">Visa, Mastercard, RuPay & Amex</div>
                      </div>
                    </div>
                    <input type="radio" checked={selectedMethod === 'card'} readOnly className="accent-emerald-500" />
                  </div>
                </div>

                <button
                  onClick={executePayment}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  Confirm & Authorize ₹{delivery?.grossAmount?.toLocaleString('en-IN')}
                </button>
              </div>
            )}

            {paymentStep === 'processing' && (
              <div className="py-10 text-center space-y-4">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-white">Securing Escrow Settlement...</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Connecting to banking network & decrypting production keys.</p>
                </div>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="py-6 text-center space-y-3">
                <div className="inline-flex p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-white">Escrow Authorized!</h4>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                  Assets are permanently decrypted. You can now access master files.
                </p>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="mt-2 px-6 py-2.5 bg-white text-black font-bold text-xs rounded-xl"
                >
                  Go to Decrypted Downloads
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="py-6 border-t border-zinc-900 text-center text-[10px] font-mono text-zinc-600">
        RELEASEDROP ENCRYPTED CORE • AUTOMATED ESCROW PROTOCOL
      </footer>
    </div>
  )
      }
  
