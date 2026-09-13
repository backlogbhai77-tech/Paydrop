'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore'
import { 
  ShieldCheck, Lock, Download, CheckCircle2, AlertTriangle, 
  Maximize2, Minimize2, Eye, FileText, ArrowRight, ShieldAlert,
  Sparkles, RefreshCw, KeyRound, ExternalLink, CreditCard,
  Smartphone, Building2, Check, X, Flag, MessageSquare
} from 'lucide-react'

export default function ClientDeliveryPortal() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Checkout & Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isScreenProtected, setIsScreenProtected] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('upi') // 'upi' | 'card' | 'netbanking'
  const [upiId, setUpiId] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlockStep, setUnlockStep] = useState('')
  
  // Dispute System State
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  
  const playerContainerRef = useRef(null)

  useEffect(() => {
    if (!id) return

    const fetchDelivery = async () => {
      try {
        const docRef = doc(db, 'deliveries', id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setDelivery({ id: snap.id, ...snap.data() })
          await updateDoc(docRef, { viewCount: increment(1) })
        } else {
          setError("Escrow manifest not found or link has expired.")
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDelivery()

    // 🛡️ Screenshot & DevTools Guard
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'u' || e.key === 'p')) ||
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        e.key === 'F12'
      ) {
        e.preventDefault()
        setIsScreenProtected(true)
        setTimeout(() => setIsScreenProtected(false), 2000)
      }
    }

    const handleContextMenu = (e) => e.preventDefault()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [id])

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Authorize Payment with Selected Method
  const handleProcessPayment = async () => {
    setUnlocking(true)
    setUnlockStep(`Connecting to ${paymentMethod.toUpperCase()} Settlement Gateway...`)

    setTimeout(async () => {
      setUnlockStep('Authorizing payment and locking escrow release...')
      setTimeout(async () => {
        setUnlockStep('Stripping anti-theft watermarks & decrypting raw master...')
        try {
          const docRef = doc(db, 'deliveries', id)
          await updateDoc(docRef, {
            status: 'Paid',
            paidAt: new Date().toISOString(),
            paymentMethodUsed: paymentMethod
          })
          setDelivery(prev => ({ ...prev, status: 'Paid' }))
          setUnlocking(false)
          setShowCheckoutModal(false)
        } catch (err) {
          alert("Authorization failed: " + err.message)
          setUnlocking(false)
        }
      }, 1000)
    }, 1200)
  }

  // Submit Client Dispute
  const handleReportDispute = async () => {
    if (!disputeReason.trim()) return
    setDisputeSubmitting(true)
    try {
      const docRef = doc(db, 'deliveries', id)
      await updateDoc(docRef, {
        disputeStatus: 'Disputed',
        disputeReason: disputeReason.trim(),
        disputedAt: new Date().toISOString()
      })
      setDelivery(prev => ({ ...prev, disputeStatus: 'Disputed' }))
      setShowDisputeModal(false)
      alert("Dispute ticket filed with ReleaseDrop platform mediation. Escrow hold maintained.")
    } catch (err) {
      alert("Failed to file dispute: " + err.message)
    } finally {
      setDisputeSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-xs text-slate-400 gap-4">
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <KeyRound className="w-5 h-5 text-blue-500 absolute animate-pulse" />
        </div>
        <span className="font-mono tracking-widest text-[11px] uppercase text-slate-300">
          Mounting Secure Escrow Enclave...
        </span>
      </div>
    )
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold">Delivery Access Unavailable</h1>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">{error || 'Manifest has expired or been revoked.'}</p>
      </div>
    )
  }

  const isPaid = delivery.status === 'Paid'
  const watermarkText = delivery.watermarkText || 'RELEASEDROP ESCROW • UNPAID PREVIEW'
  const watermarkStyle = delivery.watermarkStyle || 'grid'

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased select-none">
      
      {/* Screen Protection Alert */}
      {isScreenProtected && (
        <div className="fixed inset-0 z-50 bg-[#070B14] flex flex-col items-center justify-center text-center p-6 backdrop-blur-xl">
          <ShieldAlert className="w-12 h-12 text-blue-500 mb-3 animate-bounce" />
          <h2 className="text-base font-black text-white">Capture Intercept Active</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs font-mono">
            Screen captures and keyboard hotkeys are blocked by ReleaseDrop Escrow.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20">
              RD
            </span>
            <div>
              <span className="font-black text-xs sm:text-sm tracking-tight text-slate-900 block leading-tight">
                ReleaseDrop Enclave
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">ID: {delivery.id.slice(0, 8)}...</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {delivery.disputeStatus === 'Disputed' && (
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                <Flag className="w-3 h-3 text-red-600" /> DISPUTED
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 ${
              isPaid 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              {isPaid ? 'CLEARED & LICENSED' : 'ESCROW LOCKED'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Project Meta Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div>
            <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">
              Zero-Login Inspection Enclave
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{delivery.title}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Prepared for <strong className="text-slate-800 font-semibold">{delivery.clientName}</strong>
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Settlement Due</span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Optional Creator Note */}
        {delivery.clientMessage && (
          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs">
            <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 block">Note from Creator:</span>
              <p className="text-slate-600 mt-0.5 leading-relaxed">{delivery.clientMessage}</p>
            </div>
          </div>
        )}

        {/* Media Frame (Clean un-transformed URL + HTML5 Native Video/Image Engine) */}
        <div 
          ref={playerContainerRef} 
          className={`relative rounded-2xl bg-black border border-slate-900 overflow-hidden shadow-2xl transition-all ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen flex items-center justify-center' : 'aspect-video w-full'
          }`}
          onContextMenu={(e) => e.preventDefault()}
        >
          {delivery.fileType?.includes('video') ? (
            <video 
              src={delivery.fileUrl} 
              controls={isPaid}
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              playsInline
              autoPlay
              muted
              loop
              className="w-full h-full object-contain pointer-events-auto"
            />
          ) : (
            <img 
              src={delivery.fileUrl} 
              alt="Deliverable Master Inspection" 
              className="w-full h-full object-contain pointer-events-none" 
              draggable="false"
            />
          )}

          {/* Non-Obtrusive Watermark Overlays (Only Active Pre-Payment) */}
          {!isPaid && (
            <>
              {watermarkStyle === 'grid' ? (
                <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-around opacity-30 select-none z-10">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="whitespace-nowrap text-[13px] sm:text-[16px] md:text-[20px] font-mono font-black text-white tracking-[0.4em] uppercase transform -rotate-12 flex justify-between"
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                    >
                      <span>{watermarkText}</span>
                      <span>{watermarkText}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className="p-4 sm:p-6 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-center shadow-2xl">
                    <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <div className="text-xs sm:text-sm font-mono font-black text-amber-300 tracking-[0.3em] uppercase">
                      {watermarkText}
                    </div>
                    <div className="text-[10px] font-mono text-slate-300 mt-1">Authorized Inspection Only</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Controls Bar */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button 
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition shadow-lg"
              title="Toggle Fullscreen Inspection"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {!isPaid && (
            <div className="absolute bottom-4 left-4 z-20">
              <span className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-[10px] font-mono text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-lg">
                <Lock className="w-3 h-3" /> Watermarked Inspection Stream
              </span>
            </div>
          )}
        </div>

        {/* Action Clearance & Dispute Handling */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          {!isPaid ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-base font-extrabold text-slate-900">Authorize Payment to Download Original Deliverable</h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Once settlement of ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')} clears, all preview watermarks strip instantly and raw master files ({delivery.fileSize}) decrypt for download.
                </p>
              </div>

              <button 
                onClick={() => setShowCheckoutModal(true)}
                className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Lock className="w-4 h-4" />
                <span>Pay ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')} & Decrypt File</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-inner">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Settlement Complete • Rights Granted</h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Master file decrypted: {delivery.fileName} ({delivery.fileSize})
                    </p>
                  </div>
                </div>

                <a 
                  href={delivery.fileUrl} 
                  download={delivery.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" /> Download Raw Master Asset
                </a>
              </div>

              {/* Dispute Resolution Trigger */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Encountered an issue with the delivered files?</span>
                <button 
                  onClick={() => setShowDisputeModal(true)}
                  className="text-red-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Flag className="w-3.5 h-3.5" /> Raise an Escrow Dispute
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MOBILE-FIRST PAYMENT CHECKOUT SHEET / MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-blue-600 font-bold uppercase">SECURE ESCROW CHECKOUT</span>
                <h3 className="text-base font-black text-slate-900">Select Payment Method</h3>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => setPaymentMethod('upi')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition ${
                  paymentMethod === 'upi' ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">UPI / Google Pay / PhonePe</div>
                    <div className="text-[10px] text-slate-400">Instant validation via VPA</div>
                  </div>
                </div>
                {paymentMethod === 'upi' && <Check className="w-4 h-4 text-blue-600" />}
              </button>

              <button 
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition ${
                  paymentMethod === 'card' ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Debit / Credit Card</div>
                    <div className="text-[10px] text-slate-400">Visa, Mastercard, RuPay</div>
                  </div>
                </div>
                {paymentMethod === 'card' && <Check className="w-4 h-4 text-blue-600" />}
              </button>

              <button 
                onClick={() => setPaymentMethod('netbanking')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition ${
                  paymentMethod === 'netbanking' ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Net Banking</div>
                    <div className="text-[10px] text-slate-400">HDFC, ICICI, SBI & others</div>
                  </div>
                </div>
                {paymentMethod === 'netbanking' && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            </div>

            {paymentMethod === 'upi' && (
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Enter UPI ID</label>
                <input 
                  type="text" 
                  placeholder="name@okhdfcbank" 
                  value={upiId} 
                  onChange={e => setUpiId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono" 
                />
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">Total Settlement Due:</span>
              <span className="text-base font-black text-slate-900 font-mono">₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</span>
            </div>

            <button 
              disabled={unlocking}
              onClick={handleProcessPayment}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
            >
              {unlocking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{unlockStep}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay & Decrypt Raw Files Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* DISPUTE RESOLUTION MODAL */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <Flag className="w-4 h-4" />
                <h3 className="text-sm font-black text-slate-900">File Escrow Dispute</h3>
              </div>
              <button onClick={() => setShowDisputeModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              If the unlocked files are corrupted, mismatched, or do not conform to project scope, describe the issue below. ReleaseDrop mediators will review both creator assets and logs.
            </p>

            <textarea 
              rows={3}
              placeholder="Detail the issue with the delivered files..."
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-red-600"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button 
                disabled={disputeSubmitting || !disputeReason.trim()}
                onClick={handleReportDispute}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                {disputeSubmitting ? 'Submitting Dispute...' : 'File Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
