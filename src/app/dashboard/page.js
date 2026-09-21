'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, deleteDoc, doc, updateDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore'
import { 
  Zap, Plus, FolderKanban, ShieldCheck, 
  UploadCloud, CheckCircle2, Lock, ArrowRight, ArrowLeft, 
  Copy, Check, Trash2, ExternalLink, FileArchive, Clock,
  AlertCircle, RefreshCw, X, MessageSquare, Send, Bell,
  Menu, Search, Layers, FileText
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = "releasedrop_vault"

function formatINR(amount) {
  const num = Number(amount)
  if (isNaN(num)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num)
}

// Clean Subtle SVG Sparkline (Linear-style)
function MetricCard({ title, amount, subtitle, trend, color, icon: Icon, badge }) {
  const isEmerald = color === 'emerald'
  const isAmber = color === 'amber'
  const stroke = isEmerald ? '#059669' : isAmber ? '#D97706' : '#2563EB'
  const fillGrad = isEmerald ? 'from-emerald-500/10' : isAmber ? 'from-amber-500/10' : 'from-blue-500/10'

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isEmerald ? 'bg-emerald-50 text-emerald-600' :
            isAmber ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{amount}</div>
        <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      {/* Subtle Mini Sparkline Bar */}
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${isEmerald ? 'bg-emerald-500' : isAmber ? 'bg-amber-500' : 'bg-blue-600'} rounded-full`} style={{ width: '70%' }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [currentView, setCurrentView] = useState('overview')
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)

  // 4-Step Form Wizard
  const [wizardStep, setWizardStep] = useState(1)
  const [creating, setCreating] = useState(false)

  // Fields
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [expirySelection, setExpirySelection] = useState('7')
  const [watermarkText, setWatermarkText] = useState('RELEASEDROP • PROTECTED PREVIEW')
  
  // File Upload
  const [fileList, setFileList] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  // Chat
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [replyText, setReplyText] = useState('')

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    let unsubFirestore = null
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) {
        const q = query(collection(db, 'deliveries'), where('userId', '==', currentUser.uid))
        unsubFirestore = onSnapshot(q, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setDeliveries(docs)
        })
      } else {
        setDeliveries([])
      }
    })
    return () => {
      unsubAuth()
      if (unsubFirestore) unsubFirestore()
    }
  }, [])

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch {
      await signInWithRedirect(auth, googleProvider)
    }
  }

  const handleFilesAdd = (e) => {
    const selected = Array.from(e.target.files)
    if (!selected.length) return
    setFileList(prev => [...prev, ...selected])
  }

  const removeFileFromList = (index) => {
    setFileList(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFileToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 98)
          setUploadProgress(percent)
        }
      }

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText)
          if (xhr.status === 200 && (res.secure_url || res.url)) {
            resolve({
              name: file.name,
              size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
              type: file.type || 'application/octet-stream',
              url: res.secure_url || res.url
            })
          } else {
            reject(new Error(res?.error?.message || "Storage upload failure"))
          }
        } catch {
          reject(new Error("Response parse failure"))
        }
      }
      xhr.onerror = () => reject(new Error("Network lost"))
      xhr.send(formData)
    })
  }

  const handleFinalDeploy = async () => {
    if (!title || !amount || !fileList.length || !user) {
      showToast("Please fill all required fields", "error")
      return
    }

    setCreating(true)
    setUploading(true)

    try {
      const uploadedManifest = []
      for (let i = 0; i < fileList.length; i++) {
        setUploadProgress(Math.round((i / fileList.length) * 100))
        const fileInfo = await uploadFileToCloudinary(fileList[i])
        uploadedManifest.push(fileInfo)
      }
      setUploadProgress(100)

      const numAmount = Number(amount) || 0
      const platformFee = Math.max(Math.round(numAmount * 0.05), 50)
      const creatorPayout = Math.max(numAmount - platformFee, 0)
      
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (expirySelection === 'never' ? 3650 : parseInt(expirySelection)))

      await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title: title.trim(),
        clientName: clientName.trim() || 'Client',
        clientEmail: clientEmail.trim(),
        clientMessage: clientMessage.trim(),
        grossAmount: numAmount,
        platformFee,
        creatorPayout,
        watermarkText: watermarkText || 'RELEASEDROP • PROTECTED PREVIEW',
        status: 'Awaiting Payment',
        files: uploadedManifest,
        primaryPreviewUrl: uploadedManifest[0]?.url,
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        messages: [],
        createdAt: serverTimestamp()
      })

      showToast("Vault deployed & client link generated!", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setFileList([])
      setWizardStep(1)
      setCurrentView('overview')
    } catch (err) {
      showToast(err.message || "Failed to deploy", "error")
    } finally {
      setCreating(false)
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Revoke this delivery? Access will be terminated.")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      showToast("Delivery revoked", "success")
    } catch {
      showToast("Failed to delete", "error")
    }
  }

  const handleDeleteAll = async () => {
    if (!deliveries.length) return
    if (!confirm(`Delete all ${deliveries.length} deliveries permanently?`)) return
    try {
      const batch = writeBatch(db)
      deliveries.forEach(d => batch.delete(doc(db, 'deliveries', d.id)))
      await batch.commit()
      showToast("All deliveries cleared", "success")
    } catch {
      showToast("Purge failed", "error")
    }
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    showToast("Link copied to clipboard", "success")
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleSendReply = async (deliveryId) => {
    if (!replyText.trim()) return
    try {
      const target = deliveries.find(d => d.id === deliveryId)
      const existing = target?.messages || []
      const updated = [...existing, { sender: 'creator', text: replyText.trim(), time: new Date().toISOString() }]
      await updateDoc(doc(db, 'deliveries', deliveryId), { messages: updated })
      setReplyText('')
      showToast("Message dispatched", "success")
    } catch {
      showToast("Failed to send", "error")
    }
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const totalRevenue = paidDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const pendingAmount = pendingDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)

  const filteredDeliveries = deliveries.filter(d => {
    const matchesFilter = filterStatus === 'all' ? true : filterStatus === 'pending' ? d.status === 'Awaiting Payment' : d.status === 'Paid'
    const matchesSearch = d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const activeChat = deliveries.find(d => d.id === (selectedChatId || deliveries[0]?.id))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-xs text-slate-500 gap-2 font-mono">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>AUTHENTICATING...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-sm">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ReleaseDrop Workspace</h1>
        <p className="text-slate-500 text-xs mt-1 max-w-sm">Payment-locked deliverables for creative professionals.</p>
        <button onClick={handleGoogleLogin} className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition">
          Sign In with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex antialiased pb-20 lg:pb-0">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl bg-slate-900 text-white text-xs font-semibold border border-slate-800">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col justify-between p-5 sticky top-0 h-screen z-30">
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900 uppercase">ReleaseDrop</span>
          </Link>

          <nav className="space-y-1">
            <button
              onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Overview & Drops</span>
            </button>
            <button
              onClick={() => { setCurrentView('messages'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'messages' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                <span>Revisions Inbox</span>
              </div>
              {deliveries.some(d => d.messages?.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              )}
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="px-2">
            <div className="text-xs font-bold text-slate-900 truncate">{user.displayName || user.email?.split('@')[0]}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate">{user.email}</div>
          </div>
          <button onClick={() => signOut(auth)} className="w-full text-left px-2 py-1.5 text-xs text-slate-500 hover:text-rose-600 transition">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="relative hidden sm:block w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search deliveries, clients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button 
              onClick={() => { setCurrentView('create'); setWizardStep(1); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Drop</span>
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">

          {/* VIEW: OVERVIEW */}
          {currentView === 'overview' && (
            <div className="space-y-6">
              
              {/* Creator Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'RD'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{user.displayName || user.email?.split('@')[0]}</h2>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                        Verified Creator
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Escrow Core Ready • Auto Clearance</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    + Create New Drop
                  </button>
                </div>
              </div>

              {/* Metric Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  title="Pending Escrow Payouts"
                  amount={formatINR(pendingAmount)}
                  subtitle="Locked across active client drops"
                  color="blue"
                  icon={Lock}
                />
                <MetricCard
                  title="Verified Cleared Earnings"
                  amount={formatINR(totalRevenue)}
                  subtitle="Released & licensed deliverables"
                  color="emerald"
                  icon={ShieldCheck}
                />
                <MetricCard
                  title="Active Drop Portals"
                  amount={deliveries.length.toString()}
                  subtitle="Tamper-proof digital vaults"
                  color="amber"
                  icon={FolderKanban}
                />
              </div>

              {/* Deliveries List */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Deliveries</h3>
                    {deliveries.length > 0 && (
                      <button
                        onClick={handleDeleteAll}
                        className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
                      >
                        Delete All
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    {['all', 'pending', 'paid'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setFilterStatus(tab)}
                        className={`px-3 py-1 rounded-lg transition capitalize ${
                          filterStatus === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredDeliveries.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No deliveries found.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredDeliveries.map(item => (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <FileArchive className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Client: <span className="text-slate-700 font-medium">{item.clientName}</span> • {item.files?.length || 1} file(s)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span className="font-mono font-black text-xs text-slate-900">
                            {formatINR(item.grossAmount)}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.status === 'Paid' ? 'Paid' : 'Pending'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyLink(item.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition"
                            >
                              {copiedId === item.id ? 'Copied' : 'Copy'}
                            </button>
                            <Link href={`/d/${item.id}`} target="_blank" className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: CREATE DROP */}
          {currentView === 'create' && (
            <div className="max-w-xl mx-auto space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Deploy Delivery Vault</h2>
                  <p className="text-xs text-slate-500">Upload assets and set your escrow amount.</p>
                </div>
                <button onClick={() => setCurrentView('overview')} className="text-xs font-semibold text-slate-400">Cancel</button>
              </div>

              {wizardStep === 1 && (
                <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 transition">
                    <UploadCloud className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                    <span className="text-sm font-bold text-slate-900 block">Select Deliverable Master Assets</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">MP4, MOV, PNG, JPG, PDF, ZIP</span>
                    <label className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition">
                      Browse Files
                      <input type="file" multiple onChange={handleFilesAdd} className="hidden" />
                    </label>
                  </div>

                  {fileList.length > 0 && (
                    <div className="space-y-1.5 border border-slate-100 rounded-xl p-3 bg-slate-50">
                      {fileList.map((f, i) => (
                        <div key={i} className="flex justify-between text-xs items-center">
                          <span className="truncate max-w-[200px] font-medium text-slate-800">{f.name}</span>
                          <button onClick={() => removeFileFromList(i)} className="text-slate-400 hover:text-rose-600">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    disabled={!fileList.length}
                    onClick={() => setWizardStep(2)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    Next: Project Details →
                  </button>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Project Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. 4K Commercial Final Edit"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Client Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Media"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Settlement Due (₹ INR) *</label>
                      <input
                        type="number"
                        placeholder="12000"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Client Handover Note</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Approved color pass. Full resolution assets unseal upon settlement."
                      value={clientMessage}
                      onChange={e => setClientMessage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {uploading && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-500 font-mono">
                        <span>Deploying to vault...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setWizardStep(1)} className="w-1/3 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl">Back</button>
                    <button
                      disabled={creating || uploading || !title || !amount}
                      onClick={handleFinalDeploy}
                      className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      {creating ? 'Deploying...' : 'Deploy Payment-Locked Vault'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: MESSAGES (WHATSAPP 2-PANE) */}
          {currentView === 'messages' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 h-[560px]">
              <div className="md:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/40">
                <div className="p-3 border-b border-slate-200 bg-white font-bold text-xs text-slate-700">Conversations</div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {deliveries.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedChatId(d.id)}
                      className={`w-full p-3 text-left transition ${activeChat?.id === d.id ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/50'}`}
                    >
                      <div className="text-xs font-bold text-slate-900 truncate">{d.clientName}</div>
                      <div className="text-[11px] text-blue-600 truncate">{d.title}</div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {d.messages?.length ? d.messages[d.messages.length - 1].text : 'No messages'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col h-full bg-white">
                {activeChat ? (
                  <>
                    <div className="p-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{activeChat.clientName}</span>
                        <span className="text-[10px] text-slate-400">{activeChat.title}</span>
                      </div>
                      <Link href={`/d/${activeChat.id}`} target="_blank" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <span>Portal</span> <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#F8FAFC]">
                      {(activeChat.messages || []).map((m, idx) => (
                        <div key={idx} className={`flex flex-col ${m.sender === 'creator' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-2.5 rounded-xl text-xs max-w-sm ${m.sender === 'creator' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                            {m.text}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 border-t border-slate-200 flex gap-2">
                      <input
                        type="text"
                        placeholder="Reply to client..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendReply(activeChat.id)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                      <button onClick={() => handleSendReply(activeChat.id)} className="p-2 bg-blue-600 text-white rounded-xl">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="m-auto text-xs text-slate-400">Select a thread to review messages.</div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Floating Bottom Navigation Bar (Mobile Viewport Only) */}
      <div className="fixed bottom-3 left-4 right-4 z-40 lg:hidden flex justify-center">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl px-4 py-2 flex items-center justify-around w-full max-w-sm">
          <button
            onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
            className={`flex flex-col items-center gap-1 text-[10px] ${currentView === 'overview' ? 'text-blue-600 font-bold' : 'text-slate-500'}`}
          >
            <Layers className="w-4 h-4" />
            <span>Drops</span>
          </button>
          <button
            onClick={() => { setCurrentView('messages'); setWizardStep(1); }}
            className={`flex flex-col items-center gap-1 text-[10px] ${currentView === 'messages' ? 'text-blue-600 font-bold' : 'text-slate-500'}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Revisions</span>
          </button>
          <button
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="flex flex-col items-center gap-1 text-[10px] text-blue-600 font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>New Drop</span>
          </button>
        </div>
      </div>

    </div>
  )
}
