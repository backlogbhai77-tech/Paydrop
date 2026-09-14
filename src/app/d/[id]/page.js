'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import {
  ShieldCheck, Lock, Unlock, Download, CheckCircle2,
  Clock, AlertTriangle, ArrowRight, ShieldAlert,
  FileCheck2, Sparkles, Copy, Check
} from 'lucide-react'
import Link from 'next/link'

export default function ClientDeliveryPortal() {
  const params = useParams()
  const deliveryId = params?.id

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [txnRef, setTxnRef] = useState('')

  useEffect(() => {
    if (!deliveryId) return
    const fetchRecord = async () => {
      try {
        const ref = doc(db, 'deliveries', deliveryId)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          setError('Vault record not located or expired.')
          setLoading(false)
          return
        }
        const data = snap.data()
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          setError('This secure delivery portal has expired.')
        }
        setDelivery(data)
      } catch (err) {
        setError('Failed to establish handoff handshake.')
      } finally {
        setLoading(false)
      }
    }
    fetchRecord()
  }, [deliveryId])

  const handleSimulatedPayment = async () => {
    setVerifying(true)
    try {
      await new Promise(r => setTimeout(r, 1800))
      const ref = doc(db, 'deliveries', deliveryId)
      await updateDoc(ref, {
        status: 'Paid',
        paidAt: new Date().toISOString(),
        paymentRef: txnRef || `TXN_${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      })
      setDelivery(prev => ({ ...prev, status: 'Paid' }))
    } catch (e) {
      alert('Verification sync error: ' + e.message)
    } finally {
      setVerifying(false)
    }
  }

  const copyUpi = () => {
    if (!delivery?.upiId) return
    navigator.clipboard.writeText(delivery.upiId)
    setCopiedUpi(true)
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080B] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider uppercase">Mounting Secure Vault...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#07080B] flex items-center justify-center p-6 text-zinc-100">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#0F1117] border border-white/[0.08] text-center shadow-2xl">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Access Terminated</h2>
          <p className="text-xs text-zinc-400 mt-1 mb-6 leading-relaxed">{error}</p>
          <Link href="/" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Return to ReleaseDrop Authority</Link>
        </div>
      </div>
    )
  }

  const isUnlocked = delivery?.status === 'Paid'
  const upiDeepLink = `upi://pay?pa=${delivery?.upiId}&pn=${encodeURIComponent(delivery?.clientName || 'Creator')}&am=${delivery?.amount}&cu=INR&tn=${encodeURIComponent(delivery?.title || 'Deliverables')}`
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiDeepLink)}&bgcolor=ffffff&color=000000`

  return (
    <div className="min-h-screen bg-[#07080B] text-zinc-100 font-sans selection:bg-emerald-400 selection:text-black antialiased relative pb-16">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-gradient-to-b from-emerald-500/[0.07] via-cyan-500/[0.02] to-transparent blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="h-16 border-b border-white/[0.07] bg-[#0A0C10]/80 backdrop-blur-md sticky top-0 z-30 px-6">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-400 text-black font-bold flex items-center justify-center text-xs">
              R
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">ReleaseDrop</span>
              <span className="text-[10px] text-zinc-500 font-mono">/ VAULT PROTOCOL</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
              isUnlocked 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
            }`}>
              {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {isUnlocked ? 'AUTHORIZED SETTLEMENT' : 'TRANSFER RESTRICTED'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-5xl mx-auto px-6 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Column: Asset Details & Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0D0F15] border border-white/[0.08] shadow-2xl">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400">Escrow Deliverable</span>
                <h1 className="text-xl font-bold mt-0.5 tracking-tight text-white">{delivery?.title}</h1>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-zinc-400 block">Total Due</span>
                <span className="text-xl font-mono font-bold text-white">₹{delivery?.amount?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-y-2 justify-between text-xs text-zinc-400 font-mono">
              <div>Creator: <span className="text-zinc-200">{delivery?.userEmail}</span></div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Auto-Purge: {new Date(delivery?.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Controlled Inspection Preview */}
          <div className="rounded-2xl bg-[#0D0F15] border border-white/[0.08] p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase text-zinc-400 tracking-wider">Asset Inspection Canvas</span>
              <span className="text-[11px] font-mono text-zinc-500">
                {isUnlocked ? 'Decrypted Full Bitrate' : 'Low-Res Security Layer'}
              </span>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/[0.06] flex items-center justify-center">
              <img
                src={delivery?.previewUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200"}
                alt="Controlled Preview"
                className={`w-full h-full object-cover select-none pointer-events-none transition duration-500 ${
                  isUnlocked ? 'filter-none' : 'brightness-[0.45] contrast-125'
                }`}
              />

              {!isUnlocked && (
                <>
                  <div className="absolute inset-0 pointer-events-none select-none flex flex-wrap items-center justify-around opacity-25 text-white font-mono text-xs rotate-[-18deg] gap-12 p-8">
                    <span>ESCROW DRAFT</span>
                    <span>RESTRICTED ACCESS</span>
                    <span>RELEASEDROP PROTECTED</span>
                    <span>CONFIDENTIAL REVIEW</span>
                  </div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <div className="p-3 bg-zinc-900/90 border border-white/[0.1] rounded-2xl shadow-xl mb-2">
                      <Lock className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-semibold text-white tracking-wide">Watermarked Master Package</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Original production assets released post-clearance.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Package Composition */}
          <div className="p-5 rounded-2xl bg-[#0D0F15] border border-white/[0.08] space-y-3">
            <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider block">Manifest Files</span>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-medium text-zinc-200">{delivery?.title}.zip</div>
                  <div className="text-[10px] font-mono text-zinc-500">Encrypted Delivery Bundle</div>
                </div>
              </div>
              <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md ${
                isUnlocked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {isUnlocked ? 'UNLOCKED' : 'PROTECTED'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout & Direct Settlement */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 p-6 rounded-2xl bg-[#0D0F15] border border-white/[0.08] shadow-2xl space-y-6">
            {!isUnlocked ? (
              <>
                <div className="border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold tracking-tight uppercase">Settlement Terminal</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Scan or initiate instant transfer via any UPI application.</p>
                </div>

                {/* QR Display */}
                <div className="p-4 bg-white rounded-xl max-w-[220px] mx-auto shadow-inner flex flex-col items-center">
                  <img src={qrImage} alt="Payment QR" className="w-48 h-48 select-none" />
                  <span className="text-[10px] text-zinc-600 font-mono mt-1 font-semibold">ALL UPI APPS ACCEPTED</span>
                </div>

                {/* UPI Detail Pill */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span>Payee UPI ID</span>
                    <button onClick={copyUpi} className="hover:text-white flex items-center gap-1 transition">
                      {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedUpi ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-3 bg-black/50 border border-white/[0.08] rounded-xl text-xs font-mono text-zinc-200 truncate">
                    {delivery?.upiId || 'creator@upi'}
                  </div>
                </div>

                {/* Mobile Deep Link */}
                <a
                  href={upiDeepLink}
                  className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
                >
                  <span>Pay with GPay / PhonePe / Paytm</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>

                {/* Verification Confirmation */}
                <div className="pt-3 border-t border-white/[0.06] space-y-3">
                  <span className="text-[11px] text-zinc-400 block font-medium">Paid already? Verify transaction:</span>
                  <input
                    type="text"
                    placeholder="Enter UPI Ref / UTR (12 digits)"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                    className="w-full bg-black/50 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleSimulatedPayment}
                    disabled={verifying}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying with Banking Network...</span>
                      </>
                    ) : (
                      <span>I Have Completed Payment</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-4 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Settlement Authenticated</h3>
                  <p className="text-xs text-zinc-400 mt-1">Transaction verified. Master assets are ready for decryption.</p>
                </div>

                <a
                  href={delivery?.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs rounded-xl transition inline-flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Master Package (.ZIP)</span>
                </a>
              </div>
            )}

            <div className="text-[10px] font-mono text-zinc-500 text-center flex items-center justify-center gap-1.5 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ReleaseDrop Verification Protocol</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
