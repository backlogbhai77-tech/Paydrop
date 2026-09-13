'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { 
  ShieldCheck, Lock, Plus, LogOut, Eye, Trash2, ArrowUpRight, 
  UploadCloud, Coins, Layers, Sparkles, CheckCircle2, Clock, 
  Film, FileCheck, Copy
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = "nrfujht8"
const CLOUDINARY_UPLOAD_PRESET = "releasedrop_vault"

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
  
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const uploadFileToCloudinary = (file) => {
    setUploading(true)
    setUploadProgress(10)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(percent)
        }
      }

      xhr.onload = () => {
        setUploading(false)
        try {
          const res = JSON.parse(xhr.responseText)
          if (xhr.status === 200 && res.secure_url) {
            resolve(res.secure_url)
          } else {
            const serverMsg = res?.error?.message || xhr.responseText
            reject(new Error("Cloudinary error: " + serverMsg))
          }
        } catch (e) {
          reject(new Error("Upload failed with status: " + xhr.status))
        }
      }

      xhr.onerror = () => {
        setUploading(false)
        reject(new Error("Network error during file upload."))
      }

      xhr.send(formData)
    })
  }

  const handleCreateDelivery = async (e) => {
    e.preventDefault()
    if (!title || !amount || !selectedFile || !user) {
      alert("Please enter title, amount, and pick a deliverable file from device.")
      return
    }

    setCreating(true)
    try {
      const secureFileUrl = await uploadFileToCloudinary(selectedFile)

      const numAmount = Number(amount) || 0
      const platformFee = Math.max(Math.round(numAmount * 0.05), 50)
      const creatorPayout = Math.max(numAmount - platformFee, 0)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title,
        clientName: clientName || 'Private Client',
        grossAmount: numAmount,
        platformFee,
        creatorPayout,
        status: 'Awaiting Payment',
        previewUrl: secureFileUrl,
        fileUrl: secureFileUrl,
        fileName: selectedFile.name,
        fileSize: (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB",
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        createdAt: serverTimestamp()
      })

      setShowModal(false)
      setTitle('')
      setClientName('')
      setAmount('')
      setSelectedFile(null)
      setUploadProgress(0)
      fetchDeliveries(user.uid)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Revoke this delivery portal? The client link will immediately stop working.")) return
    await deleteDoc(doc(db, 'deliveries', id))
    setDeliveries(prev => prev.filter(d => d.id !== id))
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const totalSettled = deliveries.filter(d => d.status === 'Paid').reduce((acc, c) => acc + (c.creatorPayout || c.grossAmount || 0), 0)
  const pendingEscrow = deliveries.filter(d => d.status === 'Awaiting Payment').reduce((acc, c) => acc + (c.creatorPayout || c.grossAmount || 0), 0)
  const numAmountPreview = Number(amount) || 0
  const previewFee = Math.max(Math.round(numAmountPreview * 0.05), 50)
  const previewPayout = Math.max(numAmountPreview - previewFee, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050608] text-zinc-400 flex items-center justify-center text-xs">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2" />
        <span className="font-mono uppercase tracking-widest text-[11px] text-zinc-500">Loading Workspace...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050608] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center font-black text-black text-2xl mb-5 shadow-2xl shadow-emerald-500/20">
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
          className="mt-6 px-6 py-3.5 bg-white hover:bg-zinc-100 text-black font-black text-xs rounded-xl transition shadow-xl active:scale-95"
        >
          Sign In with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050608] text-zinc-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* SaaS App Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl px-6 h-16 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-sm shadow-md shadow-emerald-500/20">
              R
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight leading-none text-white">ReleaseDrop</span>
              <span className="text-[9px] font-mono text-zinc-500 tracking-wider">CREATOR CORE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowModal(true)} 
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Lock New Delivery
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
            <span className="text-xs text-zinc-400 hidden sm:inline">{user.displayName || user.email}</span>
            <button 
              onClick={() => signOut(auth)} 
              className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-900 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main SaaS Workspace */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        
        {/* KPI & Revenue Matrix */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Settled Net Volume</span>
            <div className="text-2xl font-black mt-1 text-white">₹{totalSettled.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-emerald-400 font-mono mt-1 block">100% Payout Verified</span>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Locked in Escrow</span>
            <div className="text-2xl font-black text-amber-400 mt-1">₹{pendingEscrow.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-zinc-500 font-mono mt-1 block">Awaiting client payment</span>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Active Portals</span>
            <div className="text-2xl font-black mt-1 text-white">{deliveries.length}</div>
            <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
              {deliveries.filter(d => d.status === 'Paid').length} Paid • {deliveries.filter(d => d.status === 'Awaiting Payment').length} Pending
            </span>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Platform Tier</span>
            <div className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Direct Cloud Pro
            </div>
            <span className="text-[10px] text-zinc-500 font-mono mt-1 block">5% Transaction Fee</span>
          </div>
        </section>

        {/* Deliveries Data Table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Active Delivery Portals</h2>
              <p className="text-xs text-zinc-400">Manage client links and track unlock telemetry.</p>
            </div>
          </div>

          {deliveries.length === 0 ? (
            <div className="p-16 rounded-3xl border border-dashed border-zinc-800 text-center bg-zinc-950/40">
              <Lock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-200">No active delivery portals</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Upload a deliverable from your phone or device, set the amount, and send the payment-locked link to your client.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl transition shadow-lg shadow-emerald-500/10"
              >
                + Lock New Deliverable
              </button>
            </div>
          ) : (
            <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-950/40 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="px-5 py-3.5 font-medium">Deliverable Asset</th>
                      <th className="px-5 py-3.5 font-medium">Client</th>
                      <th className="px-5 py-3.5 font-medium">Gross Amount</th>
                      <th className="px-5 py-3.5 font-medium">Telemetry</th>
                      <th className="px-5 py-3.5 font-medium">Status</th>
                      <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {deliveries.map(item => (
                      <tr key={item.id} className="hover:bg-zinc-900/30 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-zinc-100">{item.title}</div>
                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5 flex items-center gap-1.5">
                            <Film className="w-3 h-3 text-emerald-400" />
                            {item.fileName || 'Master Delivery'} • {item.fileSize || ''}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-zinc-300 font-medium">{item.clientName}</td>
                        <td className="px-5 py-4 font-bold text-white">₹{item.grossAmount?.toLocaleString('en-IN')}</td>
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
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-[11px] font-medium transition"
                          >
                            {copiedId === item.id ? 'Copied Link!' : 'Share Vault'}
                          </button>
                          <Link 
                            href={`/d/${item.id}`} 
                            target="_blank" 
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg inline-block text-[11px] transition"
                            title="Open Client Portal"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 inline" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            className="p-1.5 bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 border border-zinc-800 rounded-lg inline-block text-[11px] transition"
                            title="Revoke Link"
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
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Create Payment-Locked Vault</h3>
                <span className="text-[10px] text-zinc-500 font-mono">Upload master files directly from device</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 text-xs hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateDelivery} className="space-y-3.5">
              <div>
                <label className="text-[10px] uppercase font-mono text-zinc-400">Deliverable Title *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Master Ad Edit 4K (Final ProRes)" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="mt-1 w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-400">Client Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Rohan Mehta" 
                    value={clientName} 
                    onChange={e => setClientName(e.target.value)} 
                    className="mt-1 w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500" 
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-400">Amount (₹ INR) *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="e.g. 7500" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    className="mt-1 w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500" 
                  />
                </div>
              </div>

              {numAmountPreview > 0 && (
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-[11px] font-mono space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Client Charge:</span>
                    <span className="text-white font-bold">₹{numAmountPreview.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Platform Fee (5%):</span>
                    <span>-₹{previewFee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-zinc-800">
                    <span>Net Creator Escrow:</span>
                    <span>₹{previewPayout.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">Pick Master File (Video / Photo / ZIP) *</label>
                <label className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-zinc-900/30 transition group">
                  <UploadCloud className="w-7 h-7 text-emerald-400 mb-1.5 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-zinc-200">
                    {selectedFile ? selectedFile.name : "Tap to pick from Device"}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">
                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB Selected` : "MP4, MOV, PNG, JPG, ZIP (Direct Upload)"}
                  </span>
                  <input 
                    type="file" 
                    required 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept="image/*,video/*,.zip"
                  />
                </label>
              </div>

              {uploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>Uploading to Encrypted Vault...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-900">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating || uploading} 
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl disabled:opacity-50 transition shadow-lg shadow-emerald-500/20"
                >
                  {creating ? 'Encrypting & Locking...' : 'Upload & Lock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
