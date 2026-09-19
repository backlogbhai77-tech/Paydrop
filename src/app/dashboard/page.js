'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { 
  Zap, Plus, LayoutDashboard, FolderKanban, ShieldCheck, 
  UploadCloud, CheckCircle2, Lock, ArrowRight, ArrowLeft, 
  Copy, Check, Trash2, ExternalLink, FileArchive, Clock,
  AlertCircle, RefreshCw, X, MessageSquare, Send, Bell,
  ChevronRight, Sparkles, Filter, MoreVertical, Eye, Share2, Mail
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = "releasedrop_vault"

function formatCompactCurrency(val) {
  const num = Number(val) || 0
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`
  return `₹${num.toLocaleString('en-IN')}`
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  
  const [currentView, setCurrentView] = useState('overview')
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)

  // 4-Step Wizard
  const [wizardStep, setWizardStep] = useState(1)
  const [creating, setCreating] = useState(false)

  // Form Fields
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [expirySelection, setExpirySelection] = useState('7')
  const [watermarkText, setWatermarkText] = useState('RELEASEDROP • PROTECTED PREVIEW')
  const [brandStudioName, setBrandStudioName] = useState('')

  // Files & Progress
  const [fileList, setFileList] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  // Messaging & Inquiries
  const [selectedDeliveryChat, setSelectedDeliveryChat] = useState(null)
  const [replyText, setReplyText] = useState('')

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) {
        setBrandStudioName(currentUser.displayName ? `${currentUser.displayName} Studio` : 'Studio Workspace')
        fetchDeliveries(currentUser.uid)
      }
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

  const handleFilesAdd = (e) => {
    const selected = Array.from(e.target.files)
    if (!selected.length) return
    const totalSize = selected.reduce((acc, f) => acc + f.size, 0)
    if (totalSize > 250 * 1024 * 1024) {
      setUploadError("Total bundle size exceeds 250MB limit.")
      return
    }
    setFileList(prev => [...prev, ...selected])
    setUploadError(null)
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
              type: file.type || 'document',
              url: (res.secure_url || res.url).replace('/upload/', '/upload/fl_attachment/')
            })
          } else {
            reject(new Error(res?.error?.message || "Storage upload failure"))
          }
        } catch {
          reject(new Error("Response parse failure"))
        }
      }
      xhr.onerror = () => reject(new Error("Network connection lost"))
      xhr.send(formData)
    })
  }

  const handleFinalDeploy = async () => {
    if (!title || !amount || !fileList.length || !user) {
      showToast("Please provide Title, Amount and at least 1 File.", "error")
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
      if (expirySelection === 'never') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 10)
      } else {
        expiresAt.setDate(expiresAt.getDate() + parseInt(expirySelection || '7'))
      }

      const newDocRef = await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title: title.trim(),
        clientName: clientName.trim() || 'Client',
        clientEmail: clientEmail.trim(),
        clientMessage: clientMessage.trim(),
        grossAmount: numAmount,
        platformFee,
        creatorPayout,
        watermarkText: watermarkText || 'RELEASEDROP • PROTECTED ASSET',
        status: 'Awaiting Payment',
        files: uploadedManifest,
        primaryPreviewUrl: uploadedManifest[0]?.url.replace('/fl_attachment/', '/'),
        expiresAt: expiresAt.toISOString(),
        expiryChoice: expirySelection,
        customBrand: {
          studioName: brandStudioName || 'ReleaseDrop Workspace'
        },
        viewCount: 0,
        messages: [],
        createdAt: serverTimestamp()
      })

      // 📧 RESTORED: Automatic Client Notification Trigger
      if (clientEmail && clientEmail.trim().length > 0) {
        fetch('/api/send-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail: clientEmail.trim(),
            clientName: clientName || 'Client',
            creatorName: user.displayName || user.email?.split('@')[0] || 'Creator',
            projectTitle: title,
            amount: numAmount,
            deliveryUrl: `${window.location.origin}/d/${newDocRef.id}`
          })
        }).catch(() => {})
      }

      showToast("Vault deployed & client link ready.", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setFileList([])
      setWizardStep(1)
      setCurrentView('overview')
      fetchDeliveries(user.uid)
    } catch (err) {
      showToast(err.message || "Upload process failed", "error")
    } finally {
      setCreating(false)
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this delivery? Client access will be revoked immediately.")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      setDeliveries(prev => prev.filter(d => d.id !== id))
      showToast("Delivery revoked", "success")
    } catch {
      showToast("Failed to delete", "error")
    }
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    showToast("Portal link copied to clipboard", "success")
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleSendReminder = (item) => {
    if (!item.clientEmail) {
      showToast("No client email linked to this drop. Share link directly.", "error")
      return
    }

    fetch('/api/send-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientEmail: item.clientEmail,
        clientName: item.clientName || 'Client',
        creatorName: user.displayName || user.email?.split('@')[0] || 'Creator',
        projectTitle: item.title,
        amount: item.grossAmount,
        deliveryUrl: `${window.location.origin}/d/${item.id}`,
        isReminder: true
      })
    }).catch(() => {})

    showToast(`Payment reminder sent to ${item.clientEmail}`, "success")
  }

  const handleSendReply = async (deliveryId) => {
    if (!replyText.trim()) return
    try {
      const target = deliveries.find(d => d.id === deliveryId)
      const existing = target.messages || []
      const updated = [...existing, { sender: 'creator', text: replyText.trim(), time: new Date().toISOString() }]
      
      await updateDoc(doc(db, 'deliveries', deliveryId), { messages: updated })
      setReplyText('')
      fetchDeliveries(user.uid)
      showToast("Reply sent to client portal", "success")
    } catch {
      showToast("Failed to post message", "error")
    }
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const totalRevenue = paidDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const pendingAmount = pendingDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)

  const filteredDeliveries = deliveries.filter(d => {
    if (filterStatus === 'pending') return d.status === 'Awaiting Payment'
    if (filterStatus === 'paid') return d.status === 'Paid'
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-xs text-slate-500 gap-3 font-mono">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>AUTHENTICATING WORKSPACE...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-sm">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ReleaseDrop Workspace</h1>
        <p className="text-slate-500 text-xs mt-1 max-w-sm">
          Lock client deliverables behind automated settlement gateways. No client signup required.
        </p>
        <button 
          onClick={handleGoogleLogin} 
          className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
        >
          Sign In with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8FAFC] text-slate-900 font-sans flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-[90vw]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl bg-slate-900 text-white text-xs font-medium border border-slate-800">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900 uppercase">ReleaseDrop</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
            <button
              onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
              className={`px-3 py-1.5 rounded-lg transition ${currentView === 'overview' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'}`}
            >
              Overview
            </button>
            <button
              onClick={() => { setCurrentView('deliveries'); setWizardStep(1); }}
              className={`px-3 py-1.5 rounded-lg transition ${currentView === 'deliveries' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'}`}
            >
              Deliveries ({deliveries.length})
            </button>
            <button
              onClick={() => { setCurrentView('messages'); setWizardStep(1); }}
              className={`px-3 py-1.5 rounded-lg transition ${currentView === 'messages' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'}`}
            >
              Client Inquiries
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Delivery</span>
            <span className="sm:hidden">New</span>
          </button>

          <button
            onClick={() => signOut(auth)}
            className="text-xs font-medium text-slate-500 hover:text-rose-600 transition ml-2"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* ======================= VIEW: CREATE WIZARD ======================= */}
        {currentView === 'create' && (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Create Encrypted Delivery</h1>
                <p className="text-xs text-slate-500">Lock master deliverables behind payment verification.</p>
              </div>
              <button 
                onClick={() => setCurrentView('overview')}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                ✕ Cancel
              </button>
            </div>

            {/* Stepper Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between text-xs font-medium">
              <span className={wizardStep === 1 ? 'text-blue-600 font-semibold' : 'text-slate-400'}>1. Assets</span>
              <span className="text-slate-300">→</span>
              <span className={wizardStep === 2 ? 'text-blue-600 font-semibold' : 'text-slate-400'}>2. Details</span>
              <span className="text-slate-300">→</span>
              <span className={wizardStep === 3 ? 'text-blue-600 font-semibold' : 'text-slate-400'}>3. Pricing</span>
              <span className="text-slate-300">→</span>
              <span className={wizardStep === 4 ? 'text-blue-600 font-semibold' : 'text-slate-400'}>4. Deploy</span>
            </div>

            {/* STEP 1: Files */}
            {wizardStep === 1 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-6 text-center bg-slate-50/50 transition">
                  <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <span className="text-sm font-semibold text-slate-900 block">Select Deliverable Package</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">MP4, MOV, PNG, JPG, PDF, ZIP (Max 250MB)</span>
                  <label className="mt-3 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition">
                    Browse Files
                    <input type="file" multiple onChange={handleFilesAdd} className="hidden" />
                  </label>
                </div>

                {fileList.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700 block">Selected Items ({fileList.length}):</span>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                      {fileList.map((f, i) => (
                        <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileArchive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-medium text-slate-800 truncate max-w-[180px] sm:max-w-xs">{f.name}</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-slate-400 font-mono">{(f.size / (1024*1024)).toFixed(2)} MB</span>
                            <button onClick={() => removeFileFromList(i)} className="text-slate-400 hover:text-rose-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    disabled={!fileList.length}
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                  >
                    Continue to Details →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Details */}
            {wizardStep === 2 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Project Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Commercial 4K Master Edit"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Client Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Studio"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Client Email (For Auto-Dispatch)</label>
                    <input
                      type="email"
                      placeholder="client@acme.com"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Link Expiration</label>
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium">
                    {['7', '14', '30', 'never'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setExpirySelection(opt)}
                        className={`py-1.5 rounded-lg border transition text-center ${
                          expirySelection === opt ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt === 'never' ? 'Never' : `${opt}d`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Handover Note</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Approved master cut. Preview available below; high-res source unlocks upon settlement."
                    value={clientMessage}
                    onChange={e => setClientMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setWizardStep(1)} className="text-xs font-medium text-slate-500">← Back</button>
                  <button
                    disabled={!title || !clientName}
                    onClick={() => setWizardStep(3)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                  >
                    Pricing & Overlay →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Pricing */}
            {wizardStep === 3 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Settlement Due (₹ INR) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Watermark Overlay Text</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={e => setWatermarkText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setWizardStep(2)} className="text-xs font-medium text-slate-500">← Back</button>
                  <button
                    disabled={!amount}
                    onClick={() => setWizardStep(4)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                  >
                    Review & Deploy →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Review */}
            {wizardStep === 4 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold text-slate-900 border-b border-slate-200 pb-1.5">
                    <span className="truncate max-w-[200px]">{title}</span>
                    <span className="font-mono">{formatCompactCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Client: {clientName}</span>
                    <span>{fileList.length} files</span>
                  </div>
                  <div className="text-slate-500">
                    Expires: {expirySelection === 'never' ? 'Never' : `${expirySelection} Days`}
                  </div>
                </div>

                {uploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 font-mono">
                      <span>Uploading to Private Vault...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button disabled={creating} onClick={() => setWizardStep(3)} className="text-xs font-medium text-slate-500">← Back</button>
                  <button
                    disabled={creating || uploading}
                    onClick={handleFinalDeploy}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{creating ? 'Sealing Assets...' : 'Deploy Payment-Locked Vault'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= VIEW: OVERVIEW ======================= */}
        {currentView === 'overview' && (
          <div className="space-y-6">
            
            {/* Metric Row: Single line, strict overflow containment */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono truncate">CLEARED REVENUE</span>
                <div className="text-base sm:text-xl font-bold text-slate-900 mt-1 truncate font-mono">
                  {formatCompactCurrency(totalRevenue)}
                </div>
                <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium truncate">{paidDeliveries.length} settled</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono truncate">IN ESCROW HOLD</span>
                <div className="text-base sm:text-xl font-bold text-slate-900 mt-1 truncate font-mono">
                  {formatCompactCurrency(pendingAmount)}
                </div>
                <span className="text-[10px] text-amber-600 mt-0.5 block font-medium truncate">{pendingDeliveries.length} pending</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono truncate">ACTIVE VAULTS</span>
                <div className="text-base sm:text-xl font-bold text-slate-900 mt-1 truncate font-mono">{deliveries.length}</div>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Live portals</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono truncate">STUDIO</span>
                <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-1 truncate">{brandStudioName}</div>
                <span className="text-[10px] text-blue-600 mt-0.5 block font-medium truncate">White-label ready</span>
              </div>
            </div>

            {/* Deliveries Container */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Deliveries & Handoffs</h2>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
                  <button 
                    onClick={() => setFilterStatus('all')}
                    className={`px-2.5 py-0.5 rounded-md transition ${filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setFilterStatus('pending')}
                    className={`px-2.5 py-0.5 rounded-md transition ${filterStatus === 'pending' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}
                  >
                    Awaiting
                  </button>
                  <button 
                    onClick={() => setFilterStatus('paid')}
                    className={`px-2.5 py-0.5 rounded-md transition ${filterStatus === 'paid' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}
                  >
                    Paid
                  </button>
                </div>
              </div>

              {filteredDeliveries.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">No matching deliveries located.</div>
              ) : (
                <>
                  {/* MOBILE VIEW: Clean Self-Contained Cards (No Slip) */}
                  <div className="divide-y divide-slate-100 md:hidden">
                    {filteredDeliveries.map(item => (
                      <div key={item.id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <FileArchive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <h3 className="text-xs font-semibold text-slate-900 truncate">{item.title}</h3>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Client: <span className="text-slate-700">{item.clientName}</span>
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            item.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${item.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {item.status === 'Paid' ? 'Paid' : 'Pending'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {formatCompactCurrency(item.grossAmount)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {item.status !== 'Paid' && item.clientEmail && (
                              <button
                                onClick={() => handleSendReminder(item)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs"
                                title="Send reminder email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => copyLink(item.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-lg transition flex items-center gap-1"
                            >
                              {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                            </button>

                            <Link
                              href={`/d/${item.id}`}
                              target="_blank"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                              title="Open Portal"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 hover:text-rose-600 text-slate-400"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP VIEW: Clean Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/60 border-b border-slate-100 text-slate-400 uppercase font-mono text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5">Project Title</th>
                          <th className="px-4 py-2.5">Client</th>
                          <th className="px-4 py-2.5">Settlement</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDeliveries.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div className="flex items-center gap-2 truncate max-w-[200px]">
                                <FileArchive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">{item.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{item.clientName}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                              {formatCompactCurrency(item.grossAmount)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.status === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${item.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1.5">
                              {item.status !== 'Paid' && item.clientEmail && (
                                <button
                                  onClick={() => handleSendReminder(item)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs"
                                  title="Send reminder email"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => copyLink(item.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition"
                              >
                                {copiedId === item.id ? 'Copied' : 'Copy'}
                              </button>

                              <Link
                                href={`/d/${item.id}`}
                                target="_blank"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg inline-block text-xs transition"
                                title="Open Portal"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>

                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 hover:text-rose-600 text-slate-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ======================= VIEW: DELIVERIES MANIFEST ======================= */}
        {currentView === 'deliveries' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900">All Deliverables</h1>
                <p className="text-xs text-slate-500">Manifest of all encrypted handoff portals.</p>
              </div>
              <button 
                onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl"
              >
                + New Drop
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {deliveries.map(item => (
                <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold inline-block">
                        {item.clientName}
                      </span>
                      <h3 className="text-xs font-semibold text-slate-900 mt-1 truncate">{item.title}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Invoice</span>
                      <span className="font-bold text-slate-900 font-mono">{formatCompactCurrency(item.grossAmount)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => copyLink(item.id)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs">
                        {copiedId === item.id ? 'Copied' : 'Share'}
                      </button>
                      <Link href={`/d/${item.id}`} target="_blank" className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:text-rose-600 text-slate-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================= VIEW: INQUIRIES & MESSAGES ======================= */}
        {currentView === 'messages' && (
          <div className="space-y-4">
            <h1 className="text-lg font-bold text-slate-900">Client Inquiries & Revisions</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5 space-y-1.5">
                {deliveries.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDeliveryChat(d)}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs transition ${
                      selectedDeliveryChat?.id === d.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{d.title}</div>
                    <div className="text-slate-500 mt-0.5">Client: {d.clientName}</div>
                    <div className="text-blue-600 font-medium text-[10px] mt-1">{d.messages?.length || 0} messages</div>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[400px] shadow-sm">
                {selectedDeliveryChat ? (
                  <>
                    <div className="border-b border-slate-100 pb-2.5">
                      <h3 className="text-xs font-bold text-slate-900">{selectedDeliveryChat.title}</h3>
                      <span className="text-[11px] text-slate-400">{selectedDeliveryChat.clientName}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto py-3 space-y-2">
                      {(selectedDeliveryChat.messages || []).length === 0 ? (
                        <div className="text-center py-12 text-xs text-slate-400">No client messages or feedback yet.</div>
                      ) : (
                        selectedDeliveryChat.messages.map((m, i) => (
                          <div key={i} className={`flex flex-col ${m.sender === 'creator' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-2.5 rounded-xl text-xs max-w-sm ${
                              m.sender === 'creator' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {m.text}
                            </div>
                            <span className="text-[9px] text-slate-400 mt-0.5">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex gap-2">
                      <input 
                        type="text"
                        placeholder="Reply to client..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendReply(selectedDeliveryChat.id)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                      <button 
                        onClick={() => handleSendReply(selectedDeliveryChat.id)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="m-auto text-xs text-slate-400">Select a project to inspect client inquiries.</div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
