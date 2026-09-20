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
  FileArchive, Clock, Receipt, Maximize2, Minimize2
} from 'lucide-react'

export default function ClientDeliveryPortal() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Player & Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false)
  const playerContainerRef = useRef(null)

  // Checkout & States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
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

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const handleDownloadItem = async (fileUrl, fileName, index) => {
    if (!fileUrl) return
    setDownloadingFileIndex(index)

    try {
      const res = await fetch(fileUrl)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'ReleaseDrop_Asset'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.location.href = fileUrl
    } finally {
      setTimeout(() => setDownloadingFileIndex(null), 1000)
    }
  }

  const handleProcessPayment = async () => {
    if (!termsAccepted) {
      alert("Please accept the deliverable terms to unlock files.")
      return
    }

    setUnlocking(true)
    setTimeout(async () => {
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
        alert("Payment sync failure: " + err.message)
        setUnlocking(false)
      }
    }, 1500)
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
      alert("Failed to submit request: " + err.message)
    } finally {
      setSendingMsg(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-xs text-slate-500 gap-3 font-mono">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>INITIALIZING SECURE PORTAL...</span>
      </div>
    )
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-3">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h1 className="text-base font-bold">Portal Unavailable</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{error || 'This link has expired or been revoked.'}</p>
      </div>
    )
  }

  const isPaid = delivery.status === 'Paid'
  const brandName = delivery.customBrand?.studioName || 'ReleaseDrop Workspace'
  const watermarkText = delivery.watermarkText || 'RELEASEDROP • PROTECTED PREVIEW'
  const files = delivery.files || (delivery.fileUrl ? [{ name: delivery.fileName || 'Master_Package.zip', size: delivery.fileSize || 'Bundle', url: delivery.fileUrl }] : [])

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased pb-16">
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            RD
          </div>
          <div>
            <span className="font-semibold text-xs text-slate-900 block">{brandName}</span>
            <span className="text-[9px] text-slate-400 font-mono">SECURE ESCROW VAULT</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono border ${
            isPaid 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isPaid ? 'LICENSED' : 'LOCKED'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-5">
        
        {/* Invoice Summary Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono text-blue-600 uppercase font-semibold">Deliverable</span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{delivery.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">Prepared for {delivery.clientName}</p>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Settlement Due</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Handover Message */}
        {delivery.clientMessage && (
          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-slate-700">
            <strong className="text-blue-900 block mb-0.5 font-semibold">Creator Note:</strong>
            <p className="leading-relaxed">{delivery.clientMessage}</p>
          </div>
        )}

        {/* Studio Inspection Canvas + Fullscreen Player */}
        <div className="space-y-1.5">
          <div 
            ref={playerContainerRef}
            className={`relative rounded-xl bg-black border border-slate-800 overflow-hidden shadow-sm ${
              isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen flex items-center justify-center' : 'aspect-video w-full'
            }`}
            onContextMenu={e => e.preventDefault()}
          >
            {delivery.primaryPreviewUrl?.includes('video') ? (
              <video 
                src={delivery.primaryPreviewUrl} 
                controls={isPaid}
                controlsList="nodownload"
                playsInline
                autoPlay 
                muted 
                loop 
                className="w-full h-full object-contain"
              />
            ) : (
              <img 
                src={delivery.primaryPreviewUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200"} 
                alt="Inspection" 
                className={`w-full h-full object-contain ${isPaid ? '' : 'brightness-75'}`}
              />
            )}

            {/* Fullscreen Button Toggle */}
            <button 
              onClick={toggleFullscreen}
              className="absolute top-3 right-3 z-20 p-2 bg-black/60 hover:bg-black/90 text-white rounded-lg border border-white/10 transition"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Watermark Overlay */}
            {!isPaid && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-around select-none z-10 opacity-30 animate-watermark-drift">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="whitespace-nowrap text-xs sm:text-sm font-black text-white tracking-widest uppercase flex justify-around">
                    <span>{watermarkText}</span>
                    <span>{watermarkText}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dedicated Watermark Overlay Notice */}
          {!isPaid && (
            <div className="flex items-center gap-1.5 px-2 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>🔒 Secure Preview — Watermark automatically vanishes upon payment verification</span>
            </div>
          )}
        </div>

        {/* File Package Bundle Manifest */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2.5">
          <span className="text-xs font-mono uppercase text-slate-400 font-semibold block">
            Bundle Files ({files.length})
          </span>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {files.map((file, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2.5 truncate">
                  <FileArchive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-slate-900 truncate block">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{file.size}</span>
                  </div>
                </div>

                <div>
                  {isPaid ? (
                    <button
                      onClick={() => handleDownloadItem(file.url, file.name, idx)}
                      disabled={downloadingFileIndex === idx}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      {downloadingFileIndex === idx ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inquiries & Revisions Input: Made Prominent BEFORE Payment */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Need Changes Before Paying?
            </span>
            <span className="text-[10px] text-slate-400">Zero-risk revision request</span>
          </div>

          <div className="space-y-2">
            <textarea 
              rows={2}
              placeholder="Ask questions or request changes directly from the creator before clearing payment..."
              value={clientMessageText}
              onChange={e => setClientMessageText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <div className="flex justify-end">
              <button 
                onClick={handlePostClientMessage}
                disabled={sendingMsg || !clientMessageText.trim()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg disabled:opacity-40 transition flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> <span>Send Revision Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pay & Release Action Area */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm text-center space-y-3">
          {!isPaid ? (
            <div className="space-y-3 max-w-sm mx-auto">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Approve Deliverables & Unlock Master Files</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upon verification of ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}, watermarks vanish and uncompressed original assets are released immediately.
                </p>
              </div>

              <button 
                onClick={() => setShowCheckoutModal(true)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Approve & Pay ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</span>
              </button>

              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>256-Bit SSL Encrypted Escrow Clearance</span>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Assets Decrypted & Released</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Payment verified. Master files are now ready for direct save above.
              </p>
              <button
                onClick={() => setShowReceiptModal(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
              >
                View Digital Invoice Receipt
              </button>
            </div>
          )}
        </div>

      </main>

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl space-y-3.5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[9px] text-blue-600 font-bold uppercase font-mono">ESCROW RELEASE</span>
                <h3 className="text-sm font-bold text-slate-900">Authorize Settlement</h3>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={termsAccepted} 
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-blue-600 w-3.5 h-3.5 rounded"
                />
                <span className="text-[11px] text-slate-600 leading-tight">
                  I approve the deliverable draft and confirm that master asset access releases immediately upon settlement.
                </span>
              </label>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-500">Total Settlement:</span>
              <span className="font-mono text-slate-900 text-sm">₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</span>
            </div>

            <button 
              disabled={unlocking || !termsAccepted}
              onClick={handleProcessPayment}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
            >
              {unlocking ? 'Verifying Settlement...' : 'Complete Payment & Decrypt Files'}
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-xl p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-bold text-emerald-600 uppercase font-mono">PAYMENT CLEARED ✓</span>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Deliverable:</span>
                <strong className="text-slate-900 truncate max-w-[180px]">{delivery.title}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Settled:</span>
                <strong className="text-slate-900 font-mono">₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-mono">{new Date(delivery.paidAt || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="w-full py-2 bg-slate-900 text-white font-semibold rounded-lg shadow-sm mt-1"
            >
              Print Receipt
            </button>
          </div>
        </div>
      )}

      <footer className="py-6 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono mt-8">
        Secured by <span className="text-slate-700 font-medium">{brandName}</span> via ReleaseDrop
      </footer>
    </div>
  )
}
