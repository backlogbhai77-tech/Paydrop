'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { calculateFinancials } from '../../lib/saas'
import { 
  ShieldCheck, Lock, Unlock, Plus, Copy, ExternalLink, 
  Clock, CheckCircle2, LogOut, Eye, Trash2, ArrowUpRight, 
  Coins, Layers, Sparkles, Building2, User
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // Form Fields
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [upiId, setUpiId] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [expiryDays, setExpiryDays] = useState('7')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) {
        fetchDeliveries(currentUser.uid)
      }
    })
    return () => unsubscribe()
  }, [])

  const fetchDeliveries = async (uid) => {
    try {
      const q = query(collection(db, 'deliveries'), where('userId', '==', uid))
      const snapshot = await getDocs(q)
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setDeliveries(docs)
    } catch (err) {
      console.error("Error fetching deliveries:", err)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, googleProvider)
      } else {
        alert("Login failed: " + err.message)
      }
    }
  }

  const handleCreateDelivery = async (e) => {
    e.preventDefault()
    if (!title || !amount || !fileUrl || !user) {
      alert("Deliverable title, amount, and deliverable link are required.")
      return
    }

    setCreating(true)
    try {
      const financials = calculateFinancials(amount, 'starter')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays))

      await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title,
        clientName: clientName || 'Private Client',
        clientEmail: clientEmail || '',
        grossAmount: financials.grossAmount,
        platformFee: financials.platformFee,
        creatorPayout: financials.creatorPayout,
        upiId: upiId.trim() || 'default@upi',
        status: 'Awaiting Payment',
        watermarkEnabled: true,
        previewUrl: previewUrl.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200',
        fileUrl: fileUrl.trim(),
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        createdAt: serverTimestamp()
      })

      setShowModal(false)
      setTitle('')
      setClientName('')
      setClientEmail('')
      setAmount('')
      setUpiId('')
      setFileUrl('')
      setPreviewUrl('')
      fetchDeliveries(user.uid)
    } catch (err) {
      alert("Failed to lock delivery: " + err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Revoke this delivery portal? The client link will immediately stop working.")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      setDeliveries(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      alert("Failed to delete: " + err.message)
    }
  }

  const copyLink = (id) => {
    const url = `${window.location.origin}/d/${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  // Financial calculations
  const totalSettled = deliveries
    .filter(d => d.status === 'Paid')
    .reduce((acc, curr) => acc + (curr.creatorPayout || curr.grossAmount || 0), 0)

  const pendingEscrow = deliveries
    .filter(d => d.status === 'Awaiting Payment')
    .reduce((acc, curr) => acc + (curr.creatorPayout || curr.grossAmount || 0), 0)

  const platformFeesDeducted = deliveries
    .filter(d => d.status === 'Paid')
    .reduce((acc, curr) => acc + (curr.platformFee || 0), 0)

  const estimatedFinancials = calculateFinancials(amount || 0, 'starter')

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-400 flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono uppercase tracking-widest text-[11px]">Loading ReleaseDrop Engine...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center font-black text-black text-2xl mb-5 shadow-2xl shadow-emerald-500/20">
          R
        </div>
        <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-emerald-400 rounded-full mb-3">
          Agency & Creator Protocol
        </span>
        <h1 className="text-3xl font-black tracking-tight">ReleaseDrop Workspace</h1>
        <p className="text-zinc-400 text-xs mt-2 max-w-sm leading-relaxed">
          Lock high-resolution production assets behind automated payment escrows. Eliminate revision theft and ghosting.
        </p>
        <button
          onClick={handleGoogleLogin}
          className="mt-6 px-6 py-3.5 bg-white hover:bg-zinc-100 text-black font-black text-xs rounded-xl transition shadow-xl active:scale-95 flex items-center gap-2"
        >
          Sign in to Creator Console
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06080e] text-zinc-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* SaaS App Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-sm shadow-md shadow-emerald-500/20">
                R
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm tracking-tight leading-none text-white">ReleaseDrop</span>
                <span className="text-[9px] font-mono text-zinc-500 tracking-wider">ENTERPRISE CORE</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-zinc-900">
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                Plan: Starter (5% Take Rate)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95"
            >
              <Plus className="w-4 h-4" /> New Delivery Vault
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-zinc-900">
              <span className="text-xs text-zinc-400 font-medium hidden sm:inline">{user.displayName || user.email}</span>
              <button 
                onClick={() => signOut(auth)}
                className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-red-400 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main SaaS Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* KPI & Revenue Matrix */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[11px] font-mono uppercase tracking-wider">Settled Net Earnings</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white mt-2">₹{totalSettled.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-medium">100% Payout Verified</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[11px] font-mono uppercase tracking-wider">Locked in Escrow</span>
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-2">₹{pendingEscrow.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Awaiting client authorization
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[11px] font-mono uppercase tracking-wider">Platform Take Deducted</span>
              <Layers className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-black text-zinc-300 mt-2">₹{platformFeesDeducted.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Includes auto-invoicing & DRM
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[11px] font-mono uppercase tracking-wider">Active Vaults</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white mt-2">{deliveries.length}</div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {deliveries.filter(d => d.status === 'Paid').length} Completed • {deliveries.filter(d => d.status === 'Awaiting Payment').length} Pending
            </div>
          </div>
        </section>

        {/* Deliveries Data Table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Active Delivery Portals</h2>
              <p className="text-xs text-zinc-500">Client-facing portals with automated escrow protection.</p>
            </div>
          </div>

          {deliveries.length === 0 ? (
            <div className="p-16 rounded-2xl border border-dashed border-zinc-800/80 text-center bg-zinc-950/20">
              <Lock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-200">No active delivery vaults</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Generate your first payment-locked delivery. Paste your deliverable URL, set the price, and share the secure link.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl transition"
              >
                + Create Protected Delivery
              </button>
            </div>
          ) : (
            <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-950/50 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/60 border-b border-zinc-800/80 text-zinc-400 font-mono text-[11px] uppercase">
                    <tr>
                      <th className="px-5 py-3.5 font-medium">Deliverable</th>
                      <th className="px-5 py-3.5 font-medium">Client</th>
                      <th className="px-5 py-3.5 font-medium">Settlement Split</th>
                      <th className="px-5 py-3.5 font-medium">Telemetry</th>
                      <th className="px-5 py-3.5 font-medium">Status</th>
                      <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {deliveries.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-900/30 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-zinc-100">{item.title}</div>
                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">ID: {item.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-zinc-200 font-medium">{item.clientName}</div>
                          <div className="text-[10px] text-zinc-500">{item.clientEmail || 'No email attached'}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">₹{item.grossAmount?.toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            Net: ₹{(item.creatorPayout || item.grossAmount)?.toLocaleString('en-IN')} (Fee: ₹{item.platformFee || 0})
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-zinc-500" />
                            {item.viewCount || 0} client views
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium ${
                            item.status === 'Paid' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {item.status === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {item.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <button
                            onClick={() => copyLink(item.id)}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg border border-zinc-800 transition text-[11px] font-medium"
                          >
                            {copiedId === item.id ? 'Copied URL!' : 'Share Vault'}
                          </button>
                          <Link
                            href={`/d/${item.id}`}
                            target="_blank"
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 transition inline-block text-[11px]"
                            title="Open Client Vault View"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 inline" />
                          </Link>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg border border-zinc-800 transition inline-block text-[11px]"
                            title="Revoke Portal Link"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl w-full p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h3 className="text-base font-black text-white">Create Payment-Locked Vault</h3>
                <p className="text-[11px] text-zinc-400">Lock high-res deliverables behind an automated checkout escrow.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-200">✕</button>
            </div>

            <form onSubmit={handleCreateDelivery} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Deliverable Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Commercial Cut (4K ProRes + Raw Stills)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Client / Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Agency"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-1 w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
    
