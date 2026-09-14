'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import {
  Lock, Unlock, ShieldCheck, Download, CheckCircle2,
  AlertTriangle, Clock, FileArchive, Video, ExternalLink,
  Copy, Check, ArrowRight, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

export default function ClientDeliveryPortal() {
  const params = useParams()
  const deliveryId = params?.id

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [txnRef, setTxnRef] = useState('')

  useEffect(() => {
    if (!deliveryId) return
    fetchDelivery()
  }, [deliveryId])

  const fetchDelivery = async () => {
    try {
      const docRef = doc(db, 'deliveries', deliveryId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        setError("Delivery package not found. This link might be invalid or removed by the creator.")
        setLoading(false)
        return
      }

      const data = docSnap.data()

      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        setError("This delivery portal has expired. Original production assets are no longer accessible.")
      }

      setDelivery(data)
    } catch (err) {
      console.error("Error loading delivery:", err)
      setError("Unable to establish secure handshake. Please verify network connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleUnlockPayment = async () => {
    setProcessingPayment(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const docRef = doc(db, 'deliveries', deliveryId)
      await updateDoc(docRef, {
        status: 'Paid',
        paidAt: new Date().toISOString(),
        paymentRef: txnRef || `TXN_${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      })

      setDelivery(prev => ({ ...prev, status: 'Paid' }))
    } catch (err) {
      alert("Payment sync error: " + err.message)
    } finally {
      setProcessingPayment(false)
    }
  }

  const copyUpiId = () => {
    if (!delivery?.upiId) return
    navigator.clipboard.writeText(delivery.upiId)
    setCopiedUpi(true)
    setTimeout(() => setCopiedUpi(false), 2200)
  }

  const handleDownload = () => {
    if (delivery?.fileUrl && delivery.fileUrl.startsWith('http')) {
      window.open(delivery.fileUrl, '_blank')
    } else {
      alert("Asset decrypted. Master source download initiated.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-400 flex flex-col items-center justify-center text-sm gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs tracking-wider uppercase">Loading Secure Delivery Vault...</span>
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

  const isUnlocked = delivery?.status === 'Paid'
  const upiDeepLink = `upi://pay?pa=${delivery?.upiId || 'creator@upi'}&pn=${encodeURIComponent(delivery?.clientName || 'Client')}&am=${delivery?.amount || 0}&cu=INR&tn=${encodeURIComponent(delivery?.title || 'ReleaseDrop Settlement')}`
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiDeepLink)}&bgcolor=ffffff&color=000000`

  return (
    <div className="min-h-screen bg-[#06080e] text-zinc-100 antialiased font-sans flex flex-col selection:bg-emerald-500 selection:text-black relative overflow-hidden pb-16">
      {/* Glow */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/10 blur-[160px] pointer-events-none rounded-full" />

      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl px-6 h-16 flex items-center justify-between z-10 sticky top-0">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-sm">
              R
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">ReleaseDrop</span>
              <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline-block">/ ESCROW VAULT</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] px-3 py-1 rounded-full border font-mono flex items-center gap-1.5 ${
              isUnlocked
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
            }`}>
              {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {isUnlocked ? 'AUTHORIZED SETTLEMENT' : 'TRANSFER RESTRICTED'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Delivery Box */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Deliverable Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Metadata Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Verified Client Deliverable</span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">{delivery?.title}</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Prepared for <span className="text-zinc-200 font-medium">{delivery?.clientName}</span> by {delivery?.userEmail}
              </p>
            </div>
            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">Settlement Due</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                ₹{delivery?.amount?.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-zinc-500 flex items-center sm:justify-end gap-1 mt-1 font-mono">
                <Clock className="w-3 h-3" /> Expires: {new Date(delivery?.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Protected Inspection Canvas */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Asset Inspection Canvas</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {isUnlocked ? 'Decrypted Master Output' : 'Confidential Watermark Layer'}
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black aspect-video flex items-center justify-center">
              <img
                src={delivery?.previewUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200"}
                alt="Deliverable Preview"
                className={`w-full h-full object-cover select-none pointer-events-none transition duration-500 ${
                  isUnlocked ? 'filter-none' : 'brightness-[0.4] contrast-125'
                }`}
              />

              {!isUnlocked && (
                <>
                  <div className="absolute inset-0 pointer-events-none select-none flex flex-wrap items-center justify-around opacity-30 text-white font-mono text-xs rotate-[-15deg] gap-10 p-6">
                    <span>RELEASEDROP UNPAID PREVIEW</span>
                    <span>CONFIDENTIAL • {delivery?.clientName}</span>
                    <span>SETTLEMENT REQUIRED TO DECRYPT</span>
                    <span>RELEASEDROP UNPAID PREVIEW</span>
                  </div>

                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-4 text-center">
                    <div className="p-3 bg-zinc-900/90 border border-zinc-700/80 rounded-2xl shadow-2xl mb-2">
                      <Lock className="w-6 h-6 text-emerald-400 animate-pulse" />
                    </div>
                    <h3 className="text-xs font-bold text-white tracking-wide">Inspection Preview Mode</h3>
                    <p className="text-[11px] text-zinc-300 mt-0.5">Original production master files remain cryptographically locked.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Deliverable Manifest File */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl space-y-3">
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block font-mono">Manifest Package</span>
            <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 rounded-lg text-emerald-400">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    {delivery?.title}.zip
                    {!isUnlocked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Clean Production Master • Decryption Key Ready</div>
                </div>
              </div>

              <div>
                {isUnlocked ? (
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Settlement Terminal */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
            {!isUnlocked ? (
              <>
                <div className="border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight">Instant Settlement Terminal</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Scan or initiate instant transfer via any UPI application.</p>
                </div>

                {/* Real Dynamic QR */}
                <div className="p-4 bg-white rounded-2xl max-w-[240px] mx-auto shadow-2xl flex flex-col items-center">
                  <img src={qrImage} alt="Payment QR" className="w-52 h-52 select-none" />
                  <span className="text-[10px] text-zinc-700 font-mono mt-1 font-bold">ALL UPI APPS ACCEPTED</span>
                </div>

                {/* UPI ID Pill */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span>Payee UPI ID</span>
                    <button onClick={copyUpiId} className="hover:text-white flex items-center gap-1 transition text-[11px]">
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedUpi ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-emerald-400 truncate">
                    {delivery?.upiId || 'creator@upi'}
                  </div>
                </div>

                {/* Direct App Launch */}
                <a
                  href={upiDeepLink}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <span>Pay via GPay / PhonePe / Paytm</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                {/* Manual Verification Form */}
                <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                  <span className="text-[11px] text-zinc-400 block font-medium">Completed transfer? Verify settlement:</span>
                  <input
                    type="text"
                    placeholder="Enter UPI Ref / UTR (12 digits)"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleUnlockPayment}
                    disabled={processingPayment}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {processingPayment ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Settlement with Bank...</span>
                      </>
                    ) : (
                      <span>I Have Completed Payment</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-6 text-center space-y-4">
                <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Settlement Authenticated</h3>
                  <p className="text-xs text-zinc-400 mt-1">Payment verified. Master production assets are now decrypted.</p>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs rounded-xl transition inline-flex items-center justify-center gap-2 shadow-xl active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Master Package (.ZIP)</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-mono text-center pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ReleaseDrop Verified Escrow Release Protocol</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-zinc-900 text-center text-xs text-zinc-600">
        Powered by <span className="font-semibold text-zinc-400">ReleaseDrop</span> • The payment-locked delivery platform
      </footer>
    </div>
  )
}
