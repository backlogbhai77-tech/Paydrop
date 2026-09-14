'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import {
  Lock, Plus, ShieldCheck, Copy, ExternalLink,
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, LogOut,
  Sparkles, Layers, IndianRupee, FileText, FileArchive
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // Form State
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [upiId, setUpiId] = useState('')
  const [expiryDays, setExpiryDays] = useState('7')
  const [watermark, setWatermark] = useState(true)
  const [fileUrl, setFileUrl] = useState('')

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
    if (!title || !amount || !user) return
    setCreating(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays))

      await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title,
        clientName: clientName || 'Unnamed Client',
        clientEmail: clientEmail || '',
        amount: Number(amount),
        upiId: upiId || '',
        currency: 'INR',
        status: 'Awaiting Payment',
        watermarkEnabled: watermark,
        fileUrl: fileUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200',
        expiresAt: expiresAt.toISOString(),
        createdAt: serverTimestamp(),
        downloadCount: 0
      })

      setShowModal(false)
      setTitle('')
      setClientName('')
      setClientEmail('')
      setAmount('')
      setUpiId('')
      setFileUrl('')
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
      <div className="min-h-screen bg-[#07090e] text-zinc-300 flex items-center justify-center text-sm font-sans">
        Loading ReleaseDrop Workspace...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center font-black text-black text-xl mb-4 shadow-xl shadow-emerald-500/20">
          R
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">ReleaseDrop Workspace</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-sm">Sign in to manage deliveries, lock high-res assets, and get paid securely.</p>
        <button
          onClick={handleGoogleLogin}
          className="mt-6 px-6 py-3 bg-zinc-100 hover:bg-white text-black font-bold text-sm rounded-xl transition flex items-center gap-2 shadow-lg active:scale-95"
        >
          Sign In with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 antialiased font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-sm">
                R
              </div>
              <span className="font-bold text-lg tracking-tight">ReleaseDrop</span>
            </Link>
            <span className="hidden sm:inline-block text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">
              Workspace
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95"
            >
              <Plus className="w-4 h-4" /> New Delivery
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
              <span className="text-xs text-zinc-400 hidden sm:inline">{user.displayName || user.email}</span>
              <button
                onClick={() => signOut(auth)}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        {/* Metric Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Settled Revenue</span>
            <div className="text-2xl font-black text-white mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">100% verified release</span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending Release</span>
            <div className="text-2xl font-black text-amber-400 mt-1">₹{pendingAmount.toLocaleString('en-IN')}</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Files locked awaiting payment</span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Paid Deliveries</span>
            <div className="text-2xl font-black text-white mt-1">
              {deliveries.filter(d => d.status === 'Paid').length}
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Completed handoffs</span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Deliveries</span>
            <div className="text-2xl font-black text-white mt-1">{deliveries.length}</div>
            <span className="text-[11px] text-zinc-500 mt-1 block">Total project portals</span>
          </div>
        </section>

        {/* Deliveries List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Deliveries</h2>
            <span className="text-xs text-zinc-500">{deliveries.length} total links generated</span>
          </div>

          {deliveries.length === 0 ? (
            <div className="p-12 rounded-2xl border border-dashed border-zinc-800 text-center bg-zinc-900/20">
              <Lock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-200">No deliveries yet</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Create your first delivery to lock your master files and share a secure payment link with your client.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition"
              >
                + Create First Delivery
              </button>
            </div>
          ) : (
            <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">Delivery Title</th>
                      <th className="px-5 py-3.5">Client</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {deliveries.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-900/30 transition">
                        <td className="px-5 py-4 font-semibold text-zinc-200">
                          <div className="flex items-center gap-2">
                            <FileArchive className="w-4 h-4 text-emerald-400" />
                            <span>{item.title}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-zinc-400">{item.clientName}</td>
                        <td className="px-5 py-4 font-bold text-white">₹{item.amount?.toLocaleString('en-IN')}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
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
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition inline-flex items-center gap-1 text-[11px]"
                            title="Copy Client PayLink"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedId === item.id ? 'Copied!' : 'Copy Link'}
                          </button>
                          <Link
                            href={`/d/${item.id}`}
                            target="_blank"
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition inline-flex items-center text-[11px]"
                            title="Open Client Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
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

      {/* Modal: New Delivery */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Create New Delivery</h3>
                <p className="text-xs text-zinc-400">Lock your asset and set the settlement price.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-200 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDelivery} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brand Commercial Edit v2 (4K)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Client Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Amount (INR ₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Your Payout UPI ID (GPay / PhonePe / Paytm)</label>
                <input
                  type="text"
                  placeholder="e.g. creator@okhdfcbank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Master File URL / Download Link</label>
                <input
                  type="url"
                  placeholder="Direct link to master package/file (or leave blank for demo preview)"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-left">
                  <div className="text-xs font-semibold text-zinc-200">Visible Anti-Piracy Watermark</div>
                  <div className="text-[10px] text-zinc-400">Overlays dynamic "UNPAID PREVIEW" on client inspection</div>
                </div>
                <input
                  type="checkbox"
                  checked={watermark}
                  onChange={(e) => setWatermark(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl transition flex items-center gap-2"
                >
                  {creating ? 'Locking Asset...' : 'Create Protected Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
