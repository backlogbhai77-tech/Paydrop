'use client'

import React, { useState, useEffect, useRef } from 'react'
import { db } from '../../../lib/firebase'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { useParams } from 'next/navigation'
import { 
  Lock, ShieldCheck, Download, Film, Image as ImageIcon, 
  Send, CheckCircle2, AlertCircle, RefreshCw, FileArchive, Printer, Check
} from 'lucide-react'

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount)
  if (isNaN(num)) return currency === 'USD' ? '$0' : '₹0'
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(num)
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
}

export default function ClientDeliveryPortal() {
  const params = useParams()
  const deliveryId = params?.id

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Security States
  const [isTabBlurred, setIsTabBlurred] = useState(false)
  const [activeTab, setActiveTab] = useState('preview')
  const [messageText, setMessageText] = useState('')
  const [paymentProcessing, setPaymentProcessing] = useState(false)

  const chatBottomRef = useRef(null)

  useEffect(() => {
    if (!deliveryId) return

    const unsub = onSnapshot(doc(db, 'deliveries', deliveryId), (docSnap) => {
      if (docSnap.exists()) {
        setDelivery({ id: docSnap.id, ...docSnap.data() })
        setError(null)
      } else {
        setError('Escrow delivery portal not found or expired.')
      }
      setLoading(false)
    }, () => {
      setError('Failed to load escrow delivery details.')
      setLoading(false)
    })

    return () => unsub()
  }, [deliveryId])

  useEffect(() => {
    const handleBlur = () => setIsTabBlurred(true)
    const handleFocus = () => setIsTabBlurred(false)

    const handleContextMenu = (e) => e.preventDefault()
    const handleKeyDown = (e) => {
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
        (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83))
      ) {
        e.preventDefault()
      }
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'revisions') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeTab, delivery?.messages])

  const handleSendMessage = async () => {
    if (!messageText.trim() || !deliveryId) return
    try {
      const existing = delivery.messages || []
      const updated = [...existing, { sender: 'client', text: messageText.trim(), time: new Date().toISOString() }]
      await updateDoc(doc(db, 'deliveries', deliveryId), { messages: updated })
      setMessageText('')
    } catch {
      alert('Failed to send message.')
    }
  }

  const handleFundEscrow = async () => {
    setPaymentProcessing(true)
    try {
      setTimeout(async () => {
        await updateDoc(doc(db, 'deliveries', deliveryId), {
          status: 'Paid',
          paidAt: new Date().toISOString()
        })
        setPaymentProcessing(false)
      }, 1500)
    } catch {
      alert('Payment failed. Please try again.')
      setPaymentProcessing(false)
    }
  }

  const handlePrintInvoice = () => {
    window.print()
  }

  const isPaid = delivery?.status === 'Paid'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F5EE] flex flex-col items-center justify-center text-xs text-[#063D2A] gap-3 font-mono">
        <div className="w-6 h-6 border-2 border-[#063D2A] border-t-transparent rounded-full animate-spin" />
        <span>SECURING ESCROW PORTAL SESSION...</span>
      </div>
    )
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-[#F0F5EE] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{error || 'Vault Unavailable'}</h2>
        <p className="text-xs text-slate-500 max-w-sm">Please check the escrow URL or contact the creator.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F5EE] text-slate-900 font-sans antialiased selection:bg-[#94EC36] selection:text-[#063D2A] relative overflow-x-hidden">
      
      {/* TAB BLUR OVERLAY */}
      {isTabBlurred && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-2xl flex flex-col items-center justify-center text-white p-6 text-center space-y-3 print:hidden">
          <Lock className="w-10 h-10 text-[#94EC36] animate-bounce" />
          <h3 className="text-lg font-bold">Preview Session Suspended</h3>
          <p className="text-xs text-slate-300 max-w-sm">Switch back to this window to resume viewing your protected deliverables.</p>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-6 sm:px-12 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#94EC36] text-[#063D2A] font-black text-lg flex items-center justify-center shadow-xs">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">PayDrop Client Portal</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-mono font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> SSL Encrypted
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Prepared for {delivery.clientName || delivery.clientEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPaid && (
            <button
              onClick={handlePrintInvoice}
              className="px-3 py-1.5 bg-[#063D2A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-[#094E36] transition"
            >
              <Printer className="w-3.5 h-3.5 text-[#94EC36]" />
              <span>Tax Invoice</span>
            </button>
          )}

          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
            isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
            {isPaid ? 'Escrow Released' : 'Awaiting Escrow Deposit'}
          </span>
        </div>
      </header>

      {/* PRINTABLE OFFICIAL TAX INVOICE FORMAT (PRINT-ONLY VIEW) */}
      <div className="hidden print:block p-10 bg-white text-slate-900 space-y-6">
        <div className="flex justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-black text-[#063D2A]">PAYDROP STUDIO</h1>
            <p className="text-xs text-slate-500">Official Escrow Receipt & Tax Invoice</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Invoice ID: #{delivery.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-slate-500">Date: {new Date(delivery.paidAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-bold text-slate-400 uppercase">Creator</p>
            <p className="font-extrabold">{delivery.userEmail}</p>
          </div>
          <div>
            <p className="font-bold text-slate-400 uppercase">Client</p>
            <p className="font-extrabold">{delivery.clientName} ({delivery.clientEmail})</p>
          </div>
        </div>

        <table className="w-full text-xs border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-50 text-left border-b border-slate-200">
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="p-3 font-bold">{delivery.title}</td>
              <td className="p-3 text-right font-mono">{formatCurrency(delivery.grossAmount, delivery.currency)}</td>
            </tr>
            <tr>
              <td className="p-3 text-slate-500">Escrow Security Fee (Included)</td>
              <td className="p-3 text-right font-mono text-slate-500">{formatCurrency(delivery.platformFee, delivery.currency)}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-right border-t pt-4">
          <p className="text-sm font-black">Total Paid: {formatCurrency(delivery.grossAmount, delivery.currency)}</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">Status: Paid & Verified in Escrow Vault</p>
        </div>
      </div>

      {/* PORTAL MAIN BODY */}
      <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6 print:hidden">

        {/* HERO BANNER */}
        <div className="bg-[#063D2A] rounded-[36px] p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-2 max-w-xl z-10">
            <span className="text-[10px] text-emerald-200/80 uppercase tracking-widest font-mono">DELIVERABLE VAULT</span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{delivery.title}</h1>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              {delivery.clientMessage || 'Review deliverables below. Download access unlocks instantly upon escrow release.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-[28px] border border-white/15 min-w-[240px] text-right space-y-1 z-10">
            <div className="text-xs text-emerald-200">Total Escrow Amount</div>
            <div className="text-3xl font-black font-mono text-[#94EC36]">{formatCurrency(delivery.grossAmount, delivery.currency)}</div>
            <div className="text-[10px] text-emerald-200/60">Includes platform protection</div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex bg-white/80 p-1.5 rounded-2xl border border-slate-200/80 max-w-md">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'preview' ? 'bg-[#063D2A] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Deliverables Preview
          </button>
          <button
            onClick={() => setActiveTab('revisions')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition relative ${
              activeTab === 'revisions' ? 'bg-[#063D2A] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Revisions & Chat
            {(delivery.messages || []).length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-[#94EC36] text-[#063D2A] text-[9px] font-mono rounded-full font-bold">
                {delivery.messages.length}
              </span>
            )}
          </button>
        </div>

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900">Protected Package Content</h3>
                  <span className="text-xs text-slate-400 font-mono">{(delivery.files || []).length} File(s)</span>
                </div>

                <div className="space-y-3">
                  {(delivery.files || []).map((file, idx) => (
                    <div key={idx} className="p-4 bg-[#F0F5EE] rounded-2xl border border-slate-200/80 space-y-3 relative overflow-hidden">
                      
                      {/* DYNAMIC WATERMARK */}
                      {!isPaid && (
                        <div className="absolute inset-0 pointer-events-none select-none z-10 flex items-center justify-center opacity-15 overflow-hidden">
                          <p className="text-xs font-mono font-bold text-slate-900 rotate-[-15deg] whitespace-nowrap">
                            {delivery.clientEmail} • PAYDROP PROTECTED PREVIEW
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs relative z-20">
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          {file.type?.startsWith('video/') ? <Film className="w-5 h-5 text-blue-600 shrink-0" /> : 
                           file.type?.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-emerald-600 shrink-0" /> : 
                           <FileArchive className="w-5 h-5 text-purple-600 shrink-0" />}
                          <div className="truncate">
                            <div className="font-bold text-slate-900 truncate">{file.name}</div>
                            <div className="text-[10px] text-slate-400">{file.size || 'Master File'}</div>
                          </div>
                        </div>

                        {isPaid ? (
                          <a
                            href={file.rawUrl || file.previewUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-[#063D2A] hover:bg-[#094E36] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                          >
                            <Download className="w-3.5 h-3.5 text-[#94EC36]" />
                            <span>Download</span>
                          </a>
                        ) : (
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 font-mono font-bold text-[10px] rounded-lg flex items-center gap-1 shrink-0">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>

                      {!isPaid && file.type?.startsWith('video/') && (
                        <div className="rounded-xl overflow-hidden bg-black/90 aspect-video relative flex items-center justify-center z-20">
                          <video 
                            src={file.previewUrl || file.rawUrl} 
                            controls 
                            controlsList="nodownload" 
                            onContextMenu={e => e.preventDefault()}
                            className="w-full h-full object-contain" 
                          />
                        </div>
                      )}

                      {!isPaid && file.type?.startsWith('image/') && (
                        <div className="rounded-xl overflow-hidden bg-slate-900 max-h-64 flex items-center justify-center p-2 relative z-20">
                          <img 
                            src={file.previewUrl || file.rawUrl} 
                            alt="Protected Preview" 
                            className="max-h-60 object-contain rounded-lg pointer-events-none select-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* UNLOCK CARD */}
            <div className="space-y-4">
              <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-6 shadow-xl space-y-5 sticky top-24">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900">Escrow Action</h3>
                  <p className="text-xs text-slate-500">Fund escrow to unlock original high-res deliverables.</p>
                </div>

                <div className="p-4 bg-[#F0F5EE] rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Project Total:</span>
                    <span>{formatCurrency(delivery.grossAmount, delivery.currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Status:</span>
                    <span className="font-bold text-slate-700">{isPaid ? 'Released' : 'Locked in Escrow'}</span>
                  </div>
                </div>

                {isPaid ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs space-y-3 text-center font-semibold">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <p>Escrow released! All master files are now unlocked for download.</p>
                    <button
                      onClick={handlePrintInvoice}
                      className="w-full py-2 bg-[#063D2A] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#94EC36]" />
                      <span>Download Tax Receipt</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleFundEscrow}
                    disabled={paymentProcessing}
                    className="w-full py-4 bg-[#063D2A] hover:bg-[#094E36] text-white font-extrabold text-xs rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    {paymentProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#94EC36]" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-[#94EC36]" />
                        <span>Fund Escrow & Unlock Files</span>
                      </>
                    )}
                  </button>
                )}

                <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#063D2A] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#063D2A] leading-relaxed">
                    Funds remain securely in escrow until you approve the final delivery.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'revisions' && (
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[36px] p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Studio Collaboration Thread</h3>
                <p className="text-xs text-slate-400">Request revisions or give feedback directly to the creator.</p>
              </div>
            </div>

            <div className="h-96 overflow-y-auto bg-[#F0F5EE] p-5 rounded-2xl space-y-3">
              {(delivery.messages || []).length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No revision notes yet. Type a message below if you need changes before releasing payment.
                </div>
              ) : (
                delivery.messages.map((m, idx) => {
                  const isClient = m.sender === 'client'
                  return (
                    <div key={idx} className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3.5 text-xs rounded-2xl max-w-md ${
                        isClient ? 'bg-[#063D2A] text-white rounded-br-xs shadow-md' : 'bg-white text-slate-800 shadow-xs rounded-bl-xs'
                      }`}>
                        <p className="leading-relaxed">{m.text}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Request a revision or send message..."
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-[#F0F5EE] px-4 py-3 rounded-2xl text-xs focus:outline-none focus:border-[#94EC36] transition"
              />
              <button 
                onClick={handleSendMessage}
                className="px-6 py-3 bg-[#063D2A] hover:bg-[#094E36] text-white text-xs font-bold rounded-2xl transition active:scale-95 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-[#94EC36]" />
                <span>Send</span>
              </button>
            </div>
          </div>
        )}

      </main>

    </div>
  )
}
