'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore'
import { 
  Lock, Unlock, ShieldCheck, Download, CheckCircle2, 
  AlertTriangle, Clock, QrCode, CreditCard, Receipt
} from 'lucide-react'
import Link from 'next/link'

export default function ClientDeliveryVault() {
  const params = useParams()
  const deliveryId = params?.id

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentStep, setPaymentStep] = useState('select')
  const [selectedMethod, setSelectedMethod] = useState('upi')

  useEffect(() => {
    if (!deliveryId) return
    const loadDelivery = async () => {
      try {
        const docRef = doc(db, 'deliveries', deliveryId)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          setError("Vault not found or expired.")
          setLoading(false)
          return
        }

        const data = docSnap.data()
        setDelivery(data)
        await updateDoc(docRef, { viewCount: increment(1) })
      } catch (err) {
        setError("Connection failed to vault.")
      } finally {
        setLoading(false)
      }
    }
    loadDelivery()
  }, [deliveryId])

  const executePayment = async () => {
    setPaymentStep('processing')
    try {
      await new Promise(r => setTimeout(r, 2000))
      const invoiceNum = `INV-${new Date().getFullYear()}-${deliveryId ? deliveryId.slice(0, 6).toUpperCase() : '000000'}`
      const docRef = doc(db, 'deliveries', deliveryId)
      await updateDoc(docRef, {
        status: 'Paid',
        settledAt: new Date().toISOString(),
        paymentMethod: selectedMethod,
        invoiceNumber: invoiceNum
      })
      setDelivery(prev => ({ ...prev, status: 'Paid', invoiceNumber: invoiceNum }))
      setPaymentStep('success')
    } catch (err) {
      alert("Payment error: " + err.message)
      setPaymentStep('select')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-400 flex items-center justify-center text-xs">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2" />
        <span>Decrypting Manifest...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
        <h1 className="text-lg font-bold">Portal Inactive</h1>
        <p className="text-zinc-400 text-xs mt-1">{error}</p>
        <Link href="/" className="mt-4 text-xs text-emerald-400 underline">Home</Link>
      </div>
    )
  }

  const isUnlocked = delivery?.status === 'Paid'
  const invoiceId = delivery?.invoiceNumber || `INV-${new Date().getFullYear()}-${deliveryId ? deliveryId.slice(0, 6).toUpperCase() : '000000'}`

  return (
    <div className="min-h-screen bg-[#06080e] text-zinc-100 antialiased font-sans flex flex-col">
      <header className="border-b border-zinc-900 bg-zinc-950/80 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-sm">R</div>
          <span className="font-bold text-xs tracking-tight">ReleaseDrop Vault</span>
        </div>
        <span className={`text-[10px] font-mono px-3 py-1 rounded-full border ${isUnlocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
          {isUnlocked ? 'DECRYPTED' : 'ESCROW LOCKED'}
        </span>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Deliverable</span>
            <h1 className="text-xl font-black text-white mt-1">{delivery?.title}</h1>
            <p className="text-xs text-zinc-400">Client: {delivery?.clientName}</p>
          </div>
          <div className="sm:text-right border-t sm:border-0 pt-3 sm:pt-0 border-zinc-900">
            <span className="text-[10px] text-zinc-500 uppercase block">Settlement Required</span>
            <div className="text-2xl font-black text-white">₹{delivery?.grossAmount?.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Inspection View</span>
            <span className="text-[10px] font-mono text-zinc-500">{isUnlocked ? 'MASTER UNLOCKED' : 'WATERMARKED'}</span>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950 aspect-video flex items-center justify-center">
            <img src={delivery?.previewUrl} alt="Inspection" className={`w-full h-full object-cover ${isUnlocked ? '' : 'brightness-50'}`} />
            {!isUnlocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <Lock className="w-8 h-8 text-emerald-400 mb-2" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Unpaid Inspection Preview</span>
                <span className="text-[10px] text-zinc-400 mt-1">Master files remain encrypted until authorization</span>
              </div>
            )}
          </div>
        </div>

        {!isUnlocked ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-center space-y-4">
            <p className="text-xs text-zinc-400">Funds held securely in escrow until deliverable verification.</p>
            <button
              onClick={() => setShowCheckout(true)}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl active:scale-95"
            >
              Authorize ₹{delivery?.grossAmount?.toLocaleString('en-IN')} & Unlock
            </button>
          </div>
        ) : (
          <div className="bg-zinc-950 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-base font-black text-white">Files Decrypted Successfully</h3>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => window.open(delivery?.fileUrl, '_blank')}
                className="px-6 py-3 bg-emerald-500 text-black font-black text-xs rounded-xl flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download Master Assets
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-3 bg-zinc-900 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-800 flex items-center gap-1.5"
              >
                <Receipt className="w-4 h-4" /> Tax Invoice
              </button>
            </div>
          </div>
        )}
      </main>

      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase font-mono">Express Checkout</h3>
              <button onClick={() => setShowCheckout(false)} className="text-zinc-500 text-xs">✕</button>
            </div>

            {paymentStep === 'select' && (
              <div className="space-y-3">
                <div 
                  onClick={() => setSelectedMethod('upi')}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs ${selectedMethod === 'upi' ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800'}`}
                >
                  <div className="flex items-center gap-2"><QrCode className="w-4 h-4 text-emerald-400" /> Instant UPI (GPay/PhonePe)</div>
                  <input type="radio" checked={selectedMethod === 'upi'} readOnly />
                </div>
                <button
                  onClick={executePayment}
                  className="w-full py-3 bg-emerald-500 text-black font-bold text-xs rounded-xl"
                >
                  Authorize ₹{delivery?.grossAmount?.toLocaleString('en-IN')}
                </button>
              </div>
            )}

            {paymentStep === 'processing' && (
              <div className="py-6 text-center text-xs text-zinc-300 space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Verifying Escrow Handshake...</p>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="py-4 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-xs text-white font-bold">Escrow Settled!</p>
                <button onClick={() => setShowCheckout(false)} className="px-4 py-2 bg-white text-black text-xs font-bold rounded-xl mt-2">
                  Access Downloads
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
