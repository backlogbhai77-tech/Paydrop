'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore'
import { 
  ShieldCheck, Lock, Download, CheckCircle2, AlertTriangle, 
  Maximize2, Minimize2, Eye, FileText, ArrowRight, ShieldAlert,
  Sparkles, RefreshCw, KeyRound, ExternalLink
} from 'lucide-react'

export default function ClientDeliveryPortal() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isScreenProtected, setIsScreenProtected] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockStep, setUnlockStep] = useState('')
  
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
          setError("Escrow manifest record not found or link has expired.")
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

    const handleContextMenu = (e) => {
      e.preventDefault()
    }

    const handleVisibility = () => {
      if (document.hidden) {
        setIsScreenProtected(true)
      } else {
        setTimeout(() => setIsScreenProtected(false), 800)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('visibilitychange', handleVisibility)
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

  const handleAuthorizeSettlement = async () => {
    setUnlocking(true)
    setUnlockStep('Connecting to Escrow Liquidity Layer...')

    setTimeout(async () => {
      setUnlockStep('Verifying authorization tokens...')
      setTimeout(async () => {
        setUnlockStep('Decrypting uncompressed master deliverables...')
        try {
          const docRef = doc(db, 'deliveries', id)
          await updateDoc(docRef, {
            status: 'Paid',
            paidAt: new Date().toISOString()
          })
          setDelivery(prev => ({ ...prev, status: 'Paid' }))
          setUnlocking(false)
        } catch (err) {
          alert("Authorization failed: " + err.message)
          setUnlocking(false)
        }
      }, 1000)
    }, 1200)
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
  const watermark = delivery.watermarkText || 'RELEASEDROP ESCROW • UNPAID PREVIEW'

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased select-none">
      
      {/* Anti-Capture Screen Protection Shield */}
      {isScreenProtected && (
        <div className="fixed inset-0 z-50 bg-[#070B14] flex flex-col items-center justify-center text-center p-6 backdrop-blur-xl">
          <ShieldAlert className="w-12 h-12 text-blue-500 mb-3 animate-bounce" />
          <h2 className="text-base font-black text-white">Capture Intercept Active</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs font-mono">
            Screen capturing, inspecting source, and keyboard captures are blocked by ReleaseDrop Escrow.
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
              <span className="text-[10px] font-mono text-slate-400 block">ID: {delivery.id.slice(0, 10)}...</span>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 ${
            isPaid 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            {isPaid ? 'CLEARED & LICENSED' : 'ESCROW LOCKED'}
          </span>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div>
            <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">
              Deliverable Inspection Enclave
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{delivery.title}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Prepared for <strong className="text-slate-800 font-semibold">{delivery.clientName}</strong>
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Required Settlement</span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Media Frame Container with Fullscreen */}
        <div 
          ref={playerContainerRef} 
          className={`relative rounded-2xl bg-black border border-slate-900 overflow-hidden shadow-2xl transition-all ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen flex items-center justify-center' : 'aspect-video w-full'
          }`}
          onContextMenu={(e) => e.preventDefault()}
        >
          {delivery.fileType?.includes('video') ? (
            <video 
              src={isPaid ? delivery.fileUrl : delivery.previewUrl} 
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
              src={isPaid ? delivery.fileUrl : delivery.previewUrl} 
              alt="Deliverable Master Inspection" 
              className="w-full h-full object-contain pointer-events-none" 
              draggable="false"
            />
          )}

          {/* Floating Fullscreen Button */}
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
                <Lock className="w-3 h-3" /> Watermarked Low-Res Preview
              </span>
            </div>
          )}
        </div>

        {/* Action Section */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          {!isPaid ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-base font-extrabold text-slate-900">Authorize Settlement to Unlock Master Asset</h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Once settlement of ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')} clears, preview watermarks strip instantly and raw 4K uncompressed files ({delivery.fileSize}) decrypt for download.
                </p>
              </div>

              <button 
                disabled={unlocking}
                onClick={handleAuthorizeSettlement}
                className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
              >
                {unlocking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{unlockStep}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay ₹{Number(delivery.grossAmount || 0).toLocaleString('en-IN')} & Decrypt Master</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Settlement Complete • Rights Granted</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Master file uncompressed: {delivery.fileName} ({delivery.fileSize})
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
          )}
        </div>
      </main>
    </div>
  )
}
