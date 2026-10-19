'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '../../../lib/firebase'
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore'
import { 
  ShieldCheck, Download, Lock, CheckCircle, MessageSquare, 
  Send, ExternalLink, FileText, Film, Image as ImageIcon 
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
    if (!id) {
      setError("Invalid vault URL.")
      setLoading(false)
      return
    }

    const docRef = doc(db, 'deliveries', id)
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setDelivery({ id: docSnap.id, ...docSnap.data() })
          setError(null)
        } else {
          setError("Escrow vault not found or link has expired.")
        }
        setLoading(false)
      },
      (err) => {
        console.error("Firestore error:", err)
        setError("Failed to load deliverable vault.")
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [id])

  const handleSimulatePayment = async () => {
    if (!id) return
    setPaying(true)
    try {
      const docRef = doc(db, 'deliveries', id)
      await updateDoc(docRef, { status: 'Paid' })
      if (typeof window !== 'undefined' && window.confetti) {
        window.confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
      }
    } catch (e) {
      alert("Payment processing error.")
    } finally {
      setPaying(false)
    }
  }

  const handleSendRevision = async () => {
    if (!clientMessage.trim() || !id) return
    try {
      const docRef = doc(db, 'deliveries', id)
      const newMsg = { sender: 'client', text: clientMessage.trim(), time: new Date().toISOString() }
      await updateDoc(docRef, { messages: arrayUnion(newMsg) })
      setClientMessage('')
    } catch {
      alert("Failed to send revision note.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-xs text-slate-500 font-mono">
        [ LOADING SECURE ESCROW VAULT... ]
      </div>
    )
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-pro p-8 rounded-3xl max-w-md w-full space-y-4">
          <Lock className="w-10 h-10 text-slate-800 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Vault Unavailable</h2>
          <p className="text-xs text-slate-500">{error || "This escrow link is invalid or has expired."}</p>
        </div>
      </div>
    )
  }

  const isPaid = delivery.status === 'Paid'

  return (
    <div className="min-h-screen text-slate-900 font-sans p-4 sm:p-10 flex flex-col items-center antialiased">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* HEADER STATUS */}
        <div className="glass-pro p-6 sm:p-8 rounded-[36px] space-y-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">PayDrop Escrow Vault</span>
            <span className={`px-3 py-1 text-[11px] font-mono font-bold rounded-full ${
              isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {isPaid ? '✓ FUNDS SECURED IN ESCROW' : '⏳ AWAITING PAYMENT'}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{delivery.title}</h1>
            <p className="text-xs text-slate-500 mt-1">Prepared by creator for <span className="font-semibold text-slate-800">{delivery.clientEmail}</span></p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div>
              <div className="text-xs text-slate-500">Total Escrow Amount</div>
              <div className="text-2xl font-black text-slate-900 font-mono-data">{formatCurrency(delivery.grossAmount, delivery.currency)}</div>
            </div>

            {!isPaid && (
              <button
                disabled={paying}
                onClick={handleSimulatePayment}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{paying ? 'Processing...' : 'Fund Escrow & Unlock'}</span>
              </button>
            )}
          </div>
        </div>

        {/* DELIVERABLES */}
        <div className="glass-pro p-6 sm:p-8 rounded-[36px] space-y-4 border border-slate-200">
          <h3 className="font-bold text-sm text-slate-900">Master Deliverables</h3>

          {isPaid ? (
            <div className="space-y-3">
              {(delivery.files || []).map((f, i) => (
                <div key={i} className="p-4 bg-white rounded-2xl flex items-center justify-between gap-4 border border-slate-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{f.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{f.size}</div>
                    </div>
                  </div>

                  <a
                    href={f.rawUrl}
                    target="_blank"
                    download
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download</span>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl text-center space-y-3 border border-dashed border-slate-300">
              <Lock className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-900">Files are locked in escrow</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">Complete the escrow payment above to instantly unlock and download all master source files.</p>
            </div>
          )}
        </div>

        {/* REVISION CHAT */}
        <div className="glass-pro p-6 sm:p-8 rounded-[36px] space-y-4 border border-slate-200">
          <h3 className="font-bold text-sm text-slate-900">Revision Notes & Chat</h3>
          
          <div className="space-y-3 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-2xl">
            {(delivery.messages || []).length === 0 ? (
              <div className="text-center text-xs text-slate-400 font-mono py-4">No revision notes yet.</div>
            ) : (
              (delivery.messages || []).map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.sender === 'client' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 text-xs rounded-xl max-w-md ${
                    m.sender === 'client' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border border-slate-200'
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
              className="flex-1 px-4 py-3 bg-white rounded-2xl text-xs border border-slate-200 focus:outline-none focus:border-slate-900"
            />
            <button
              onClick={handleSendRevision}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Send</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
