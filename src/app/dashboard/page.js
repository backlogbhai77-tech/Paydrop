'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { 
  Zap, Shield, Plus, LogOut, Eye, Trash2, ArrowUpRight, 
  UploadCloud, Copy, Check, Lock, Layers, FolderKanban, 
  CreditCard, Settings, Menu, X, FileVideo, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = "nrfujht8"
const CLOUDINARY_UPLOAD_PRESET = "releasedrop_vault"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [activeTab, setActiveTab] = useState('portals')

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
            reject(new Error(res?.error?.message || "Upload failed"))
          }
        } catch (e) {
          reject(new Error("File upload error"))
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
    if (!confirm("Revoke this portal link? The client link will immediately stop working.")) return
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
  const numAmountPreview = Number(amount) || 0
  const previewFee = Math.max(Math.round(numAmountPreview * 0.05), 50)
  const previewPayout = Math.max(numAmountPreview - previewFee, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-600 flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-semibold text-slate-500">Loading ReleaseDrop...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAFC] text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-blue-500/20">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-semibold mb-3">
          <Shield className="w-3.5 h-3.5" /> Protected Delivery Workspace
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Sign In to ReleaseDrop</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-sm">
          Lock deliverables behind payment escrows. Start sending protected master files to your clients.
        </p>
        <button 
          onClick={handleGoogleLogin} 
          className="mt-6 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition flex items-center gap-2"
        >
          Continue with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans flex antialiased">
      
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between p-5 sticky top-0 h-screen z-30">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">ReleaseDrop</span>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('portals')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'portals' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FolderKanban className="w-4 h-4" /> Active Portals
            </button>
            <button 
              onClick={() => setActiveTab('settlements')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'settlements' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Escrow Settlements
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between px-2">
          <div className="truncate max-w-[140px]">
            <div className="text-xs font-bold text-slate-800 truncate">{user.displayName || user.email}</div>
            <div className="text-[10px] text-slate-400 font-medium">Verified Creator</div>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition" title="Log Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">Deliveries</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{deliveries.length} active</span>
            </div>
          </div>

          <button 
            onClick={() => setShowModal(true)} 
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Lock New Delivery
          </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Settled Earnings</span>
              <div className="text-2xl font-black text-slate-900 mt-1">₹{totalSettled.toLocaleString('en-IN')}</div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">100% Payout Disbursed</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Locked in Escrow</span>
              <div className="text-2xl font-black text-blue-600 mt-1">₹{pendingEscrow.toLocaleString('en-IN')}</div>
              <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">Releases on client authorization</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Active Portals</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{deliveries.length}</div>
              <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">7-Day Expiry Guarantee</span>
            </div>
          </div>

          {/* Portals List View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Protected Delivery Portals</h2>
            </div>

            {deliveries.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white border border-dashed border-slate-300 text-center space-y-3">
                <Lock className="w-9 h-9 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No deliveries locked yet</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Upload your master project files, specify the price, and send the watermarked preview link to your client.
                </p>
                <button 
                  onClick={() => setShowModal(true)} 
                  className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-blue-700 transition"
                >
                  Create First Delivery
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliveries.map(item => (
                  <div key={item.id} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mb-1.5">
                          {item.clientName}
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug">{item.title}</h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                          <FileVideo className="w-3.5 h-3.5 text-slate-500" />
                          {item.fileName || 'Master File'} • {item.fileSize || ''}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        item.status === 'Paid' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Payout Value</span>
                        <span className="font-extrabold text-slate-900 text-base">₹{item.grossAmount?.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => copyLink(item.id)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
                        >
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === item.id ? 'Copied' : 'Share'}
                        </button>

                        <Link 
                          href={`/d/${item.id}`} 
                          target="_blank" 
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                          title="Open Client Vault"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>

                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition"
                          title="Revoke Delivery"
                        >
                          <Trash2 className="w-4 h-4" />
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
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex lg:hidden">
          <div className="w-72 bg-white h-full p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <span className="font-bold text-sm text-slate-900">ReleaseDrop</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <button onClick={() => { setActiveTab('portals'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold">
                  <FolderKanban className="w-4 h-4" /> Active Portals
                </button>
                <button onClick={() => { setActiveTab('settlements'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 text-xs font-bold">
                  <CreditCard className="w-4 h-4" /> Escrow Settlements
                </button>
              </nav>
            </div>

            <button onClick={() => signOut(auth)} className="text-xs font-bold text-red-600 flex items-center gap-2 py-2 border-t border-slate-100">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Lock Delivery Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Create Protected Delivery</h3>
                <span className="text-[11px] text-slate-400">Lock master file behind payment escrow</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xs p-1">✕</button>
            </div>

            <form onSubmit={handleCreateDelivery} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Project / Deliverable Title *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Brand Campaign — Final Master 4K"
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Client Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Alex Creative Studio"
                    value={clientName} 
                    onChange={e => setClientName(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Amount (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="5000"
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition" 
                  />
                </div>
              </div>

              {numAmountPreview > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Client Authorization:</span>
                    <span className="font-bold text-slate-900">₹{numAmountPreview.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>ReleaseDrop Escrow (5%):</span>
                    <span>-₹{previewFee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-blue-600 font-bold pt-1 border-t border-slate-200/60">
                    <span>Net Creator Payout:</span>
                    <span>₹{previewPayout.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Pick Master File From Phone/Device *</label>
                <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/20 transition">
                  <UploadCloud className="w-6 h-6 text-blue-600 mb-1" />
                  <span className="text-xs font-bold text-slate-800">{selectedFile ? selectedFile.name : "Tap to choose file"}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{selectedFile ? `${(selectedFile.size / (1024*1024)).toFixed(2)} MB Ready` : "MP4, MOV, PNG, JPG, ZIP"}</span>
                  <input type="file" required onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.zip" />
                </label>
              </div>

              {uploading && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Uploading master deliverable...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" disabled={creating || uploading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50 transition">
                  {creating ? 'Locking File...' : 'Create Delivery Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
