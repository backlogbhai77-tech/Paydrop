'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, updateDoc, increment, onSnapshot } from 'firebase/firestore'
import { 
  ShieldCheck, Lock, Unlock, Download, CheckCircle2, AlertTriangle, 
  RefreshCw, ExternalLink, MessageSquare, Send, FileArchive, 
  Maximize2, Minimize2, X, Check
} from 'lucide-react'

export default function ClientDeliveryPortal() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const canvasRef = useRef(null)

  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [downloadingIndex, setDownloadingIndex] = useState(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  
  const [clientMsg, setClientMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  // Razorpay Checkout Loader
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  useEffect(() => {
    if (!id) return

    const docRef = doc(db, 'deliveries', id)

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setDelivery({ id: docSnap.id, ...docSnap.data() })
        setLoading(false)
      } else {
        setError("This delivery vault has expired or does not exist.")
        setLoading(false)
      }
    }, (err) => {
      setError(err.message)
      setLoading(false)
    })

    updateDoc(docRef, { viewCount: increment(1) }).catch(() => {})

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      unsubscribe()
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [id])

  const toggleFullscreen = () => {
    if (!canvasRef.current) return
    if (!document.fullscreenElement) {
      canvasRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Safe file downloader for unlocked master files
  const handleDownloadFile = async (fileUrl, fileName, index) => {
    if (!fileUrl) return
    setDownloadingIndex(index)

    try {
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error("Fetch fallback triggered")
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'Master_Asset'
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

  // Production Payment Flow (Razorpay / Server Webhook)
  const handleAuthorizeSettlement = async () => {
    if (!termsAccepted) {
      alert("Please confirm inspection to proceed.")
      return
    }

    setUnlocking(true)
    const isLoaded = await loadRazorpayScript()

    if (!isLoaded) {
      alert("Payment gateway failed to load. Check your internet connection.")
      setUnlocking(false)
      return
    }

    // Call backend API route to initiate verifiable transaction
    try {
      const res = await fetch('/api/send-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-order',
          deliveryId: id,
          amount: delivery.grossAmount
        })
      })

      const data = await res.json()

      // Fallback for immediate sandbox test
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY || "rzp_test_placeholder",
        amount: (Number(delivery.grossAmount) * 100).toString(),
        currency: "INR",
        name: "PayDrop Escrow",
        description: `Unlock master deliverables for ${delivery.title}`,
        handler: async function (response) {
          // Backend verification
          await fetch('/api/send-delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'verify-payment',
              deliveryId: id,
              paymentId: response.razorpay_payment_id
            })
          })
          setShowCheckoutModal(false)
          setUnlocking(false)
        },
        prefill: {
          name: delivery.clientName || "",
          email: delivery.clientEmail || ""
        },
        theme: { color: "#2563EB" }
      }

      if (window.Razorpay) {
        const paymentObject = new window.Razorpay(options)
        paymentObject.open()
      } else {
        throw new Error("Payment rail not reachable")
      }
    } catch {
      // Offline fallback indicator
      alert("Payment gateway order created. Connect your production Razorpay/Cashfree webhook to complete instant auto-unlock.")
    } finally {
      setUnlocking(false)
    }
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
      alert("Failed to send message: " + err.message)
    } finally {
      setSendingMsg(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-xs text-slate-500 gap-3 font-mono">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>OPENING DELIVERABLE VAULT...</span>
      </div>
    )
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-base font-bold">Delivery Unavailable</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{error || 'This link has expired or was removed by the creator.'}</p>
      </div>
    )
  }

  const isPaid = delivery.status === 'Paid'
  const watermarkText = delivery.watermarkText || 'PAYDROP • PREVIEW COPY'
  const files = delivery.files || []
  const activeFile = files[activeFileIndex] || files[0]

  const fileName = (activeFile?.name || '').toLowerCase()
  const isPDF = activeFile?.type?.includes('pdf') || fileName.endsWith('.pdf')
  const isVideo = activeFile?.type?.includes('video') || fileName.match(/\.(mp4|mov|webm)$/i)
  const isImage = activeFile?.type?.includes('image') || fileName.match(/\.(png|jpg|jpeg|webp)$/i)

  // Serve burned-in watermark preview when unpaid, raw master URL when paid
  const activeDisplayUrl = isPaid 
    ? (activeFile?.rawUrl || activeFile?.url) 
    : (activeFile?.previewUrl || activeFile?.url)

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans antialiased pb-20 relative selection:bg-blue-600 selection:text-white">
      
      {/* HEADER */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-30 px-4 sm:px-8 h-14 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs">
            PD
          </div>
          <div>
            <span className="font-bold text-xs text-slate-900 block leading-tight">PayDrop Vault</span>
            <span className="text-[10px] text-slate-400 font-mono">CLIENT INSPECTION PORTAL</span>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border transition-all ${
          isPaid 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {isPaid ? 'PAYMENT VERIFIED • UNLOCKED' : 'PAYMENT-LOCKED PREVIEW'}
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-5">
        
        {/* Project Header */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono text-blue-600 uppercase font-bold tracking-wider">Project Handover</span>
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

        {/* Note from Creator */}
        {delivery.clientMessage && (
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs text-slate-700 space-y-0.5">
            <strong className="text-blue-900 font-bold block">Handover Note:</strong>
            <p className="leading-relaxed">{delivery.clientMessage}</p>
          </div>
        )}

        {/* Multi-file tabs */}
        {files.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {files.map((file, idx) => (
              <button
                key={idx}
                onClick={() => setActiveFileIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
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

        {/* Universal Studio Preview Canvas */}
        <div className="space-y-1.5">
          <div 
            ref={canvasRef}
            className={`relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-sm transition-all ${
              isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen flex items-center justify-center' : 'aspect-video w-full'
            }`}
            onContextMenu={e => e.preventDefault()}
          >
            {isVideo ? (
              <video 
                src={activeDisplayUrl} 
                controls={isPaid}
                controlsList="nodownload"
                playsInline
                autoPlay 
                muted 
                loop 
                className="w-full h-full object-contain"
              />
            ) : isPDF ? (
              <div className="w-full h-full bg-slate-100 relative flex items-center justify-center">
                <iframe 
                  src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(activeDisplayUrl)}`}
                  className="w-full h-full border-0"
                  title="PDF Inspection View"
                />
              </div>
            ) : isImage ? (
              <img 
                src={activeDisplayUrl} 
                alt="Deliverable Draft" 
                className={`w-full h-full object-contain ${isPaid ? '' : 'select-none pointer-events-none'}`}
              />
            ) : (
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                <FileArchive className="w-12 h-12 text-blue-500 mb-2" />
                <span className="text-sm font-bold text-white">{activeFile?.name}</span>
                <span className="text-xs text-slate-400 mt-0.5 font-mono">{activeFile?.size} • Master Archive</span>
              </div>
            )}

            {/* Fullscreen Button */}
            <button 
              onClick={toggleFullscreen}
              className="absolute top-3 right-3 z-30 p-2 bg-black/60 hover:bg-black/90 text-white rounded-xl border border-white/20 transition active:scale-95 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-xs"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Canvas Protection Overlay (Dynamic Moving Watermark) */}
            {!isPaid && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-around select-none z-10 opacity-25">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="whitespace-nowrap text-xs sm:text-sm font-black text-white tracking-widest uppercase flex justify-around rotate-[-15deg]">
                    <span>{watermarkText}</span>
                    <span>{watermarkText}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isPaid && (
            <div className="flex items-center gap-1.5 px-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Watermark is removed and original raw uncompressed assets unlock immediately after settlement.</span>
            </div>
          )}
        </div>

        {/* Deliverable File Manifest */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
          <span className="text-xs font-mono uppercase text-slate-400 font-bold block tracking-wider">
            Files in this Vault ({files.length})
          </span>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {files.map((file, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
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
                      onClick={() => handleDownloadFile(file.rawUrl || file.url, file.name, idx)}
                      disabled={downloadingIndex === idx}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs active:scale-95"
                    >
                      {downloadingIndex === idx ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
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

        {/* Feedback / Revision Chat */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Need adjustments before paying?
              </span>
              <p className="text-[11px] text-slate-500">Send revision requests directly to the creator.</p>
            </div>
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
                      isCreator ? 'bg-slate-200 text-slate-900 rounded-bl-xs' : 'bg-blue-600 text-white rounded-br-xs'
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
              placeholder="Type revision notes or feedback..."
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

        {/* Settlement CTA */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs text-center space-y-3">
          {!isPaid ? (
            <div className="space-y-3 max-w-md mx-auto">
              <div>
                <h3 className="text-base font-bold text-slate-900">Approve and Unlock Master Files</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete payment of ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')} to clear watermarks and unlock raw original assets.
                </p>
              </div>

              <button 
                onClick={() => setShowCheckoutModal(true)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Pay ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')} & Unlock Master Files</span>
              </button>
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Deliverables Unlocked</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Payment verified. All high-resolution files are available for download above.
              </p>
              <button
                onClick={() => setShowReceiptModal(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                View Settlement Receipt
              </button>
            </div>
          )}
        </div>

      </main>

      {/* CHECKOUT CONFIRMATION MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] text-blue-600 font-bold uppercase font-mono tracking-wider">SECURE CHECKOUT</span>
                <h3 className="text-sm font-bold text-slate-900">Confirm Payment & Asset Release</h3>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={termsAccepted} 
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-blue-600 w-4 h-4 rounded"
                />
                <span className="text-[11px] text-slate-600 leading-tight">
                  I have verified the preview files and confirm immediate unlocking of master deliverables upon settlement.
                </span>
              </label>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-500">Amount Due:</span>
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
                  <span>Connecting to Gateway...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Proceed to Payment</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* INVOICE RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-2xl p-5 shadow-2xl space-y-3.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <span className="font-bold text-emerald-600 font-mono">PAYMENT CLEARED ✓</span>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Item:</span>
                <strong className="text-slate-900 truncate max-w-[180px]">{delivery.title}</strong>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <strong className="text-slate-900 font-mono">₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between">
                <span>Settled On:</span>
                <span className="font-mono">{new Date(delivery.paidAt || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-xs mt-2"
            >
              Print Receipt
            </button>
          </div>
        </div>
      )}

      <footer className="py-8 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono mt-12">
        Powered by PayDrop Handoff Vaults
      </footer>
    </div>
  )
}
