'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import {
  Lock, Plus, Copy, ExternalLink,
  Clock, CheckCircle2, LogOut, ShieldCheck, FileArchive, Sparkles
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
      const q = query(
        collection(db, 'deliveries'),
        where('userId', '==', uid)
      )
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
    if (!title || !amount || !fileUrl || !upiId || !user) {
      alert("Please enter Deliverable Title, Amount, UPI ID, and File Link")
      return
    }

    setCreating(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays))

      await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title: title.trim(),
        clientName: clientName.trim() || 'Valued Client',
        amount: Number(amount),
        upiId: upiId.trim(),
        currency: 'INR',
        status: 'Awaiting Payment',
        watermarkEnabled: true,
        previewUrl: previewUrl.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200',
        fileUrl: fileUrl.trim(),
        expiresAt: expiresAt.toISOString(),
        createdAt: serverTimestamp()
      })

      setShowModal(false)
      setTitle('')
      setClientName('')
      setAmount('')
      setUpiId('')
      setFileUrl('')
      setPreviewUrl('')
      fetchDeliveries(user.uid)
    } catch (err) {
      alert("Failed to create delivery: " + err.message)
    } finally {
      setCreating(false)
    }
  }

  const copyLink = (id) => {
    const url = `${window.location.origin}/d/${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const totalRevenue = deliveries
    .filter(d => d.status === 'Paid')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0)

  const pendingAmount = deliveries
    .filter(d => d.status === 'Awaiting Payment')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080B] text-zinc-400 flex items-center justify-center text-xs font-mono uppercase tracking-wider">
        Loading ReleaseDrop Terminal...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#07080B] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-400 text-black font-extrabold text-lg flex items-center justify-center mb-4">
          R
        </div>
        <h1 className="text-2xl font-bold tracking-tight">ReleaseDrop Terminal</h1>
        <p className="text-zinc-400 text-xs mt-1.5 max-w-sm">
          Lock deliverables behind verified UPI settlement gateways and eliminate client ghosting.
        </p>
        <button
          onClick={handleGoogleLogin}
          className="mt-6 px-6 py-3 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl transition shadow-lg active:scale-95"
        >
          Sign In with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07080B] text-zinc-100 font-sans antialiased flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-white/[0.08] bg-[#0A0C10]/80 backdrop-blur-md sticky top-0 z-30 px-6">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-400 text-black font-bold flex items-center justify-center text-xs">
              R
            </div>
            <span className="font-bold text-sm tracking-tight text-white">ReleaseDrop</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> New Vault Portal
            </button>
            <button
              onClick={() => signOut(auth)}
              className="p-2 hover:bg-white/[0.05] rounded-lg text-zinc-400 hover:text-rose-400 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8 w-full flex-1 space-y-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0D0F15] border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Settled Revenue</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#0D0F15] border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Awaiting Settlement</span>
            <div className="text-2xl font-bold font-mono text-amber-300 mt-1">₹{pendingAmount.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#0D0F15] border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Released Deliveries</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">{deliveries.filter(d => d.status === 'Paid').length}</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#0D0F15] border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Active Portals</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">{deliveries.length}</div>
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Active Vault Portals</h2>

          {deliveries.length === 0 ? (
            <div className="p-12 rounded-2xl border border-dashed border-white/[0.08] text-center bg-[#0D0F15]/40">
              <Lock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">No active delivery portals yet. Create one to lock your assets.</p>
            </div>
          ) : (
            <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-[#0D0F15]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-zinc-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Deliverable</th>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Due</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {deliveries.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-4 font-medium text-white">{item.title}</td>
                      <td className="px-5 py-4 text-zinc-400">{item.clientName}</td>
                      <td className="px-5 py-4 font-mono font-bold text-white">₹{item.amount?.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono ${
                          item.status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {item.status === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => copyLink(item.id)}
                          className="px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 rounded-lg text-xs transition"
                        >
                          {copiedId === item.id ? 'Copied' : 'Copy Link'}
                        </button>
                        <Link
                          href={`/d/${item.id}`}
                          target="_blank"
                          className="p-1 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 rounded-lg inline-block text-xs transition"
                        >
                          <ExternalLink className="w-3 h-3 m-0.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* New Delivery Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D0F15] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Create Locked Delivery Portal</h3>
                <p className="text-[11px] text-zinc-400">Lock your original files behind verified UPI payment.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateDelivery} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Project / Asset Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Commercial Edit 4K"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Client Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Agency"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Settlement Price (₹ INR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Real UPI ID Input */}
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Your Payout UPI ID (GPay / PhonePe / Paytm) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Master File URL */}
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Original Master File URL (Google Drive / Dropbox / Cloudinary ZIP) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/file/d/... or private link"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Preview Image / Video */}
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Watermarked Preview Asset URL (Optional)</label>
                <input
                  type="url"
                  placeholder="Leave blank for auto-generated placeholder canvas"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-bold text-xs rounded-xl transition"
                >
                  {creating ? 'Locking Assets...' : 'Deploy Secure Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
