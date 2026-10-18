'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { 
  ShieldCheck, Download, Lock, CheckCircle, MessageSquare, 
  Send, ExternalLink, FileText, Film, Image as ImageIcon, Check 
} from 'lucide-react'

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount)
  if (isNaN(num)) return currency === 'USD' ? '$0' : '₹0'
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
}

export default function ClientDeliveryPortal() {
  const params = useParams()
  const id = params?.id

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [clientMessage, setClientMessage] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchDelivery = async () => {
      try {
        const docRef = doc(db, 'deliveries', id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setDelivery({ id: docSnap.id, ...docSnap.data() })
        } else {
          setError("Escrow vault not found or link expired.")
        }
      } catch (err) {
        setError("Failed to load deliverable vault.")
      } finally {
        setLoading(false)
      }
    }
    fetchDelivery()
  }, [id])

  const handleSimulatePayment = async () => {
    setPaying(true)
    try {
      const docRef = doc(db, 'deliveries', id)
      await updateDoc(docRef, { status: 'Paid' })
      setDelivery(prev => ({ ...prev, status: 'Paid' }))
      
      // Trigger confetti celebration if available
      if (window.confetti) {
        window.confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
      }
    } catch {
      alert("Payment simulation error.")
    } finally {
      setPaying(false)
    }
  }

  const handleSendRevision = async () => {
    if (!clientMessage.trim()) return
    try {
      const docRef = doc(db, 'deliveries', id)
      const newMsg = { sender: 'client', text: clientMessage.trim(), time: new Date().toISOString() }
      await updateDoc(docRef, { messages: arrayUnion(newMsg) })
      setDelivery(prev => ({ ...prev, messages: [...(prev.messages || []), newMsg] }))
      setClientMessage('')
    } catch {
      alert("Failed to send revision note.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECFDF5] flex items-center justify-center text-xs text-emerald-800 font-mono">
        [ LOADING SECURE ESCROW VAULT... ]
      </div>
    )
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-[#ECFDF5] flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-mint p-8 rounded-3xl max-w-md w-full space-y-4">
          <Lock className="w-10 h-10 text-emerald-800 mx-auto" />
          <h2 className="text-lg font-bold text-emerald-950">Vault Unavailable</h2>
          <p className="text-xs text-emerald-700">{error || "This escrow link is invalid or has expired."}</p>
        </div>
      </div>
    )
  }

  const isPaid = delivery.status === 'Paid'

  return (
    <div className="min-h-screen text-slate-900 font-sans p-4 sm:p-10 flex flex-col items-center antialiased selection:bg-lime-300">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* HEADER STATUS */}
        <div className="glass-mint p-6 sm:p-8 rounded-[36px] space-y-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">PayDrop Escrow Vault</span>
            <span className={`px-3 py-1 text-[11px] font-mono font-bold rounded-full ${
              isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {isPaid ? '✓ FUNDS SECURED IN ESCROW' : '⏳ AWAITING PAYMENT'}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-emerald-950 tracking-tight">{delivery.title}</h1>
            <p className="text-xs text-emerald-700 mt-1">Prepared by creator for <span className="font-semibold text-emerald-900">{delivery.clientEmail}</span></p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-emerald-200/60">
            <div>
              <div className="text-xs text-emerald-700">Total Escrow Amount</div>
              <div className="text-2xl font-black text-emerald-950 font-mono-data">{formatCurrency(delivery.grossAmount, delivery.currency)}</div>
            </div>

            {!isPaid && (
              <button
                disabled={paying}
                onClick={handleSimulatePayment}
                className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-lime-400" />
                <span>{paying ? 'Processing...' : 'Fund Escrow & Unlock'}</span>
              </button>
            )}
          </div>
        </div>

        {/* DELIVERABLES SECTION */}
        <div className="glass-mint p-6 sm:p-8 rounded-[36px] space-y-4 border border-emerald-200">
          <h3 className="font-bold text-sm text-emerald-950">Master Deliverables</h3>

          {isPaid ? (
            <div className="space-y-3">
              {(delivery.files || []).map((f, i) => (
                <div key={i} className="p-4 bg-white/90 rounded-2xl flex items-center justify-between gap-4 border border-emerald-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-lime-200 text-emerald-900 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-emerald-950 truncate">{f.name}</div>
                      <div className="text-[10px] text-emerald-700 font-mono">{f.size}</div>
                    </div>
                  </div>

                  <a
                    href={f.rawUrl}
                    target="_blank"
                    download
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-lime-400" />
                    <span>Download</span>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-white/60 rounded-2xl text-center space-y-3 border border-dashed border-emerald-300">
              <Lock className="w-8 h-8 text-emerald-700 mx-auto" />
              <div className="text-xs font-bold text-emerald-950">Files are locked in escrow</div>
              <p className="text-[11px] text-emerald-700 max-w-sm mx-auto">Complete the escrow payment above to instantly unlock and download all master source files.</p>
            </div>
          )}
        </div>

        {/* REVISION CHAT THREAD */}
        <div className="glass-mint p-6 sm:p-8 rounded-[36px] space-y-4 border border-emerald-200">
          <h3 className="font-bold text-sm text-emerald-950">Revision Notes & Chat</h3>
          
          <div className="space-y-3 max-h-60 overflow-y-auto p-3 bg-white/50 rounded-2xl">
            {(delivery.messages || []).length === 0 ? (
              <div className="text-center text-xs text-emerald-700 font-mono py-4">No revision notes yet.</div>
            ) : (
              (delivery.messages || []).map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.sender === 'client' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 text-xs rounded-xl max-w-md ${
                    m.sender === 'client' ? 'bg-emerald-800 text-white' : 'bg-white text-emerald-950 border border-emerald-200'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type feedback or revision note..."
              value={clientMessage}
              onChange={e => setClientMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendRevision()}
              className="flex-1 px-4 py-3 bg-white/90 rounded-2xl text-xs border border-emerald-200 focus:outline-none focus:border-lime-500"
            />
            <button
              onClick={handleSendRevision}
              className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-2xl transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-lime-400" />
              <span>Send</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
