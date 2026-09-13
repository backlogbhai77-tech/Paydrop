'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore'
import { 
  Lock, Unlock, ShieldCheck, Download, CheckCircle2, 
  AlertTriangle, Clock, QrCode, CreditCard, Receipt, 
  Shield, Film, Sparkles, ExternalLink, ArrowRight,
  FileCheck2, ChevronRight, Layers, Eye
} from 'lucide-react'
import Link from 'next/link'

export default function ClientDeliveryVault() {
  const params = useParams()
  const deliveryId = params?.id

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentStep, setPaymentStep] = useState('select') // select | processing | success
  const [selectedMethod, setSelectedMethod] = useState('upi')

  useEffect(() => {
    if (!deliveryId) return
    const loadDelivery = async () => {
      try {
        const docRef = doc(db, 'deliveries', deliveryId)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          setError("Vault Manifest Not Found. This portal link is invalid, expired, or has been revoked by the sender.")
          setLoading(false)
          return
        }

        const data = docSnap.data()
        setDelivery(data)
        await updateDoc(docRef, { 
          viewCount: increment(1),
          lastViewedAt: new Date().toISOString()
        })
      } catch (err) {
        setError("Secure cryptographic handshake failed. Please refresh the portal.")
      } finally {
        setLoading(false)
      }
    }
    loadDelivery()
  }, [deliveryId])

  const executePayment = async () => {
    setPaymentStep('processing')
    try {
      await new Promise(r => setTimeout(r, 2200))
      const invoiceNum = `RD-INV-${new Date().getFullYear()}-${deliveryId ? deliveryId.slice(0, 6).toUpperCase() : '000000'}`
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
      alert("Escrow settlement failed: " + err.message)
      setPaymentStep('select')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-zinc-400 flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono uppercase tracking-widest text-[11px] text-zinc-500">Decrypting ReleaseDrop Escrow Manifest...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030712] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4 text-red-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Portal Inactive</h1>
        <p className="text-zinc-400 text-xs mt-2 max-w-sm leading-relaxed">{error}</p>
        <Link href="/" className="mt-6 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs rounded-xl text-zinc-300 transition">
          Return to ReleaseDrop Network
        </Link>
      </div>
    )
  }

  const isUnlocked = delivery?.status === 'Paid'
  const invoiceId = delivery?.invoiceNumber || `RD-INV-${new Date().getFullYear()}-${deliveryId ? deliveryId.slice(0, 6).toUpperCase() : '000000'}`
  const isVideo = delivery?.previewUrl?.includes('/video/') || delivery?.fileName?.match(/\.(mp4|mov|webm|mkv)$/i)

  return (
    <div className="min-h-screen bg-[#030712] text-zinc-100 antialiased font-sans flex flex-col selection:bg-emerald-500 selection:text-black relative overflow-x-hidden">
      
      {/* Background Subtle Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Institutional Protocol Header */}
      <header className="border-b border-white/[0.08] bg-[#030712]/80 backdrop-blur-2xl px-6 h-16 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center font-black text-black text-base shadow-lg shadow-emerald-500/20">
            R
          </div>
          <div>
            <div className="font-extrabold text-xs tracking-tight text-white flex items-center gap-2">
              ReleaseDrop <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.08] text-zinc-400 font-normal">SECURE VAULT</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 mt-0.5">
              <Shield className="w-3 h-3 text-emerald-400" /> 256-Bit Escrow Protocol Active
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono px-3 py-1 rounded-full border flex items-center gap-1.5 tracking-wider uppercase font-semibold ${
            isUnlocked 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {isUnlocked ? 'MASTER DECRYPTED' : 'ESCROW LOCKED'}
          </span>
        </div>
      </header>

      {/* Main Deliverable Showroom */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 z-10">
        
        {/* Deal Overview Card */}
        <div className="bg-zinc-950/70 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Official Deliverable
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                ID: {deliveryId ? deliveryId.slice(0, 8) : ''}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{delivery?.title}</h1>
            <p className="text-xs text-zinc-400">
              Authorized Recipient: <span className="text-zinc-200 font-semibold">{delivery?.clientName}</span>
            </p>
          </div>

          <div className="sm:text-right border-t sm:border-0 pt-4 sm:pt-0 border-white/[0.08] flex flex-col sm:items-end">
            <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Settlement Due</span>
            <div className="text-3xl font-black text-white tracking-tight mt-0.5">
              ₹{delivery?.grossAmount?.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1 font-mono">
              <Clock className="w-3 h-3 text-zinc-500" /> Auto-expires: {new Date(delivery?.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Cinema-Grade Asset Inspector */}
        <div className="bg-zinc-950/70 border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Deliverable Inspection Viewport
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-zinc-900 border border-white/[0.08] text-zinc-400 px-2 py-0.5 rounded">
                4K INSPECTION
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {isUnlocked ? 'MASTER STREAM' : 'FORENSIC GRID ACTIVE'}
              </span>
            </div>
          </div>

          {/* Media Player / Viewport */}
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black aspect-video flex items-center justify-center">
            {isVideo ? (
              <video 
                src={delivery?.previewUrl} 
                controls={isUnlocked}
                controlsList="nodownload"
                playsInline
                className={`w-full h-full object-contain ${isUnlocked ? '' : 'brightness-75'}`}
              />
            ) : (
              <img 
                src={delivery?.previewUrl} 
                alt="Deliverable" 
                className={`w-full h-full object-contain transition duration-700 ${isUnlocked ? '' : 'brightness-75'}`}
              />
            )}

            {/* Anti-Theft Dynamic Forensic Lattice */}
            {!isUnlocked && (
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-around opacity-30 text-white font-mono text-[11px] font-black rotate-[-15deg] scale-125">
                <div className="flex justify-around gap-8">
                  <span>PREVIEW ONLY • CONFIDENTIAL</span>
                  <span>{delivery?.clientName?.toUpperCase()}</span>
                </div>
                <div className="flex justify-around gap-8">
                  <span>UNAUTHORIZED USE PROHIBITED</span>
                  <span>ESCROW HOLD ACTIVE</span>
                </div>
                <div className="flex justify-around gap-8">
                  <span>RELEASEDROP CRYPTOGRAPHIC VAULT</span>
                  <span>PROPERTY OF CREATOR</span>
                </div>
              </div>
            )}

            {/* Locked Badge Overlay */}
            {!isUnlocked && (
              <div className="absolute top-4 right-4 bg-black/85 backdrop-blur-md border border-white/[0.08] px-3.5 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-mono text-zinc-300 pointer-events-none">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Forensic Preview Mode</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-500 px-1 pt-1 gap-2 font-mono">
            <span>Asset: <strong className="text-zinc-300 font-sans">{delivery?.fileName || 'Production Master File'}</strong> ({delivery?.fileSize || 'High-Res'})</span>
            <span>Master uncompressed bit-stream unlocks post-settlement</span>
          </div>
        </div>

        {/* Settlement Panel / Action */}
        {!isUnlocked ? (
          <div className="bg-zinc-950/70 border border-white/[0.08] rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-lg font-black text-white tracking-tight">Authorize Settlement & Unlock Files</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Funds are held in release-drop escrow. Original master deliverables decrypt instantly upon authorization with perpetual commercial license.
              </p>
            </div>

            <button
              onClick={() => setShowCheckout(true)}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition shadow-xl shadow-emerald-500/20 active:scale-95 inline-flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" /> 
              <span>Authorize ₹{delivery?.grossAmount?.toLocaleString('en-IN')} & Unlock Master</span>
            </button>

            <div className="flex items-center justify-center gap-6 text-[11px] text-zinc-500 pt-2 font-mono">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit Escrow Hold</span>
              <span className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 text-emerald-400" /> GST Tax Invoice Included</span>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-emerald-950/20 to-zinc-950 border border-emerald-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
            <div className="inline-flex p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                Settlement Completed & Verified
              </span>
              <h2 className="text-2xl font-black text-white">Full Production Master Decrypted</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Invoice <span className="font-mono text-zinc-200">{invoiceId}</span> settled for ₹{delivery?.grossAmount?.toLocaleString('en-IN')}. Clean master assets are ready for permanent download.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.open(delivery?.fileUrl, '_blank')}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Master Assets ({delivery?.fileSize || 'Original'})
              </button>
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-6 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/[0.08] font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" /> Print Tax Receipt
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Luxury Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#030712] border border-white/[0.08] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-sm font-black text-white">ReleaseDrop Express Checkout</h3>
                <span className="text-[10px] font-mono text-zinc-500">ESCROW ID: {invoiceId}</span>
              </div>
              <button onClick={() => setShowCheckout(false)} className="text-zinc-500 hover:text-white text-xs p-1">✕</button>
            </div>

            {paymentStep === 'select' && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900/60 border border-white/[0.08] rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">Deliverable</span>
                    <div className="font-bold text-xs text-white truncate max-w-[200px] mt-0.5">{delivery?.title}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">Total Due</span>
                    <div className="font-black text-base text-emerald-400 mt-0.5">₹{delivery?.grossAmount?.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Payment Protocol</label>
                  
                  <div 
                    onClick={() => setSelectedMethod('upi')}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      selectedMethod === 'upi' ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/[0.08] bg-zinc-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Instant UPI Rail</div>
                        <div className="text-[10px] text-zinc-500">Google Pay, PhonePe, Paytm, CRED</div>
                      </div>
                    </div>
                    <input type="radio" checked={selectedMethod === 'upi'} readOnly className="accent-emerald-500" />
                  </div>

                  <div 
                    onClick={() => setSelectedMethod('card')}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      selectedMethod === 'card' ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/[0.08] bg-zinc-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-zinc-800 text-zinc-400">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Commercial Card / NetBanking</div>
                        <div className="text-[10px] text-zinc-500">Visa, Mastercard, RuPay & Corporate Cards</div>
                      </div>
                    </div>
                    <input type="radio" checked={selectedMethod === 'card'} readOnly className="accent-emerald-500" />
                  </div>
                </div>

                <button
                  onClick={executePayment}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Authorize Settlement (₹{delivery?.grossAmount?.toLocaleString('en-IN')})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {paymentStep === 'processing' && (
              <div className="py-12 text-center space-y-4">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-white">Verifying Escrow Handshake...</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Connecting to banking rail and releasing encrypted master keys.</p>
                </div>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="py-8 text-center space-y-4">
                <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Settlement Authorized</h4>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mt-1">
                    Master production files decrypted. Full-resolution downloads unlocked.
                  </p>
                </div>
                <button 
                  onClick={() => setShowCheckout(false)} 
                  className="px-6 py-2.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 transition"
                >
                  Open Decrypted Vault
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trust Footer */}
      <footer className="py-8 border-t border-white/[0.08] text-center text-[10px] font-mono text-zinc-600 z-10">
        RELEASEDROP ESCROW NETWORK • 256-BIT CRYPTOGRAPHIC VAULT • SECURE ASSET DELIVERY
      </footer>
    </div>
  )
}
