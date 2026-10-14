'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { 
  Zap, Lock, ShieldCheck, Download, FileArchive, Video, 
  FileCode, FileText, CheckCircle2, AlertCircle, RefreshCw, X,
  Smartphone, CreditCard, Building2, Eye, MessageSquare, Send, Sparkles, Shield,
  Clock, Copy, ExternalLink, HelpCircle, AlertTriangle, FileCheck, Layers
} from 'lucide-react'

function formatINR(amount) {
  const num = Number(amount)
  if (isNaN(num)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num)
}

function getFileIcon(filename = '', type = '') {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || type.startsWith('video/')) {
    return <Video className="w-5 h-5 text-purple-400 animate-pulse" />
  }
  if (['zip', 'rar', '7z', 'tar'].includes(ext)) {
    return <FileArchive className="w-5 h-5 text-amber-400" />
  }
  if (['js', 'ts', 'py', 'json', 'html', 'css', 'cpp'].includes(ext)) {
    return <FileCode className="w-5 h-5 text-emerald-400" />
  }
  return <FileText className="w-5 h-5 text-blue-400" />
}

export default function ClientPortal() {
  const params = useParams()
  const deliveryId = params?.id

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Custom Gateway State
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedPayMethod, setSelectedPayMethod] = useState('upi')
  const [processingPayment, setProcessingPayment] = useState(false)

  // Active Preview Asset State
  const [activePreviewFile, setActivePreviewFile] = useState(null)

  // Revision Thread Box State
  const [revisionNote, setRevisionNote] = useState('')
  const [sendingRevision, setSendingRevision] = useState(false)
  const [showRevisionBox, setShowRevisionBox] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  useEffect(() => {
    if (!deliveryId) return
    const unsub = onSnapshot(doc(db, 'deliveries', deliveryId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setDelivery(data)
        if (data.files && data.files.length > 0 && !activePreviewFile) {
          setActivePreviewFile(data.files[0])
        }
      } else {
        setError("This PayDrop delivery vault does not exist or has been deleted.")
      }
      setLoading(false)
    }, (err) => {
      setError(err.message)
      setLoading(false)
    })

    return () => unsub()
  }, [deliveryId])

  const handleCustomPayment = async () => {
    setProcessingPayment(true)
    setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'deliveries', deliveryId), {
          status: 'Paid',
          paidAt: new Date().toISOString(),
          paymentRef: `PAYDROP_CUSTOM_${Math.floor(100000 + Math.random() * 900000)}`
        })
        setProcessingPayment(false)
        setPayModalOpen(false)
        showToast("Payment Successful! All master files unlocked.")
      } catch (err) {
        setProcessingPayment(false)
        alert("Payment process error: " + err.message)
      }
    }, 1200)
  }

  const handleSendRevision = async () => {
    if (!revisionNote.trim()) return
    setSendingRevision(true)
    try {
      const existing = delivery.messages || []
      const updated = [...existing, { sender: 'client', text: revisionNote.trim(), time: new Date().toISOString() }]
      await updateDoc(doc(db, 'deliveries', deliveryId), { messages: updated })
      setRevisionNote('')
      setShowRevisionBox(false)
      setSendingRevision(false)
      showToast("Revision note sent to creator!")
    } catch {
      setSendingRevision(false)
      alert("Failed to send message")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center text-xs text-slate-400 font-mono gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-500/50" />
        <span className="text-blue-400 tracking-widest uppercase animate-pulse">DECRYPTING PROTECTED VAULT...</span>
      </div>
    )
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-[#070A11] text-white flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold">Vault Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error || "Invalid or expired link"}</p>
        </div>
      </div>
    )
  }

  const isPaid = delivery.status === 'Paid'

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 font-sans p-4 sm:p-8 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[160px] rounded-full pointer-events-none" />

      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl bg-slate-900 text-white text-xs font-semibold border border-slate-700 backdrop-blur-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto w-full space-y-6 relative z-10">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
              <Zap className="w-5 h-5 fill-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-black text-sm uppercase text-white tracking-wider">PayDrop</h1>
              <span className="text-[10px] text-slate-400 font-mono">Protected Client Delivery Portal</span>
            </div>
          </div>

          <span className={`px-3.5 py-1 rounded-full text-xs font-bold font-mono border ${
            isPaid ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
          }`}>
            {isPaid ? 'Unlocked & Verified' : 'Locked Preview'}
          </span>
        </div>

        {/* MAIN VAULT CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLS: ASSETS PREVIEW & FILE MANIFEST */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* MEDIA PREVIEW CANVAS */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-3">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Eye className="w-4 h-4 text-blue-400" /> Live Asset Viewer
                </span>
                {!isPaid && (
                  <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/20">
                    Watermark Layer Active
                  </span>
                )}
              </div>

              <div className="relative aspect-video rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center group">
                {activePreviewFile ? (
                  activePreviewFile.type?.startsWith('image/') ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={isPaid ? activePreviewFile.rawUrl : activePreviewFile.previewUrl} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                      />
                      {!isPaid && (
                        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                          <span className="text-white/40 text-xl font-black tracking-widest font-mono uppercase rotate-[-25deg] select-none border-2 border-white/20 px-4 py-2 rounded-xl">
                            {delivery.watermarkText || 'PAYDROP PREVIEW'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : activePreviewFile.type?.startsWith('video/') ? (
                    <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <Video className="w-12 h-12 text-purple-400 animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">{activePreviewFile.name}</p>
                        <p className="text-[10px] text-slate-500">Video preview encoded. Master uncompressed file locks until payment.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center space-y-3">
                      <FileArchive className="w-12 h-12 text-amber-400 mx-auto" />
                      <div>
                        <p className="text-xs font-bold text-white">{activePreviewFile.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{activePreviewFile.size} • Master Package</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-xs text-slate-500 font-mono">Select a file below to preview</div>
                )}
              </div>
            </div>

            {/* ASSET FILE LIST */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono block">
                Vault Manifest ({delivery.files?.length || 0} Files)
              </span>

              <div className="space-y-2">
                {delivery.files?.map((f, i) => (
                  <div 
                    key={i} 
                    onClick={() => setActivePreviewFile(f)}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                      activePreviewFile?.name === f.name ? 'bg-slate-800/80 border-blue-500/50 shadow-lg' : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                        {getFileIcon(f.name, f.type)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{f.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{f.size}</div>
                      </div>
                    </div>

                    {isPaid ? (
                      <a
                        href={f.rawUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-500/20">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COL: PAYMENT SETTLEMENT & CREATOR NOTES */}
          <div className="space-y-5">
            
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Project Handover</span>
                <h2 className="text-lg font-black text-white mt-0.5">{delivery.title}</h2>
                <p className="text-xs text-slate-400 mt-1">Client: <strong className="text-slate-200">{delivery.clientName}</strong></p>
              </div>

              {delivery.clientMessage && (
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed italic">
                  "{delivery.clientMessage}"
                </div>
              )}

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Settlement Required</span>
                <div className="text-2xl font-black text-emerald-400 font-mono">{formatINR(delivery.grossAmount)}</div>
              </div>

              {!isPaid ? (
                <button
                  onClick={() => setPayModalOpen(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-blue-600/30 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Pay & Unlock Master Files</span>
                </button>
              ) : (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-white">Vault Fully Unlocked</p>
                  <p className="text-[10px] text-slate-400">Master raw downloads are active above.</p>
                </div>
              )}

              <div className="border-t border-slate-800 pt-3">
                <button
                  onClick={() => setShowRevisionBox(!showRevisionBox)}
                  className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Request Revision Note</span>
                </button>

                {showRevisionBox && (
                  <div className="space-y-2 pt-3 animate-in fade-in duration-200">
                    <textarea
                      rows={3}
                      placeholder="Type feedback or adjustment note for the creator..."
                      value={revisionNote}
                      onChange={e => setRevisionNote(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleSendRevision}
                      disabled={sendingRevision || !revisionNote.trim()}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      {sendingRevision ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Send Note</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* DUMMY PAYMENT MODAL */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <button onClick={() => setPayModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-white tracking-wider">PayDrop Gateway</h3>
                <span className="text-[10px] text-slate-400">Secure Direct Settlement</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
              <div className="text-xs font-bold text-white truncate">{delivery.title}</div>
              <div className="text-2xl font-black font-mono text-emerald-400">{formatINR(delivery.grossAmount)}</div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Payment Method</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <button
                  onClick={() => setSelectedPayMethod('upi')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    selectedPayMethod === 'upi' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-[10px]">UPI / QR</span>
                </button>

                <button
                  onClick={() => setSelectedPayMethod('card')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    selectedPayMethod === 'card' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[10px]">Cards</span>
                </button>

                <button
                  onClick={() => setSelectedPayMethod('netbank')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    selectedPayMethod === 'netbank' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="text-[10px]">Banking</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleCustomPayment}
              disabled={processingPayment}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              {processingPayment ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm Unlock</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <footer className="text-center text-[10px] text-slate-600 font-mono py-6 relative z-10">
        ENCRYPTED BY PAYDROP CREATIVE VAULT • ALL RIGHTS RESERVED
      </footer>
    </div>
  )
}
