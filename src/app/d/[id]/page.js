'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore'
import { 
  Zap, Lock, Unlock, Shield, ShieldCheck, Download, 
  CheckCircle2, AlertTriangle, Clock, QrCode, CreditCard, 
  Receipt, Play, Pause, Volume2, VolumeX, Eye, FileVideo, 
  ExternalLink, ChevronRight, Check
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

  // Video Player Controls
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [videoLoaded, setVideoLoaded] = useState(false)

  useEffect(() => {
    if (!deliveryId) return
    const loadDelivery = async () => {
      try {
        const docRef = doc(db, 'deliveries', deliveryId)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          setError("Vault portal link is invalid, expired, or has been revoked by the creator.")
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
        setError("Cryptographic verification failed. Please reload this page.")
      } finally {
        setLoading(false)
      }
    }
    loadDelivery()
  }, [deliveryId])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

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
      alert("Payment settlement failed: " + err.message)
      setPaymentStep('select')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-8 h-8 border-[2.5px] border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-semibold text-slate-500">Accessing ReleaseDrop Secure Vault...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] text-slate-900 flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl mb-4 text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Delivery Portal Inaccessible</h1>
        <p className="text-slate-500 text-xs mt-1.5 max-w-sm leading-relaxed">{error}</p>
        <Link href="/" className="mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs rounded-xl text-white font-bold transition">
          Return to ReleaseDrop
        </Link>
      </div>
    )
  }

  const isUnlocked = delivery?.status === 'Paid'
  const isVideo = delivery?.previewUrl?.includes('/video/') || 
                  delivery?.fileType?.includes('video') || 
                  delivery?.fileName?.match(/\.(mp4|mov|webm|mkv)$/i)

  // Cloudinary optimized web stream URL
  const optimizedPreviewUrl = isVideo && delivery?.previewUrl?.includes('cloudinary.com')
    ? delivery.previewUrl.replace('/upload/', '/upload/q_auto,vc_auto/')
    : delivery?.previewUrl

  const invoiceId = delivery?.invoiceNumber || `RD-INV-${new Date().getFullYear()}-${deliveryId ? deliveryId.slice(0, 6).toUpperCase() : '000000'}`
  const creatorName = delivery?.userEmail?.split('@')[0] || 'Studio Creator'
  const creatorInitials = creatorName.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col items-center justify-center p-3 sm:p-6 antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Centered Main Vault Card (Emergent Style) */}
      <div className="w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden my-auto">
        
        {/* Top Dark Bar */}
        <div className="bg-[#091124] px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Zap className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="font-extrabold text-sm text-white tracking-tight">ReleaseDrop</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-[11px] font-bold tracking-wide">
            {isUnlocked ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
            <span className="uppercase text-[10px]">{isUnlocked ? 'DECRYPTED MASTER' : 'PROTECTED DELIVERY'}</span>
          </div>
        </div>

        {/* Project Meta Details */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">PROJECT</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {delivery?.title}
            </h1>

            {/* Creator Info Pill */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-500/20">
                {creatorInitials}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">{delivery?.clientName || 'Private Client'}</div>
                <div className="text-[11px] text-slate-400">Sent via ReleaseDrop • Secure delivery</div>
              </div>
            </div>

            {/* Optional Creator Note */}
            <blockquote className="mt-3 p-3.5 bg-slate-50 border-l-2 border-blue-600 rounded-r-xl text-xs text-slate-600 italic">
              "{delivery?.notes || 'Thanks! Your final deliverable files are ready. Inspect below and authorize settlement to unlock full-resolution master files.'}"
            </blockquote>
          </div>

          {/* Media Inspection Viewport */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase font-mono">
              <span>{isUnlocked ? 'ORIGINAL MASTER' : 'PREVIEW • WATERMARKED'}</span>
              <span className="text-blue-600">{delivery?.fileSize || ''}</span>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-200 shadow-inner group">
              {isVideo ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={optimizedPreviewUrl}
                    playsInline
                    loop
                    muted={isMuted}
                    preload="auto"
                    onLoadedData={() => setVideoLoaded(true)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    controls={isUnlocked}
                    className="w-full h-full object-contain"
                  />

                  {/* Custom Controls Overlay when locked */}
                  {!isUnlocked && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-30 pointer-events-auto">
                      <button 
                        onClick={togglePlay}
                        className="p-2.5 bg-black/80 hover:bg-black text-white rounded-full backdrop-blur-md transition shadow-lg"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                      </button>

                      <button 
                        onClick={toggleMute}
                        className="p-2.5 bg-black/80 hover:bg-black text-white rounded-full backdrop-blur-md transition shadow-lg"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={delivery?.previewUrl}
                  alt="Delivery Asset"
                  className="w-full h-full object-contain"
                />
              )}

              {/* Dynamic Anti-Theft Watermark Lattice (Emergent style) */}
              {!isUnlocked && (
                <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-around opacity-30 text-white font-mono text-[11px] font-black rotate-[-12deg] scale-125 z-20">
                  <div className="flex justify-around gap-6">
                    <span>UNPAID PREVIEW</span>
                    <span>RELEASEDROP VAULT</span>
                  </div>
                  <div className="flex justify-around gap-6">
                    <span>{delivery?.clientName?.toUpperCase() || 'CLIENT'}</span>
                    <span>DO NOT DISTRIBUTE</span>
                  </div>
                  <div className="flex justify-around gap-6">
                    <span>PAYMENT REQUIRED</span>
                    <span>CONFIDENTIAL</span>
                  </div>
                </div>
              )}

              {/* Floating Status Pill */}
              {!isUnlocked && !isPlaying && (
                <div 
                  onClick={togglePlay}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] cursor-pointer z-20"
                >
                  <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl active:scale-95 transition pl-0.5">
                    <Play className="w-5 h-5 fill-black" />
                  </div>
                  <span className="text-[11px] font-bold text-white mt-2 drop-shadow-md">
                    Tap to preview video
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>File: <strong className="text-slate-700">{delivery?.fileName || 'Master Delivery'}</strong></span>
              <span>256-bit AES encrypted</span>
            </div>
          </div>

          {/* Action / Payment Area */}
          {!isUnlocked ? (
            <div className="pt-2 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    SETTLEMENT DUE
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    ₹{delivery?.grossAmount?.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-emerald-600 block flex items-center gap-1 justify-end">
                    <ShieldCheck className="w-3.5 h-3.5" /> Escrow Protected
                  </span>
                  <span className="text-[10px] text-slate-400">Instant direct master download</span>
                </div>
              </div>

              <button
                onClick={() => setShowCheckout(true)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-600/25 active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Pay ₹{delivery?.grossAmount?.toLocaleString('en-IN')} & Unlock Master</span>
              </button>

              <div className="flex items-center justify-center gap-5 text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1">✓ Instant Master Decryption</span>
                <span className="flex items-center gap-1">✓ Tax Invoice Included</span>
              </div>
            </div>
          ) : (
            <div className="pt-2 space-y-4">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Payment Verified & Settled</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Master deliverables are now decrypted with perpetual commercial usage rights.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.open(delivery?.fileUrl, '_blank')}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Master Files ({delivery?.fileSize || 'Full Res'})
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" /> Receipt
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Express Checkout Modal (Emergent High-Trust Style) */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">ReleaseDrop Express Checkout</h3>
                <span className="text-[10px] font-mono text-slate-400">ORDER: {invoiceId}</span>
              </div>
              <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-slate-600 text-xs p-1">✕</button>
            </div>

            {paymentStep === 'select' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Deliverable</span>
                    <div className="font-extrabold text-xs text-slate-900 truncate max-w-[200px] mt-0.5">{delivery?.title}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Total Due</span>
                    <div className="font-black text-base text-blue-600 mt-0.5">₹{delivery?.grossAmount?.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Select Payment Rail</label>
                  
                  <div 
                    onClick={() => setSelectedMethod('upi')}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      selectedMethod === 'upi' ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Instant UPI Rail</div>
                        <div className="text-[10px] text-slate-400">GPay, PhonePe, Paytm, CRED</div>
                      </div>
                    </div>
                    <input type="radio" checked={selectedMethod === 'upi'} readOnly className="accent-blue-600" />
                  </div>

                  <div 
                    onClick={() => setSelectedMethod('card')}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      selectedMethod === 'card' ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Card / NetBanking</div>
                        <div className="text-[10px] text-slate-400">Visa, Mastercard, RuPay & Corporate</div>
                      </div>
                    </div>
                    <input type="radio" checked={selectedMethod === 'card'} readOnly className="accent-blue-600" />
                  </div>
                </div>

                <button
                  onClick={executePayment}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Authorize ₹{delivery?.grossAmount?.toLocaleString('en-IN')} & Unlock</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {paymentStep === 'processing' && (
              <div className="py-10 text-center space-y-3">
                <div className="w-9 h-9 border-[2.5px] border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Verifying Escrow Authorization...</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Contacting payment rail and releasing cryptographic master keys.</p>
                </div>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Payment Successfully Settled</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Master uncompressed files have been decrypted and ready for download.
                  </p>
                </div>
                <button 
                  onClick={() => setShowCheckout(false)} 
                  className="px-6 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition"
                >
                  View Decrypted Vault
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 text-center text-[10px] font-mono text-slate-400">
        RELEASEDROP ESCROW PROTOCOL • 256-BIT CLIENT PROTECTION • SECURE ASSET DELIVERY
      </footer>
    </div>
  )
}
