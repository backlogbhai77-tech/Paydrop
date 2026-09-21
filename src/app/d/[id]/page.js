'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore'
import { 
  ShieldCheck, Lock, Unlock, Download, CheckCircle2, AlertTriangle, 
  FileText, ArrowRight, RefreshCw, ExternalLink,
  Check, X, MessageSquare, Send, FileArchive, Receipt, 
  Maximize2, Minimize2, Sparkles, Eye, Share2, Play
} from 'lucide-react'

export default function ClientDeliveryPortal() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const canvasRef = useRef(null)

  // Celebration Confetti Rain State
  const [celebrate, setCelebrate] = useState(false)

  // Checkout Modal States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [downloadingIndex, setDownloadingIndex] = useState(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  
  // Real-Time 2-Way Revision Chat
  const [clientMsg, setClientMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  useEffect(() => {
    if (!id) return

    const docRef = doc(db, 'deliveries', id)

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setDelivery({ id: docSnap.id, ...docSnap.data() })
        setLoading(false)
      } else {
        setError("This escrow delivery vault has expired or does not exist.")
        setLoading(false)
      }
    }, (err) => {
      setError(err.message)
      setLoading(false)
    })

    updateDoc(docRef, { viewCount: increment(1) }).catch(() => {})

    // Fullscreen event listener for sync
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      unsubscribe()
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [id])

  // Native Responsive Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!canvasRef.current) return
    if (!document.fullscreenElement) {
      canvasRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Safe Multi-Format Blob Downloader (Zero file corruption)
  const handleDownloadFile = async (fileUrl, fileName, index) => {
    if (!fileUrl) return
    setDownloadingIndex(index)

    try {
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error("Fetch fallback required")
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'Deliverable_Master'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(fileUrl, '_blank')
    } finally {
      setTimeout(() => setDownloadingIndex(null), 800)
    }
  }

  // Smooth Settlement & Celebration Transition
  const handleAuthorizeSettlement = async () => {
    if (!termsAccepted) {
      alert("Please check the confirmation box to authorize asset release.")
      return
    }

    setUnlocking(true)
    setTimeout(async () => {
      try {
        const docRef = doc(db, 'deliveries', id)
        await updateDoc(docRef, {
          status: 'Paid',
          paidAt: new Date().toISOString()
        })
        setUnlocking(false)
        setShowCheckoutModal(false)

        // Trigger Confetti Party Popper Animation
        setCelebrate(true)
        setTimeout(() => setCelebrate(false), 4500)
      } catch (err) {
        alert("Settlement sync failure: " + err.message)
        setUnlocking(false)
      }
    }, 1200)
  }

  const handlePostFeedback = async () => {
    if (!clientMsg.trim()) return
    setSendingMsg(true)
    try {
      const docRef = doc(db, 'deliveries', id)
      const existing = delivery.messages || []
      const updated = [...existing, { sender: 'client', text: clientMsg.trim(), time: new Date().toISOString() }]
      await updateDoc(docRef, { messages: updated })
      setClientMsg('')
    } catch (err) {
      alert("Failed to submit feedback: " + err.message)
    } finally {
      setSendingMsg(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-xs text-slate-500 gap-3 font-mono">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="tracking-wider">MOUNTING ESCROW PORTAL...</span>
      </div>
    )
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6" />
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
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans antialiased pb-20 relative selection:bg-blue-600 selection:text-white">
      
      {/* High-End Party Popper Confetti Burst */}
      {celebrate && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-xs animate-bounce"
              style={{
                backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'][i % 6],
                top: `${15 + Math.random() * 70}%`,
                left: `${10 + Math.random() * 80}%`,
                transform: `rotate(${Math.random() * 360}deg) scale(${0.7 + Math.random() * 0.8})`,
                transition: 'all 1.2s ease-out'
              }}
            />
          ))}
        </div>
      )}

      {/* Top Professional Header */}
      <header className="border-b border-slate-200/90 bg-white sticky top-0 z-30 px-4 sm:px-8 h-15 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
            RD
          </div>
          <div>
            <span className="font-bold text-xs text-slate-900 block leading-tight">ReleaseDrop Vault</span>
            <span className="text-[10px] text-slate-400 font-mono">AUTOMATED ESCROW SETTLEMENT</span>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono border transition-all ${
          isPaid 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs' 
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {isPaid ? 'LICENSED & RELEASED ✓' : 'PAYMENT-LOCKED ESCROW'}
        </span>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-5">
        
        {/* Project & Settlement Header */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono text-blue-600 uppercase font-bold tracking-wider">Deliverable Package</span>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">{delivery.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">Prepared for <strong className="text-slate-800">{delivery.clientName}</strong></p>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Settlement Due</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Creator Handover Message */}
        {delivery.clientMessage && (
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs text-slate-700 space-y-0.5">
            <strong className="text-blue-900 font-bold block">Creator Handover Note:</strong>
            <p className="leading-relaxed">{delivery.clientMessage}</p>
          </div>
        )}

        {/* Multi-File Tab Selector */}
        {files.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {files.map((file, idx) => (
              <button
                key={idx}
                onClick={() => setActiveFileIndex(idx)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  activeFileIndex === idx 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
            ref={canvasRef}
            className={`relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-md transition-all ${
              isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen flex items-center justify-center' : 'aspect-video w-full'
            }`}
            onContextMenu={e => e.preventDefault()}
          >
            {/* Format 1: Responsive Video */}
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
            ) : 
            /* Format 2: Multi-Page PDF Embed via Google Docs Engine (Zero frame failure) */
            isPDF ? (
              <div className="w-full h-full bg-slate-100 relative">
                <iframe 
                  src={googleDocsViewerUrl}
                  className="w-full h-full border-0"
                  title="PDF Inspection View"
                />
              </div>
            ) : 
            /* Format 3: Image */
            isImage ? (
              <img 
                src={activeFile?.url} 
                alt="Draft Inspection" 
                className={`w-full h-full object-contain ${isPaid ? '' : 'brightness-75'}`}
              />
            ) : (
            /* Format 4: Archive / Source Bundle */
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                <FileArchive className="w-12 h-12 text-blue-500 mb-2" />
                <span className="text-sm font-bold text-white">{activeFile?.name}</span>
                <span className="text-xs text-slate-400 mt-0.5 font-mono">{activeFile?.size} • Verified Archive Bundle</span>
              </div>
            )}

            {/* Prominent Fullscreen Floating Button (Top-Right) */}
            <button 
              onClick={toggleFullscreen}
              className="absolute top-3 right-3 z-30 p-2.5 bg-black/70 hover:bg-black text-white rounded-xl border border-white/20 shadow-lg transition active:scale-95 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-xs"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">Exit</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>

            {/* Anti-Scrape Watermark (Disappears instantly upon payment) */}
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
              <span>🔒 Watermark automatically vanishes upon payment settlement verification</span>
            </div>
          )}
        </div>

        {/* Deliverable Manifest Bundle */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
          <span className="text-xs font-mono uppercase text-slate-400 font-bold block tracking-wider">
            Package Deliverables ({files.length})
          </span>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {files.map((file, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileArchive className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-slate-900 truncate block">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{file.size}</span>
                  </div>
                </div>

                <div>
                  {isPaid ? (
                    <button
                      onClick={() => handleDownloadFile(file.url, file.name, idx)}
                      disabled={downloadingIndex === idx}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs active:scale-95"
                    >
                      {downloadingIndex === idx ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Master</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback & Revision Thread */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Need Changes Before Paying?
              </span>
              <p className="text-[11px] text-slate-500">Submit requests or questions directly to the creator.</p>
            </div>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">Live Thread</span>
          </div>

          {(delivery.messages || []).length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2.5 p-3.5 bg-slate-50 rounded-xl">
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
              placeholder="Ask a question or request adjustments before clearing payment..."
              value={clientMsg}
              onChange={e => setClientMsg(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <div className="flex justify-end">
              <button 
                onClick={handlePostFeedback}
                disabled={sendingMsg || !clientMsg.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" /> <span>Send Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* Settlement Action Area */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs text-center space-y-3">
          {!isPaid ? (
            <div className="space-y-3 max-w-md mx-auto">
              <div>
                <h3 className="text-base font-bold text-slate-900">Approve Deliverables & Unlock Master Files</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upon settlement of ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}, watermarks vanish and uncompressed original assets unseal immediately.
                </p>
              </div>

              <button 
                onClick={() => setShowCheckoutModal(true)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Authorize & Pay ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</span>
              </button>

              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-Bit Escrow Handover Verification</span>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-2 animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Deliverables Decrypted & Licensed</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Payment verified. Master files are ready for direct save above.
              </p>
              <button
                onClick={() => setShowReceiptModal(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                View Digital Invoice Receipt
              </button>
            </div>
          )}
        </div>

      </main>

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] text-blue-600 font-bold uppercase font-mono tracking-wider">ESCROW CLEARANCE</span>
                <h3 className="text-sm font-bold text-slate-900">Confirm Payment & Decrypt Assets</h3>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={termsAccepted} 
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-blue-600 w-4 h-4 rounded"
                />
                <span className="text-[11px] text-slate-600 leading-tight">
                  I have inspected the deliverable proof and agree that original uncompressed master files release immediately upon settlement.
                </span>
              </label>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-500">Total Settlement Due:</span>
              <span className="font-mono font-black text-slate-900 text-base">₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</span>
            </div>

            <button 
              disabled={unlocking || !termsAccepted}
              onClick={handleAuthorizeSettlement}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
            >
              {unlocking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Settlement & Decrypting...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authorize & Decrypt Files</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-2xl p-5 shadow-2xl space-y-3.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <span className="font-bold text-emerald-600 font-mono">PAYMENT CLEARED ✓</span>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-slate-600">
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
              className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-xs mt-2"
            >
              Print Digital Receipt
            </button>
          </div>
        </div>
      )}

      <footer className="py-8 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono mt-12">
        Secured by ReleaseDrop Escrow Handoff
      </footer>
    </div>
  )
}
