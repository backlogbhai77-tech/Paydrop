'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { 
  ShieldCheck, Lock, Plus, LogOut, Eye, Trash2, ArrowUpRight, Coins, Layers
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [amount, setAmount] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) fetchDeliveries(currentUser.uid)
    })
    return () => unsub()
  }, [])

  const fetchDeliveries = async (uid) => {
    try {
      const q = query(collection(db, 'deliveries'), where('userId', '==', uid))
      const snap = await getDocs(q)
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setDeliveries(docs)
    } catch (err) {
      console.error(err)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      await signInWithRedirect(auth, googleProvider)
    }
  }

  const handleCreateDelivery = async (e) => {
    e.preventDefault()
    if (!title || !amount || !fileUrl || !user) return

    setCreating(true)
    try {
      const numAmount = Number(amount) || 0
      const platformFee = Math.max(Math.round(numAmount * 0.05), 50)
      const creatorPayout = Math.max(numAmount - platformFee, 0)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title,
        clientName: clientName || 'Client',
        grossAmount: numAmount,
        platformFee,
        creatorPayout,
        status: 'Awaiting Payment',
        previewUrl: previewUrl.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200',
        fileUrl: fileUrl.trim(),
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        createdAt: serverTimestamp()
      })

      setShowModal(false)
      setTitle('')
      setClientName('')
      setAmount('')
      setFileUrl('')
      setPreviewUrl('')
      fetchDeliveries(user.uid)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Revoke this portal link?")) return
    await deleteDoc(doc(db, 'deliveries', id))
    setDeliveries(prev => prev.filter(d => d.id !== id))
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const totalSettled = deliveries.filter(d => d.status === 'Paid').reduce((acc, c) => acc + (c.creatorPayout || c.grossAmount || 0), 0)
  const pendingEscrow = deliveries.filter(d => d.status === 'Awaiting Payment').reduce((acc, c) => acc + (c.creatorPayout || c.grossAmount || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-400 flex items-center justify-center text-xs">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2" />
        <span>Loading Workspace...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#06080e] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-black text-xl mb-4">R</div>
        <h1 className="text-2xl font-black">ReleaseDrop Workspace</h1>
        <p className="text-zinc-400 text-xs mt-1 max-w-xs">Lock deliverables behind escrow payments.</p>
        <button onClick={handleGoogleLogin} className="mt-5 px-6 py-3 bg-white text-black font-bold text-xs rounded-xl">
          Sign In with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06080e] text-zinc-100 font-sans flex flex-col">
      <header className="border-b border-zinc-900 bg-zinc-950/80 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-sm">R</div>
          <span className="font-bold text-sm">ReleaseDrop Core</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowModal(true)} className="bg-emerald-500 text-black font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1">
            <Plus className="w-4 h-4" /> New Vault
          </button>
          <button onClick={() => signOut(auth)} className="p-2 text-zinc-500 hover:text-red-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-900">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Settled Earnings</span>
            <div className="text-xl font-black mt-1">₹{totalSettled.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-900">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Pending Escrow</span>
            <div className="text-xl font-black text-amber-400 mt-1">₹{pendingEscrow.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-900">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Vaults</span>
            <div className="text-xl font-black mt-1">{deliveries.length}</div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-900">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Plan</span>
            <div className="text-sm font-bold text-emerald-400 mt-1">Pro Escrow (5%)</div>
          </div>
        </div>

        <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 border-b border-zinc-900 text-zinc-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="px-5 py-3">Deliverable</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Views</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {deliveries.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-900/40">
                    <td className="px-5 py-4 font-bold">{item.title}</td>
                    <td className="px-5 py-4 text-zinc-400">{item.clientName}</td>
                    <td className="px-5 py-4 font-bold">₹{item.grossAmount?.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-zinc-400 flex items-center gap-1 pt-5"><Eye className="w-3 h-3" /> {item.viewCount || 0}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${item.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button onClick={() => copyLink(item.id)} className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-[11px]">
                        {copiedId === item.id ? 'Copied' : 'Share'}
                      </button>
                      <Link href={`/d/${item.id}`} target="_blank" className="p-1 bg-zinc-900 border border-zinc-800 rounded inline-block text-[11px]">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => handleDelete(item.id)} className="p-1 bg-zinc-900 border border-zinc-800 rounded text-red-400 inline-block text-[11px]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create Payment-Locked Vault</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 text-xs">✕</button>
            </div>
            <form onSubmit={handleCreateDelivery} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-mono text-zinc-400">Title *</label>
                <input type="text" required placeholder="Project Name" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-400">Client</label>
                  <input type="text" placeholder="Client Name" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-400">Amount (₹) *</label>
                  <input type="number" required placeholder="5000" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-zinc-400">Secret File / Drive Link *</label>
                <input type="url" required placeholder="https://drive.google.com/..." value={fileUrl} onChange={e => setFileUrl(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-zinc-400">Preview Image URL (Optional)</label>
                <input type="url" placeholder="https://..." value={previewUrl} onChange={e => setPreviewUrl(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-zinc-400">Cancel</button>
                <button type="submit" disabled={creating} className="px-5 py-2 bg-emerald-500 text-black font-bold text-xs rounded-xl">
                  {creating ? 'Locking...' : 'Deploy Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
