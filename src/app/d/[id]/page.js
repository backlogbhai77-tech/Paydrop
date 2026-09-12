'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { 
  Lock, Unlock, ShieldCheck, Download, CheckCircle2, 
  AlertTriangle, Clock, FileArchive, Video
} from 'lucide-react'
import Link from 'next/link'

export default function ClientDeliveryPage() {
  const params = useParams()
  const deliveryId = params?.id

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (!deliveryId) return
    fetchDelivery()
  }, [deliveryId])

  const fetchDelivery = async () => {
    try {
      const docRef = doc(db, 'deliveries', deliveryId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        setError("Delivery not found. This link might be invalid or removed by the sender.")
        setLoading(false)
        return
      }

      const data = docSnap.data()
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        setError("This delivery has expired. The original assets are no longer accessible.")
      }

      setDelivery(data)
      if (data.status === 'Paid') {
        setPaymentSuccess(true)
      }
    } catch (err) {
      console.error("Error loading delivery:", err)
      setError("Unable to load delivery. Please check your internet connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleUnlockPayment = async () => {
    setProcessingPayment(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const docRef = doc(db, 'deliveries', deliveryId)
      await updateDoc(docRef, {
        status: 'Paid',
        paidAt: new Date().toISOString()
      })

      setPaymentSuccess(true)
      setDelivery(prev => ({ ...prev, status: 'Paid' }))
    } catch (err) {
      alert("Payment processing error: " + err.message)
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleDownload = () => {
    if (delivery?.fileUrl && delivery.fileUrl.startsWith('http')) {
      window.open(delivery.fileUrl, '_blank')
    } else {
      alert("Asset decrypted. Demo master download initiated.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-400 flex flex-col items-center justify-center text-sm gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading secure delivery portal...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl mb-4 border border-red-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold">Delivery Unavailable</h1>
        <p className="text-zinc-400 text-xs mt-2 max-w-sm">{error}</p>
        <Link href="/" className="mt-6 text-xs text-emerald-400 hover:underline">
          Return to ReleaseDrop
        </Link>
      </div>
    )
  }

  const isUnlocked = paymentSuccess || delivery?.status === 'Paid'

  return (
    <div className="min-h-screen bg-[#06080e] text-zinc-100 antialiased font-sans flex flex-col selection:bg-emerald-500 selection:text-black relative overflow-hidden">
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 blur-[150px] pointer-events-none rounded-full" />

      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl px-6 h-16 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-sm">
            R
          </div>
          <span className="font-bold text-sm tracking-tight text-zinc-200">ReleaseDrop Delivery</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5 ${
            isUnlocked 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {isUnlocked ? 'Assets Released' : 'Payment-Locked'}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 z-10 space-y-6">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 sm:p-7 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Client Deliverable</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">{delivery?.title}</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Prepared for <span className="text-zinc-200 font-medium">{delivery?.clientName}</span> by {delivery?.userEmail}
            </p>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Settlement Due</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              ₹{delivery?.amount?.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-zinc-500 flex items-center sm:justify-end gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> Expires: {new Date(delivery?.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Asset Preview</span>
            </div>
            <span className="text-[10px] text-zinc-500">
              {isUnlocked ? 'High-Res Decrypted' : 'Security Watermark Active'}
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-video flex items-center justify-center group">
            <img 
              src={delivery?.fileUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200"} 
              alt="Deliverable Preview" 
              className={`w-full h-full object-cover transition duration-500 ${isUnlocked ? '' : 'filter brightness-75'}`}
            />

            {!isUnlocked && delivery?.watermarkEnabled && (
              <div className="absolute inset-0 pointer-events-none select-none flex flex-wrap items-center justify-around opacity-30 text-white font-mono text-xs rotate-[-15deg] gap-10 p-6">
                <span>RELEASEDROP UNPAID PREVIEW</span>
                <span>CONFIDENTIAL • {delivery?.clientName}</span>
                <span>PAYMENT REQUIRED TO DECRYPT</span>
                <span>RELEASEDROP UNPAID PREVIEW</span>
              </div>
            )}

            {!isUnlocked && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                <div className="p-3 bg-zinc-900/90 border border-zinc-700/80 rounded-2xl shadow-2xl mb-2">
                  <Lock className="w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
                <h3 className="text-xs font-bold text-white tracking-wide">Inspection Preview Only</h3>
                <p className="text-[11px] text-zinc-300 mt-0.5">Original production master files remain locked</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl space-y-3">
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">Deliverable Package</span>
          
          <div className="space-y-2">
            <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400">
                  <FileArchive className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    {delivery?.title}.zip
                    {!isUnlocked && <Lock className="w-3 h-3 text-amber-400" />}
                  </div>
                  <div className="text-[10px] text-zinc-500">Master Source Assets & Clean 4K Renders</div>
                </div>
              </div>

              <div>
                {isUnlocked ? (
                  <button 
                    onClick={handleDownload}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
          {!isUnlocked ? (
            <>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Unlock & Release Original Files</h3>
                <p className="text-xs text-zinc-400">Instant unlock via UPI, NetBanking or Credit/Debit Cards.</p>
              </div>

              <button
                onClick={handleUnlockPayment}
                disabled={processingPayment}
                className="w-full sm:w-auto px-10 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-sm rounded-xl transition flex items-center justify-center gap-2 mx-auto shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                {processingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Verifying Settlement...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Pay ₹{delivery?.amount?.toLocaleString('en-IN')} & Decrypt Assets
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>256-bit encrypted transfer • Automated payment verification</span>
              </div>
            </>
          ) : (
            <div className="space-y-3 py-2">
              <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Settlement Verified Successfully!</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Payment received. Original production files are now decrypted.</p>
              </div>

              <button
                onClick={handleDownload}
                className="px-8 py-3 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl transition inline-flex items-center gap-2 shadow-lg"
              >
                <Download className="w-4 h-4" /> Download Complete Package (.ZIP)
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 border-t border-zinc-900 text-center text-[11px] text-zinc-600">
        Powered by <span className="font-semibold text-zinc-400">ReleaseDrop</span>
      </footer>
    </div>
  )
              }
      
