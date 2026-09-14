'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore'
import { 
  ShieldCheck, Lock, Unlock, Download, CheckCircle2, AlertTriangle, 
  Eye, FileText, ArrowRight, ShieldAlert,
  Sparkles, RefreshCw, KeyRound, ExternalLink, CreditCard,
  Smartphone, Building2, Check, X, Flag, MessageSquare, Send,
  FileArchive, Clock, Receipt
} from 'lucide-react'

export default function ClientDeliveryPortal() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Checkout & Interactive States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [upiId, setUpiId] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockStep, setUnlockStep] = useState('')
  const [downloadingFileIndex, setDownloadingFileIndex] = useState(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  
  // Client Revision Messaging
  const [clientMessageText, setClientMessageText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  useEffect(() => {
    if (!id) return

    const fetchDelivery = async () => {
      try {
        const docRef = doc(db, 'deliveries', id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          const data = snap.data()
          setDelivery({ id: snap.id, ...data })
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

  // Single-Click Direct Download with interactive animation
  const handleDownloadItem = async (fileUrl, fileName, index) => {
    if (!fileUrl) return
    setDownloadingFileIndex(index)

    try {
      const res = await fetch(fileUrl)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'Deliverable_Asset'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.location.href = fileUrl
    } finally {
      setTimeout(() => setDownloadingFileIndex(null), 1200)
    }
  }

  const handleProcessPayment = async () => {
    if (!termsAccepted) {
      alert("Please accept the delivery & usage terms to proceed.")
      return
    }

    setUnlocking(true)
    setUnlockStep(`Connecting to ${paymentMethod.toUpperCase()} Settlement...`)

    setTimeout(async () => {
      setUnlockStep('Stripping watermarks & verifying digital signatures...')
      setTimeout(async () => {
        try {
          const docRef = doc(db, 'deliveries', id)
          await updateDoc(docRef, {
            status: 'Paid',
            paidAt: new Date().toISOString(),
            paymentMethodUsed: paymentMethod,
            timeline: [
              { step: 'Work Uploaded', done: true },
              { step: 'Client Notified', done: true },
              { step: 'Awaiting Approval', done: true },
              { step: 'Payment Cleared', done: true },
              { step: 'Download Unlocked', done: true }
            ]
          })
          setDelivery(prev => ({ ...prev, status: 'Paid' }))
          setUnlocking(false)
          setShowCheckoutModal(false)
        } catch (err) {
          alert("Clearance error: " + err.message)
          setUnlocking(false)
        }
      }, 1000)
    }, 1200)
  }

  const handlePostClientMessage = async () => {
    if (!clientMessageText.trim()) return
    setSendingMsg(true)
    try {
      const docRef = doc(db, 'deliveries', id)
      const existing = delivery.messages || []
      const updated = [...existing, { sender: 'client', text: clientMessageText.trim(), time: new Date().toISOString() }]
      await updateDoc(docRef, { messages: updated })
      setDelivery(prev => ({ ...prev, messages: updated }))
      setClientMessageText('')
    } catch (err) {
      alert("Failed to send message: " + err.message)
    } finally {
      setSendingMsg(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B11] flex flex-col items-center justify-center text-xs text-slate-400 gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="tracking-wide uppercase font-mono">Mounting Secure Escrow Vault...</span>
      </div>
    )
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold">Delivery Unavailable</h1>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">{error || 'This link has expired.'}</p>
      </div>
    )
  }

  const isPaid = delivery.status === 'Paid'
  const brandName = delivery.customBrand?.studioName || 'ReleaseDrop Studio'
  const watermarkText = delivery.watermarkText || 'RELEASEDROP • PROTECTED PREVIEW'
  const files = delivery.files || (delivery.fileUrl ? [{ name: delivery.fileName || 'Master_Package.zip', size: delivery.fileSize || 'Bundle', url: delivery.fileUrl }] : [])

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#080B11] text-slate-100 font-sans selection:bg-blue-600 selection:text-white antialiased select-none pb-16">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0A0E17]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            RD
          </div>
          <div>
            <span className="font-bold text-xs sm:text-sm tracking-tight text-white block">
              {brandName}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">SECURE VAULT HANDOFF</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono flex items-center gap-1.5 border ${
            isPaid 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
            {isPaid ? 'LICENSED & UNLOCKED' : 'ESCROW LOCKED'}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        
        {/* Project Meta Box */}
        <div className="bg-[#0F1422] border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono text-blue-400 uppercase font-bold tracking-wider">
              Client Delivery Enclave
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">{delivery.title}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Prepared for <strong className="text-slate-200">{delivery.clientName}</strong>
            </p>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Settlement Due</span>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Project Status Timeline (Requested Feature) */}
        <div className="p-4 bg-[#0F1422] border border-slate-800 rounded-2xl">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-3 font-semibold">Delivery Lifecycle:</span>
          <div className="grid grid-cols-5 text-center text-[10px] font-mono gap-1">
            <div className="text-emerald-400 font-bold">✓ Uploaded</div>
            <div className="text-emerald-400 font-bold">✓ Notified</div>
            <div className={isPaid ? "text-emerald-400 font-bold" : "text-amber-300 font-bold"}>
              {isPaid ? "✓ Approved" : "● In Review"}
            </div>
            <div className={isPaid ? "text-emerald-400 font-bold" : "text-slate-500"}>
              {isPaid ? "✓ Payment" : "○ Payment"}
            </div>
            <div className={isPaid ? "text-emerald-400 font-bold" : "text-slate-500"}>
              {isPaid ? "✓ Unlocked" : "○ Download"}
            </div>
          </div>
        </div>

        {/* Creator Note */}
        {delivery.clientMessage && (
          <div className="p-4 bg-blue-950/20 border border-blue-500/20 rounded-2xl text-xs text-slate-300">
            <strong className="text-blue-300 block mb-0.5">Note from Creator:</strong>
            <p>{delivery.clientMessage}</p>
          </div>
        )}

        {/* Inspection Canvas with Drifting Watermark */}
        <div className="rounded-2xl bg-black border border-slate-800 overflow-hidden relative shadow-2xl">
          <div className="relative aspect-video w-full flex items-center justify-center bg-black overflow-hidden select-none">
            {delivery.primaryPreviewUrl?.includes('video') ? (
              <video 
                src={delivery.primaryPreviewUrl} 
                controls={isPaid}
                controlsList="nodownload"
                autoPlay 
                muted 
                loop 
                className="w-full h-full object-contain"
              />
            ) : (
              <img 
                src={delivery.primaryPreviewUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200"} 
                alt="Deliverable Inspection" 
                className={`w-full h-full object-contain transition duration-500 ${isPaid ? '' : 'brightness-75'}`}
              />
            )}

            {/* Subtle Drifting Anti-Screenshot Watermark */}
            {!isPaid && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-around select-none z-10 opacity-35 animate-watermark-drift">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="whitespace-nowrap text-sm sm:text-base font-black text-white tracking-widest uppercase flex justify-around">
                    <span>{watermarkText}</span>
                    <span>{watermarkText}</span>
                  </div>
                ))}
              </div>
            )}

            {!isPaid && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none">
                <div className="p-3 bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 text-center shadow-xl">
                  <Lock className="w-6 h-6 text-amber-400 mx-auto mb-1 animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-wide uppercase">Inspection Draft Sandbox</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Raw 4K/source deliverables unlock post-payment.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Multiple Files Package Manifest */}
        <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 space-y-3">
          <span className="text-xs font-mono uppercase text-slate-400 tracking-wider block font-semibold">
            Deliverable Bundle ({files.length} Item{files.length > 1 ? 's' : ''})
          </span>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-black/40 overflow-hidden">
            {files.map((file, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-3 truncate">
                  <FileArchive className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-white truncate block">{file.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{file.size}</span>
                  </div>
                </div>

                <div>
                  {isPaid ? (
                    <button
                      onClick={() => handleDownloadItem(file.url, file.name, idx)}
                      disabled={downloadingFileIndex === idx}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md active:scale-95"
                    >
                      {downloadingFileIndex === idx ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Save File</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Panel & Signature 🔒 -> 🔓 Unlock Animation */}
        <div className="bg-[#0F1422] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
          {!isPaid ? (
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Approve & Unlock Production Assets</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Once settlement clears, all draft watermarks are removed and full high-resolution files download instantly.
                </p>
              </div>

              <button 
                onClick={() => setShowCheckoutModal(true)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Lock className="w-4 h-4" />
                <span>Approve & Pay ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</span>
              </button>

              <div className="text-[10px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Login Encrypted Handoff Protocol</span>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4 animate-unlock-burst">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                <Unlock className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">Your Final Files Are Unlocked!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {delivery.customBrand?.thankYouMessage || "Payment confirmed. Original production assets and full usage rights are now released."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" /> View Payment Receipt
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Client Revision Request & Change Inquiry Chat Box */}
        <div className="p-5 bg-[#0F1422] border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-blue-400" /> Request Revisions / Ask Question
            </span>
            <span className="text-[10px] text-slate-500">Sent directly to creator</span>
          </div>

          <div className="space-y-2">
            <textarea 
              rows={2}
              placeholder="Need changes or have feedback before payment? Write here..."
              value={clientMessageText}
              onChange={e => setClientMessageText(e.target.value)}
              className="w-full bg-black/40 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end">
              <button 
                onClick={handlePostClientMessage}
                disabled={sendingMsg || !clientMessageText.trim()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> <span>Send Request</span>
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* CHECKOUT MODAL WITH CONTRACT TERMS & LEGAL CHECKBOX */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0F1422] border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-blue-400 font-mono font-bold uppercase">ESCROW SETTLEMENT</span>
                <h3 className="text-base font-bold text-white">Authorize & Release Assets</h3>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <button 
                onClick={() => setPaymentMethod('upi')}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition ${
                  paymentMethod === 'upi' ? 'bg-blue-600/20 border-blue-500 text-white' : 'border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Instant UPI / QR</div>
                    <div className="text-[10px] text-slate-500">Google Pay, PhonePe, Paytm</div>
                  </div>
                </div>
                {paymentMethod === 'upi' && <Check className="w-4 h-4 text-blue-400" />}
              </button>

              <button 
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition ${
                  paymentMethod === 'card' ? 'bg-blue-600/20 border-blue-500 text-white' : 'border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Cards & NetBanking</div>
                    <div className="text-[10px] text-slate-500">Visa, Mastercard, RuPay</div>
                  </div>
                </div>
                {paymentMethod === 'card' && <Check className="w-4 h-4 text-blue-400" />}
              </button>
            </div>

            {/* Contract Terms Checkbox (Requested Feature) */}
            <div className="p-3 bg-black/40 border border-slate-800 rounded-xl space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={termsAccepted} 
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-blue-600 w-4 h-4 rounded"
                />
                <span className="text-[11px] text-slate-300 leading-tight">
                  I accept the project deliverable terms, usage rights transfer, and non-refundable digital release policy upon decryption.
                </span>
              </label>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Settlement Due:</span>
              <span className="font-bold font-mono text-white text-base">₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</span>
            </div>

            <button 
              disabled={unlocking || !termsAccepted}
              onClick={handleProcessPayment}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              {unlocking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{unlockStep}</span>
                </>
              ) : (
                <span>Approve & Unlock Production Assets</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* INVOICE / PAYMENT RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-emerald-600 uppercase font-mono">PAYMENT CLEARED ✓</span>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Project:</span>
                <span className="font-bold text-slate-800">{delivery.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-slate-900 font-mono">₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Settled On:</span>
                <span className="font-mono text-slate-700">{new Date(delivery.paidAt || Date.now()).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Studio:</span>
                <span className="font-semibold text-slate-800">{brandName}</span>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Print / Save Receipt PDF
            </button>
          </div>
        </div>
      )}

      <footer className="py-6 border-t border-slate-900 text-center text-[10px] text-slate-600 font-mono mt-12">
        Protected by <span className="text-slate-400 font-semibold">{brandName}</span> via ReleaseDrop Protocol
      </footer>
    </div>
  )
}
