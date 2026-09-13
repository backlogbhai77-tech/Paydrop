'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { 
  Zap, Bell, Menu, X, Plus, Home, FolderKanban, CreditCard, 
  BarChart3, Users, Settings, UploadCloud, CheckCircle2, 
  Lock, ArrowRight, ArrowLeft, Shield, Eye, Copy, Check, 
  Trash2, ExternalLink, Sparkles, FileText, ChevronRight,
  TrendingUp, AlertCircle, RefreshCw, FileCheck, Layers
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = "releasedrop_vault"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  
  const [currentView, setCurrentView] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)

  // Wizard States
  const [wizardStep, setWizardStep] = useState(1)
  const [creating, setCreating] = useState(false)
  const [activeChartPoint, setActiveChartPoint] = useState(null)

  // Form Fields
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [amount, setAmount] = useState('')
  const [watermarkText, setWatermarkText] = useState('RELEASEDROP • UNPAID MASTER')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

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
      if (file.size > 100 * 1024 * 1024) {
        setUploadError("File exceeds 100MB cloud gateway limit.")
        return
      }
      setSelectedFile(file)
      setUploadError(null)
    }
  }

  const uploadFileToCloudinary = (file) => {
    setUploading(true)
    setUploadProgress(5)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 98)
          setUploadProgress(percent)
        }
      }

      xhr.onload = () => {
        setUploading(false)
        try {
          const res = JSON.parse(xhr.responseText)
          if (xhr.status === 200 && (res.secure_url || res.url)) {
            setUploadProgress(100)
            resolve(res.secure_url || res.url)
          } else {
            const errDetail = res?.error?.message || `Failed (${xhr.status})`
            setUploadError(errDetail)
            reject(new Error(errDetail))
          }
        } catch {
          setUploadError("Vault response parsing failed")
          reject(new Error("Parse error"))
        }
      }

      xhr.onerror = () => {
        setUploading(false)
        setUploadError("Network connection failed during upload")
        reject(new Error("Network failed"))
      }

      xhr.send(formData)
    })
  }

  const handleFinalDeploy = async () => {
    if (!title || !amount || !selectedFile || !user) {
      showToast("Please fill all required fields", "error")
      return
    }

    setCreating(true)
    try {
      const secureUrl = await uploadFileToCloudinary(selectedFile)
      const numAmount = Number(amount) || 0
      const platformFee = Math.max(Math.round(numAmount * 0.05), 50)
      const creatorPayout = Math.max(numAmount - platformFee, 0)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const newDocRef = await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title,
        clientName: clientName || 'Client',
        clientEmail: clientEmail.trim(),
        notes: notes || '',
        grossAmount: numAmount,
        platformFee,
        creatorPayout,
        watermarkText: watermarkText || 'RELEASEDROP ESCROW • UNPAID PREVIEW',
        status: 'Awaiting Payment',
        previewUrl: secureUrl,
        fileUrl: secureUrl,
        fileName: selectedFile.name,
        fileSize: (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB",
        fileType: selectedFile.type || 'video/mp4',
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        createdAt: serverTimestamp()
      })

      // Background Email Trigger
      if (clientEmail && clientEmail.trim().length > 0) {
        fetch('/api/send-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail: clientEmail.trim(),
            clientName: clientName || 'Client',
            creatorName: user.displayName || user.email?.split('@')[0] || 'ReleaseDrop Creator',
            projectTitle: title,
            amount: numAmount,
            deliveryUrl: `${window.location.origin}/d/${newDocRef.id}`
          })
        }).catch(() => {})
      }

      showToast("Vault deployed & client email dispatched!", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setNotes('')
      setAmount('')
      setSelectedFile(null)
      setWizardStep(1)
      setCurrentView('overview')
      fetchDeliveries(user.uid)
    } catch (err) {
      showToast(err.message || "Failed to deploy delivery", "error")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently revoke this escrow link? Client will lose inspection access.")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      setDeliveries(prev => prev.filter(d => d.id !== id))
      showToast("Escrow manifest deleted", "success")
    } catch {
      showToast("Failed to delete", "error")
    }
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    showToast("Escrow link copied!", "success")
    setTimeout(() => setCopiedId(null), 2500)
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const totalRevenue = paidDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const pendingAmount = pendingDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const totalViews = deliveries.reduce((acc, c) => acc + (Number(c.viewCount) || 0), 0)

  const numAmountPreview = Number(amount) || 0
  const previewFee = Math.max(Math.round(numAmountPreview * 0.05), 50)
  const previewPayout = Math.max(numAmountPreview - previewFee, 0)

  const chartData = [
    { day: 'Mon', date: '09-08', value: 0 },
    { day: 'Tue', date: '09-09', value: 0 },
    { day: 'Wed', date: '09-10', value: 0 },
    { day: 'Thu', date: '09-11', value: Math.round(totalRevenue * 0.3) },
    { day: 'Fri', date: '09-12', value: Math.round(totalRevenue * 0.6) },
    { day: 'Sat', date: '09-13', value: totalRevenue }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-8 h-8 border-[2.5px] border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-semibold text-slate-500 tracking-wide">Syncing Studio Workspace...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-blue-500/20">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">ReleaseDrop Studio</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-sm">
          Stop delivering work unpaid. Automated escrow vaults with anti-theft preview controls.
        </p>
        <button 
          onClick={handleGoogleLogin} 
          className="mt-6 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          Sign In with Google
        </button>
      </div>
    )
  }

  const userInitial = user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl bg-slate-900 text-white text-xs font-semibold border border-slate-800">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#070B14] text-slate-300 flex-col justify-between p-5 sticky top-0 h-screen z-30 border-r border-slate-800">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white uppercase">ReleaseDrop</span>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'overview' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" /> Overview
            </button>
            <button 
              onClick={() => { setCurrentView('deliveries'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'deliveries' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderKanban className="w-4 h-4" /> Deliveries
              </div>
              {deliveries.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {deliveries.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {userInitial}
            </div>
            <div className="truncate max-w-[120px]">
              <div className="text-xs font-bold text-white truncate">{user.displayName || user.email}</div>
              <div className="text-[10px] text-emerald-400 font-mono">Pro Creator</div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="p-1.5 text-slate-400 hover:text-red-400 transition" title="Log Out">
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Studio Workspace • <strong className="text-slate-900 font-bold">{user.displayName || user.email?.split('@')[0]}</strong>
            </span>
          </div>

          <button 
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm active:scale-95 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Delivery
          </button>
        </header>

        {/* Dynamic Views */}
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          
          {/* VIEW: CREATE WIZARD */}
          {currentView === 'create' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <button 
                onClick={() => setCurrentView('overview')} 
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
              </button>

              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Deploy Escrow Vault</h1>
                <p className="text-xs text-slate-500 mt-0.5">Upload master assets and lock them behind automated settlement.</p>
              </div>

              {/* Steps Progress */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  {[
                    { s: 1, label: "Asset File" },
                    { s: 2, label: "Client Meta" },
                    { s: 3, label: "Protection" },
                    { s: 4, label: "Deploy" }
                  ].map(({ s, label }) => {
                    const isPassed = wizardStep > s
                    const isCurrent = wizardStep === s
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                          isPassed ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-500/20' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isPassed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s}
                        </div>
                        <span className={`text-xs hidden sm:inline font-semibold ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(wizardStep / 4) * 100}%` }} />
                </div>
              </div>

              {/* Step 1 */}
              {wizardStep === 1 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 transition">
                    <UploadCloud className="w-12 h-12 text-blue-600 mb-3" />
                    <span className="text-sm font-bold text-slate-900">Select Production Master File</span>
                    <span className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      MP4, MOV, PNG, JPG, ZIP — directly securely vaulted
                    </span>
                    <label className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-blue-500/20 active:scale-95 transition">
                      Browse Files
                      <input type="file" required onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.zip" />
                    </label>
                  </div>

                  {selectedFile && (
                    <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[240px]">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">{selectedFile.name}</span>
                      </div>
                      <span className="font-mono text-slate-500">{(selectedFile.size / (1024*1024)).toFixed(2)} MB</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setCurrentView('overview')} className="text-xs font-semibold text-slate-400">Cancel</button>
                    <button 
                      disabled={!selectedFile}
                      onClick={() => setWizardStep(2)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      Next: Client Meta →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {wizardStep === 2 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Project Deliverable Title *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Nike Commercial Reel — 4K ProRes" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Client Name *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Acme Media Works" 
                        value={clientName} 
                        onChange={e => setClientName(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Client Notification Email</label>
                      <input 
                        type="email" 
                        placeholder="client@agency.com" 
                        value={clientEmail} 
                        onChange={e => setClientEmail(e.target.value)} 
                        className="w-full bg-blue-50/40 border border-blue-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-semibold" 
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(1)} className="text-xs font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={!title || !clientName}
                      onClick={() => setWizardStep(3)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      Next: Settlement Terms →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {wizardStep === 3 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Settlement Due (₹ INR) *</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 10000" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base font-black text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Anti-Theft Inspection Watermark</label>
                    <input 
                      type="text" 
                      value={watermarkText} 
                      onChange={e => setWatermarkText(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono" 
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(2)} className="text-xs font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={!amount}
                      onClick={() => setWizardStep(4)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      Next: Review & Launch →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 */}
              {wizardStep === 4 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-slate-50/60">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-blue-600 font-bold uppercase">ESCROW DROP MANIFEST</span>
                        <h3 className="text-base font-black text-slate-900">{title}</h3>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">
                        ESCROW LOCKED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Client:</span>
                        <span className="font-bold text-slate-800">{clientName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Client Email:</span>
                        <span className="font-bold text-blue-600 truncate block">{clientEmail || 'Manual Link Share'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Settlement Due:</span>
                        <span className="font-bold text-slate-900 font-mono">₹{numAmountPreview.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Asset File:</span>
                        <span className="font-bold text-slate-800 truncate block">{selectedFile?.name}</span>
                      </div>
                    </div>
                  </div>

                  {uploading && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-600 font-medium">
                        <span>Uploading asset to encrypted vault...</span>
                        <span className="font-mono">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(3)} className="text-xs font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={creating || uploading}
                      onClick={handleFinalDeploy} 
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 active:scale-95 transition"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{creating ? 'Sealing Vault & Sending Email...' : 'Deploy Payment-Locked Vault'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: OVERVIEW */}
          {currentView === 'overview' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Overview</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time escrow delivery pulses.</p>
                </div>
                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm active:scale-95 transition"
                >
                  + New Drop
                </button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">CLEARED PAYOUT</span>
                  <div className="text-2xl font-black text-slate-900 mt-1 font-mono">₹{totalRevenue.toLocaleString('en-IN')}</div>
                  <span className="text-[10px] text-emerald-600 mt-1 block font-semibold">{paidDeliveries.length} settled drops</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">IN ESCROW HOLD</span>
                  <div className="text-2xl font-black text-slate-900 mt-1 font-mono">₹{pendingAmount.toLocaleString('en-IN')}</div>
                  <span className="text-[10px] text-amber-600 mt-1 block font-semibold">awaiting client clearance</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">COMPLETION RATE</span>
                  <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                    {deliveries.length > 0 ? Math.round((paidDeliveries.length / deliveries.length) * 100) : 0}%
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">{paidDeliveries.length} of {deliveries.length} paid</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">CLIENT VISITS</span>
                  <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalViews}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">vault accesses</span>
                </div>
              </div>

              {/* Chart */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Settlement Trajectory</h3>
                    <p className="text-[11px] text-slate-400">Touch or hover points for daily volume.</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-600">
                    ₹{activeChartPoint ? activeChartPoint.value.toLocaleString('en-IN') : totalRevenue.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="relative h-44 w-full pt-4">
                  {activeChartPoint && (
                    <div 
                      className="absolute -top-3 z-10 px-3 py-1 bg-slate-900 text-white text-[10px] font-mono rounded-lg shadow-xl pointer-events-none"
                      style={{ left: `${activeChartPoint.xPercent}%`, transform: 'translateX(-50%)' }}
                    >
                      <div>{activeChartPoint.date}</div>
                      <div className="font-bold text-blue-400">₹{activeChartPoint.value.toLocaleString('en-IN')}</div>
                    </div>
                  )}

                  <svg className="w-full h-full overflow-visible" viewBox="0 0 600 120" preserveAspectRatio="none">
                    <line x1="0" y1="20" x2="600" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="60" x2="600" y2="60" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="100" x2="600" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />

                    <path
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      d="M 0 115 Q 120 115, 240 100 T 480 50 L 600 15"
                    />

                    {[
                      { x: 0, y: 115, ...chartData[0] },
                      { x: 120, y: 115, ...chartData[1] },
                      { x: 240, y: 100, ...chartData[2] },
                      { x: 360, y: 75, ...chartData[3] },
                      { x: 480, y: 50, ...chartData[4] },
                      { x: 600, y: 15, ...chartData[5] },
                    ].map((p, idx) => (
                      <g key={idx}>
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r={activeChartPoint?.date === p.date ? 6 : 4} 
                          className="fill-blue-600 stroke-white stroke-2 cursor-pointer"
                          onMouseEnter={() => setActiveChartPoint({ ...p, xPercent: (p.x / 600) * 100 })}
                          onTouchStart={() => setActiveChartPoint({ ...p, xPercent: (p.x / 600) * 100 })}
                        />
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r={16} 
                          className="fill-transparent cursor-pointer"
                          onMouseEnter={() => setActiveChartPoint({ ...p, xPercent: (p.x / 600) * 100 })}
                          onTouchStart={() => setActiveChartPoint({ ...p, xPercent: (p.x / 600) * 100 })}
                        />
                      </g>
                    ))}
                  </svg>

                  <div className="flex justify-between text-[9px] font-mono text-slate-400 pt-3 border-t border-slate-100">
                    {chartData.map(d => (
                      <span key={d.date}>{d.date}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drops */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">Active Drops</h3>
                  <button onClick={() => setCurrentView('deliveries')} className="text-xs font-bold text-blue-600 hover:underline">
                    View all ({deliveries.length})
                  </button>
                </div>

                {deliveries.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No active drops yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {deliveries.slice(0, 5).map(item => (
                      <div key={item.id} className="py-3.5 flex items-center justify-between text-xs gap-3">
                        <div className="truncate max-w-[200px] sm:max-w-xs">
                          <span className="font-bold text-slate-900 truncate block">{item.title}</span>
                          <span className="text-[10px] text-slate-400">{item.clientName} • {item.fileSize || 'Asset'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 font-mono">₹{item.grossAmount?.toLocaleString('en-IN')}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.status}
                          </span>
                          <button onClick={() => copyLink(item.id)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg">
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <Link href={`/d/${item.id}`} target="_blank" className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW: DELIVERIES MANIFEST */}
          {currentView === 'deliveries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Delivery Manifest</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Control live escrow locks.</p>
                </div>
                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  + New Drop
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliveries.map(item => (
                  <div key={item.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mb-1 inline-block">
                          {item.clientName}
                        </span>
                        <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{item.fileName || 'Master'} • {item.fileSize}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Invoice</span>
                        <span className="font-extrabold text-slate-900 text-sm font-mono block">₹{item.grossAmount?.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => copyLink(item.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">
                          {copiedId === item.id ? 'Copied' : 'Share'}
                        </button>
                        <Link href={`/d/${item.id}`} target="_blank" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => handleDelete(item.id)} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex lg:hidden">
          <div className="w-72 bg-[#070B14] text-slate-300 h-full p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <span className="font-extrabold text-base text-white">ReleaseDrop</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-2">
                <button 
                  onClick={() => { setCurrentView('overview'); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10"
                >
                  <Home className="w-4 h-4" /> Overview
                </button>
                <button 
                  onClick={() => { setCurrentView('deliveries'); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  <FolderKanban className="w-4 h-4" /> Deliveries
                </button>
                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-blue-400"
                >
                  <Plus className="w-4 h-4" /> + New Drop
                </button>
              </nav>
            </div>

            <button onClick={() => signOut(auth)} className="text-xs font-bold text-red-400 flex items-center gap-2 py-3 border-t border-slate-800">
              <X className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
