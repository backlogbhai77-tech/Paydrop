'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { 
  Lock, Unlock, ShieldCheck, Download, CheckCircle2, 
  AlertTriangle, Clock, FileArchive, QrCode, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

export default function ClientDeliveryPage() {
  const params = useParams()
  const deliveryId = params?.id

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [utrNumber, setUtrNumber] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (!deliveryId) return
    fetchDelivery()
  }, [deliveryId])

  const fetchDelivery = async () => {
    try {
      const docRef = doc(db, 'deliveries', deliveryId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        setError("Delivery portal not found. This link might be invalid or removed by the sender.")
        setLoading(false)
        return
      }

      const data = docSnap.data()
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        setError("This delivery portal has expired. The deliverables are no longer active.")
      }

      setDelivery(data)
      if (data.status === 'Paid') {
        setPaymentSuccess(true)
      }
    } catch (err) {
      console.error("Error loading delivery:", err)
      setError("Unable to load delivery. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySettlement = async (e) => {
    e.preventDefault()
    if (!utrNumber || utrNumber.length < 4) {
      alert("Please enter a valid 12-digit UPI Reference / UTR Number")
      return
    }

    setVerifying(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))

      const docRef = doc(db, 'deliveries', deliveryId)
      await updateDoc(docRef, {
        status: 'Paid',
        utrNumber: utrNumber,
        paidAt: new Date().toISOString()
      })

      setPaymentSuccess(true)
      setDelivery(prev => ({ ...prev, status: 'Paid', utrNumber }))
    } catch (err) {
      alert("Verification error: " + err.message)
    } finally {
      setVerifying(false)
    }
  }

  const handleDownload = () => {
    if (delivery?.fileUrl) {
      window.open(delivery.fileUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-400 flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading secure delivery vault...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl mb-4 border border-red-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold">Portal Unavailable</h1>
        <p className="text-zinc-400 text-xs mt-2 max-w-sm">{error}</p>
        <Link href="/" className="mt-6 text-xs text-emerald-400 hover:underline">
          Return to ReleaseDrop
        </Link>
      </div>
    )
  }

  const isUnlocked = paymentSuccess || delivery?.status === 'Paid'
  const upiLink = `upi://pay?pa=${delivery?.upiId}&pn=${encodeURIComponent(delivery?.clientName || 'Deliverable')}&am=${delivery?.amount}&cu=INR&tn=${encodeURIComponent('ReleaseDrop-' + delivery?.title)}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`

  return (
    <div className="min-h-screen bg-[#06080e] text-zinc-100 antialiased font-sans flex flex-col selection:bg-emerald-500 selection:text-black">
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-sm">
            R
          </div>
          <span className="font-extrabold text-sm tracking-tight text-zinc-100">ReleaseDrop Vault</span>
        </div>

        <span className={`text-[11px] px-3 py-1 rounded-full border font-medium flex items-center gap-1.5 ${
          isUnlocked 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          {isUnlocked ? 'Assets Decrypted' : 'Payment-Locked'}
        </span>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Client Deliverable</span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">{delivery?.title}</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Prepared for <span className="text-zinc-200 font-semibold">{delivery?.clientName}</span>
            </p>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Settlement Required</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              ₹{delivery?.amount?.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-zinc-500 flex items-center sm:justify-end gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> Auto-expires: {new Date(delivery?.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Inspection Preview</span>
            <span className="text-[10px] text-zinc-500">
              {isUnlocked ? 'Clean Master Mode' : 'Watermark Guard Active'}
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-video flex items-center justify-center">
            <img 
              src={delivery?.previewUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200"} 
              alt="Deliverable Preview" 
              className={`w-full h-full object-cover transition duration-500 ${isUnlocked ? '' : 'filter brightness-75'}`}
            />

            {!isUnlocked && (
              <div className="absolute inset-0 pointer-events-none select-none flex flex-wrap items-center justify-around opacity-30 text-white font-mono text-xs rotate-[-15deg] gap-12 p-6">
                <span>RELEASEDROP UNPAID PREVIEW</span>
                <span>CONFIDENTIAL • {delivery?.clientName}</span>
                <span>PAYMENT REQUIRED TO DECRYPT</span>
                <span>RELEASEDROP UNPAID PREVIEW</span>
              </div>
            )}

            {!isUnlocked && (
              <div className="absolute inset-0 bg-black/35 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-4 text-center">
                <div className="p-3 bg-zinc-900/90 border border-zinc-700/80 rounded-2xl shadow-2xl mb-2">
                  <Lock className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xs font-bold text-white tracking-wide">Inspection Preview Only</h3>
                <p className="text-[11px] text-zinc-300 mt-0.5">Original production master files remain locked</p>
              </div>
            )}
          </div>
        </div>

        {!isUnlocked ? (
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-white">Instant UPI Settlement</h3>
              <p className="text-xs text-zinc-400">Scan using any UPI App (Google Pay, PhonePe, Paytm, CRED) or click to pay.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-2">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-emerald-500/30 text-center">
                <img src={qrCodeUrl} alt="UPI QR Code" className="w-40 h-40 object-contain mx-auto" />
                <span className="text-[10px] font-bold text-zinc-800 tracking-wider block mt-1">SCAN TO PAY ₹{delivery?.amount}</span>
              </div>

              <div className="flex flex-col gap-2.5 w-full sm:w-auto">
                <a
                  href={upiLink}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" /> Open Installed UPI App
                </a>
                <div className="text-[11px] text-zinc-500 text-center sm:text-left">
                  UPI ID: <span className="text-zinc-300 font-mono font-medium">{delivery?.upiId}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifySettlement} className="border-t border-zinc-800 pt-5 space-y-3">
              <div className="text-center">
                <span className="text-xs font-bold text-zinc-200">Already paid? Decrypt Assets:</span>
                <p className="text-[11px] text-zinc-500 mt-0.5">Enter the 12-digit UPI Reference / UTR Number from your payment receipt.</p>
              </div>

              <div className="flex max-w-sm mx-auto gap-2">
                <input
                  type="text"
                  required
                  placeholder="Enter 12-digit UTR number"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-white disabled:opacity-50 text-black font-bold text-xs rounded-xl whitespace-nowrap"
                >
                  {verifying ? 'Verifying...' : 'Unlock Files'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-zinc-950 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Deliverables Successfully Decrypted!</h3>
              <p className="text-xs text-zinc-400 mt-1">Payment verified. You now have full lifetime access to the master assets.</p>
            </div>

            <button
              onClick={handleDownload}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Download className="w-4 h-4" /> Download Production Master
            </button>
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-zinc-900 text-center text-[11px] text-zinc-600">
        Secured by <span className="font-semibold text-zinc-400">ReleaseDrop</span> • Anti-Piracy Vault
      </footer>
    </div>
  )
              }
          
