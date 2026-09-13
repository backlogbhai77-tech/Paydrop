'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { 
  FolderKanban, ShieldCheck, Plus, LogOut, Eye, Trash2, 
  ExternalLink, UploadCloud, CreditCard, LayoutDashboard,
  Settings, Menu, X, ArrowUpRight, Copy, Check, Lock, Sparkles
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = "nrfujht8"
const CLOUDINARY_UPLOAD_PRESET = "releasedrop_vault"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // Form Fields
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
    if (file) setSelectedFile(file)
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
            reject(new Error(res?.error?.message || "Upload error"))
          }
        } catch (e) {
          reject(new Error("Upload failed"))
        }
      }

      xhr.onerror = () => {
        setUploading(false)
        reject(new Error("Network failed"))
      }

      xhr.send(formData)
    })
  }

  const handleCreateDelivery = async (e) => {
    e.preventDefault()
    if (!title || !amount || !selectedFile || !user) return

    setCreating(true)
    try {
      const secureUrl = await uploadFileToCloudinary(selectedFile)
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
        previewUrl: secureUrl,
        fileUrl: secureUrl,
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
      fetchDeliveries(user.uid)
    } catch (err) {
      alert("Error: " + err.message)
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
      <div className="min-h-screen bg-[#090D16] text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-slate-500">Loading ReleaseDrop...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-xl shadow-indigo-500/20">
          RD
        </div>
        <h1 className="text-2xl font-bold tracking-tight">ReleaseDrop Workspace</h1>
        <p className="text-slate-400 text-xs mt-1.5 max-w-xs leading-relaxed">Enterprise payment-locked asset delivery portal.</p>
        <button onClick={handleGoogleLogin} className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition">
          Sign In with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-200 font-sans flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0D121F] border-r border-slate-800/80 flex-col justify-between p-5">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/20">
              RD
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white">ReleaseDrop</div>
              <div className="text-[10px] font-mono text-slate-500">ESCROW CONSOLE</div>
            </div>
          </div>

          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 text-xs font-semibold">
              <LayoutDashboard className="w-4 h-4" /> Portals Overview
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 text-xs font-medium transition">
              <FolderKanban className="w-4 h-4" /> Deliverables
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 text-xs font-medium transition">
              <CreditCard className="w-4 h-4" /> Payouts & Escrow
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between px-2">
          <div className="truncate max-w-[140px]">
            <div className="text-xs font-medium text-slate-200 truncate">{user.displayName || user.email}</div>
            <div className="text-[10px] text-slate-500 font-mono">Pro Escrow</div>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-red-400 transition" title="Log Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/80 bg-[#0D121F]/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white tracking-tight">Active Portals</span>
          </div>

          <button 
            onClick={() => setShowModal(true)} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Delivery Vault
          </button>
        </header>

        {/* Workspace Canvas */}
        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0D121F] border border-slate-800/80">
              <div className="text-slate-400 text-xs font-medium">Settled Volume</div>
              <div className="text-2xl font-bold text-white mt-1">₹{totalSettled.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-emerald-400 mt-1 font-mono">Verified in creator account</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D121F] border border-slate-800/80">
              <div className="text-slate-400 text-xs font-medium">Pending Escrow</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">₹{pendingEscrow.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">Awaiting client release</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D121F] border border-slate-800/80">
              <div className="text-slate-400 text-xs font-medium">Live Portals</div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{deliveries.length}</div>
              <div className="text-[10px] text-indigo-400 mt-1 font-mono">256-Bit Escrow Guarded</div>
            </div>
          </div>

          {/* Portals Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white tracking-tight">Active Deliverables</h2>
              <span className="text-xs text-slate-500">{deliveries.length} Total</span>
            </div>

            {deliveries.length === 0 ? (
              <div className="p-12 rounded-2xl bg-[#0D121F] border border-dashed border-slate-800 text-center space-y-3">
                <Lock className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No deliveries deployed yet</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">Upload any deliverable from your phone or PC, set the locked amount, and generate a client vault.</p>
                <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-xl">
                  Deploy First Vault
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliveries.map(item => (
                  <div key={item.id} className="p-5 rounded-2xl bg-[#0D121F] border border-slate-800/80 hover:border-slate-700/80 transition space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">{item.clientName}</span>
                        <h3 className="text-sm font-bold text-white mt-0.5">{item.title}</h3>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{item.fileName || 'Master Deliverable'} • {item.fileSize || ''}</p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-medium ${
                        item.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">Settlement Due</span>
                        <span className="font-bold text-white text-sm">₹{item.grossAmount?.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => copyLink(item.id)}
                          className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1"
                        >
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === item.id ? 'Copied' : 'Copy Link'}
                        </button>

                        <Link 
                          href={`/d/${item.id}`} 
                          target="_blank" 
                          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                          title="Open Client View"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>

                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="p-2 bg-slate-800/80 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition"
                          title="Delete Portal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex lg:hidden">
          <div className="w-64 bg-[#0D121F] h-full p-5 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-white">ReleaseDrop</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <nav className="space-y-1 text-xs">
                <div className="px-3 py-2 bg-indigo-600/10 text-indigo-400 rounded-xl font-medium">Dashboard</div>
              </nav>
            </div>
            <button onClick={() => signOut(auth)} className="text-xs text-red-400 flex items-center gap-2 py-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Deploy Vault Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D121F] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create Payment-Locked Delivery</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleCreateDelivery} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Deliverable Title *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Brand Commercial Video (Master 4K)"
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="w-full bg-[#090D16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Client Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Acme Media"
                    value={clientName} 
                    onChange={e => setClientName(e.target.value)} 
                    className="w-full bg-[#090D16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Amount (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="5000"
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    className="w-full bg-[#090D16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Select File from Device *</label>
                <label className="border border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-[#090D16] transition">
                  <UploadCloud className="w-6 h-6 text-indigo-400 mb-1" />
                  <span className="text-xs font-medium text-slate-200">{selectedFile ? selectedFile.name : "Choose Video, Image, or ZIP"}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{selectedFile ? `${(selectedFile.size / (1024*1024)).toFixed(2)} MB Selected` : "Tap to browse phone files"}</span>
                  <input type="file" required onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.zip" />
                </label>
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Uploading deliverable...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-slate-400">Cancel</button>
                <button type="submit" disabled={creating || uploading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl disabled:opacity-50">
                  {creating ? 'Locking File...' : 'Deploy Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
