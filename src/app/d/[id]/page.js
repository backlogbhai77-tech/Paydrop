'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore'
import { 
  ShieldCheck, Lock, Unlock, Download, CheckCircle2, AlertTriangle, 
  FileText, ArrowRight, RefreshCw, ExternalLink,
  Smartphone, Building2, Check, X, MessageSquare, Send,
  FileArchive, Receipt, Maximize2, Minimize2, Sparkles
} from 'lucide-react'

export default function ClientDeliveryPortal() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const canvasContainerRef = useRef(null)

  // Party Popper Confetti Celebration State
  const [partyPopperActive, setPartyPopperActive] = useState(false)

  // Checkout & Interactive States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [downloadingFileIndex, setDownloadingFileIndex] = useState(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  
  // Real-Time 2-Way Chat State
  const [clientMessageText, setClientMessageText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  useEffect(() => {
    if (!id) return

    const docRef = doc(db, 'deliveries', id)

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setDelivery({ id: docSnap.id, ...docSnap.data() })
        setLoading(false)
      } else {
        setError("Escrow delivery not found or link has expired.")
        setLoading(false)
      }
    }, (err) => {
      setError(err.message)
      setLoading(false)
    })

    updateDoc(docRef, { viewCount: increment(1) }).catch(() => {})

    return () => unsubscribe()
  }, [id])

  const toggleFullscreen = () => {
    if (!canvasContainerRef.current) return
    if (!document.fullscreenElement) {
      canvasContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Safe Universal Blob Downloader
  const handleDownloadItem = async (fileUrl, fileName, index) => {
    if (!fileUrl) return
    setDownloadingFileIndex(index)

    try {
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error("Fallback required")
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName || 'Deliverable_Master'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(fileUrl, '_blank')
    } finally {
      setTimeout(() => setDownloadingFileIndex(null), 1000)
    }
  }

  // Handle Payment with Party Popper / Confetti Burst
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
        setUnlocking(false)
        setShowCheckoutModal(false)

        // Trigger Party Popper celebration burst
        setPartyPopperActive(true)
        setTimeout(() => setPartyPopperActive(false), 3500)
      } catch (err) {
        alert("Payment verification failure: " + err.message)
        setUnlocking(false)
      }
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
      setClientMessageText('')
    } catch (err) {
      alert("Failed to send note: " + err.message)
    } finally {
      setSendingMsg(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-xs text-slate-500 gap-2 font-mono">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>MOUNTING ESCROW PORTAL...</span>
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
  const watermarkText = delivery.watermarkText || 'RELEASEDROP • PROTECTED PREVIEW'
  const files = delivery.files || (delivery.fileUrl ? [{ name: delivery.fileName || 'Master_Package.zip', size: delivery.fileSize || 'Bundle', url: delivery.fileUrl, type: delivery.fileType }] : [])
  const activeFile = files[activeFileIndex] || files[0]

  const fileName = (activeFile?.name || '').toLowerCase()
  const isPDF = activeFile?.type?.includes('pdf') || fileName.endsWith('.pdf')
  const isVideo = activeFile?.type?.includes('video') || fileName.match(/\.(mp4|mov|webm)$/i)
  const isImage = activeFile?.type?.includes('image') || fileName.match(/\.(png|jpg|jpeg|webp)$/i)

  const googleDocsViewerUrl = isPDF && activeFile?.url 
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(activeFile.url)}`
    : null

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans antialiased pb-16 relative">
      
      {/* Celebration Confetti Burst on Payment */}
      {partyPopperActive && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-xs animate-bounce"
              style={{
                backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'][i % 5],
                top: `${20 + Math.random() * 60}%`,
                left: `${15 + Math.random() * 70}%`,
                transform: `rotate(${Math.random() * 360}deg) scale(${0.8 + Math.random() * 0.8})`,
                transition: 'all 1s ease-out'
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            RD
          </div>
          <div>
            <span className="font-bold text-xs text-slate-900 block leading-tight">ReleaseDrop Vault</span>
            <span className="text-[9px] text-slate-400 font-mono">SECURE ESCROW HANDOFF</span>
          </div>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
          isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {isPaid ? 'LICENSED & UNLOCKED ✓' : 'ESCROW LOCKED'}
        </span>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-5">
        
        {/* Project Header Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono text-blue-600 uppercase font-bold">Deliverable Proof</span>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">{delivery.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">Prepared for <strong className="text-slate-800">{delivery.clientName}</strong></p>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Settlement Due</span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Handover Note */}
        {delivery.clientMessage && (
          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-slate-700">
            <strong className="text-blue-900 block mb-0.5 font-bold">Creator Handover Note:</strong>
            <p className="leading-relaxed">{delivery.clientMessage}</p>
          </div>
        )}

        {/* Multi-File Tab Selector */}
        {files.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {files.map((file, idx) => (
              <button
                key={idx}
                onClick={() => setActiveFileIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
                  activeFileIndex === idx ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>
        )}

        {/* Universal Studio Inspection Canvas */}
        <div className="space-y-1.5">
          <div 
            ref={canvasContainerRef}
            className={`relative rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-sm ${
              isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen flex items-center justify-center' : 'aspect-video w-full'
            }`}
            onContextMenu={e => e.preventDefault()}
          >
            {isVideo ? (
              <video 
                src={activeFile?.url} 
                controls={isPaid}
                controlsList="nodownload"
                playsInline
                autoPlay 
                muted 
                loop 
                className="w-full h-full object-contain"
              />
            ) : isPDF ? (
              <div className="w-full h-full relative bg-slate-100 flex items-center justify-center">
                <iframe 
                  src={googleDocsViewerUrl}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              </div>
            ) : isImage ? (
              <img 
                src={activeFile?.url} 
                alt="Draft Inspection" 
                className={`w-full h-full object-contain ${isPaid ? '' : 'brightness-75'}`}
              />
            ) : (
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                <FileArchive className="w-10 h-10 text-blue-500 mb-2" />
                <span className="text-sm font-bold text-white">{activeFile?.name}</span>
                <span className="text-xs text-slate-400 mt-0.5">{activeFile?.size} • Encrypted Archive Bundle</span>
              </div>
            )}

            <button 
              onClick={toggleFullscreen}
              className="absolute top-3 right-3 z-20 p-2 bg-black/60 hover:bg-black/90 text-white rounded-lg border border-white/10 transition"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {!isPaid && !isPDF && (
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

          {!isPaid && (
            <div className="flex items-center gap-1.5 px-2 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>🔒 Multi-Page Inspection — Watermark automatically vanishes upon payment verification</span>
            </div>
          )}
        </div>

        {/* Deliverable Manifest Bundle */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5">
          <span className="text-xs font-mono uppercase text-slate-400 font-bold block">
            Bundle Deliverables ({files.length})
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
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs"
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

        {/* Feedback & Revision Box */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Need Changes Before Paying?
              </span>
              <p className="text-[11px] text-slate-500">Communicate adjustments directly with the creator.</p>
            </div>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Live Thread</span>
          </div>

          {(delivery.messages || []).length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-xl">
              {delivery.messages.map((m, idx) => {
                const isCreator = m.sender === 'creator'
                return (
                  <div key={idx} className={`flex flex-col ${isCreator ? 'items-start' : 'items-end'}`}>
                    <span className="text-[9px] text-slate-400 font-mono mb-0.5">
                      {isCreator ? 'Creator' : 'You'} • {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className={`p-2.5 rounded-xl text-xs max-w-sm ${
                      isCreator ? 'bg-blue-600 text-white rounded-bl-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-br-xs'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="space-y-2">
            <textarea 
              rows={2}
              placeholder="Ask questions or submit revision notes to the creator..."
              value={clientMessageText}
              onChange={e => setClientMessageText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <div className="flex justify-end">
              <button 
                onClick={handlePostClientMessage}
                disabled={sendingMsg || !clientMessageText.trim()}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg disabled:opacity-40 transition flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> <span>Send Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pay & Release Action Area */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs text-center space-y-3">
          {!isPaid ? (
            <div className="space-y-3 max-w-sm mx-auto">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Approve Deliverables & Unlock Master Files</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upon settlement of ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}, watermarks vanish and uncompressed original assets unlock immediately.
                </p>
              </div>

              <button 
                onClick={() => setShowCheckoutModal(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Approve & Pay ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</span>
              </button>
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Deliverables Decrypted & Licensed</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Payment verified. Master files are now ready for single-click download above.
              </p>
            </div>
          )}
        </div>

      </main>

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
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
                  I approve the deliverable proof and agree that original master asset access unseals immediately upon payment.
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
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              {unlocking ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Clearing Escrow Vault...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Authorize & Decrypt Files</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
