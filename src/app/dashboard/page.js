'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { 
  Zap, Plus, Home, FolderKanban, CreditCard, 
  BarChart3, Users, Settings, UploadCloud, CheckCircle2, 
  Lock, ArrowRight, ArrowLeft, Shield, Eye, Copy, Check, 
  Trash2, ExternalLink, Sparkles, FileText, ChevronRight,
  TrendingUp, AlertCircle, RefreshCw, FileCheck, Layers,
  ShieldCheck, Info, Menu, X, Flag, MessageSquare
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

  // 4-Step Wizard State
  const [wizardStep, setWizardStep] = useState(1)
  const [creating, setCreating] = useState(false)
  const [activeChartPoint, setActiveChartPoint] = useState(null)

  // Form Fields
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [watermarkStyle, setWatermarkStyle] = useState('grid')
  const [watermarkText, setWatermarkText] = useState('RELEASEDROP • PROTECTED PREVIEW')
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreviewLocal, setFilePreviewLocal] = useState(null)
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
        setUploadError("File exceeds 100MB direct vault upload limit.")
        return
      }
      setSelectedFile(file)
      setFilePreviewLocal(URL.createObjectURL(file))
      setUploadError(null)
    }
  }

  const uploadFileToCloudinary = (file) => {
    setUploading(true)
    setUploadProgress(10)
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
            const errDetail = res?.error?.message || `Vault error: ${xhr.status}`
            setUploadError(errDetail)
            reject(new Error(errDetail))
          }
        } catch {
          setUploadError("Handshake failure with vault gateway.")
          reject(new Error("Parse error"))
        }
      }

      xhr.onerror = () => {
        setUploading(false)
        setUploadError("Network connection interrupted.")
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
      const rawUrl = await uploadFileToCloudinary(selectedFile)
      const directDownloadUrl = rawUrl.replace('/upload/', '/upload/fl_attachment/')
      
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
        clientEmail: clientEmail.trim(),
        clientMessage: clientMessage.trim(),
        grossAmount: numAmount,
        platformFee,
        creatorPayout,
        watermarkText: watermarkText || 'RELEASEDROP • UNPAID MASTER',
        watermarkStyle: watermarkStyle || 'grid',
        status: 'Awaiting Payment',
        previewUrl: rawUrl,
        fileUrl: directDownloadUrl,
        fileName: selectedFile.name,
        fileSize: (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB",
        fileType: selectedFile.type || 'video/mp4',
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        disputeStatus: 'None',
        createdAt: serverTimestamp()
      })

      showToast("Vault deployed & escrow delivery link created!", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setSelectedFile(null)
      setFilePreviewLocal(null)
      setWizardStep(1)
      setCurrentView('overview')
      fetchDeliveries(user.uid)
    } catch (err) {
      showToast(err.message || "Failed to deploy delivery link", "error")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently revoke this escrow link? Client access will be terminated.")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      setDeliveries(prev => prev.filter(d => d.id !== id))
      showToast("Delivery link revoked", "success")
    } catch {
      showToast("Failed to delete", "error")
    }
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    showToast("Escrow link copied to clipboard!", "success")
    setTimeout(() => setCopiedId(null), 2500)
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const disputedDeliveries = deliveries.filter(d => d.disputeStatus === 'Disputed')
  const totalRevenue = paidDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const pendingAmount = pendingDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const totalViews = deliveries.reduce((acc, c) => acc + (Number(c.viewCount) || 0), 0)

  const numAmountPreview = Number(amount) || 0

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-sm gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-semibold text-slate-500">Syncing Studio Workspace...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-blue-500/20">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">ReleaseDrop Studio</h1>
        <p className="text-slate-500 text-sm mt-2 max-w-sm">
          Protected client deliverables with zero-login inspection and automated payment locks.
        </p>
        <button 
          onClick={handleGoogleLogin} 
          className="mt-6 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition"
        >
          Sign In with Google
        </button>
      </div>
    )
  }

  const userInitial = user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl bg-slate-900 text-white text-sm font-semibold border border-slate-800">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Emergent Dark Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#091122] text-slate-300 flex-col justify-between p-5 sticky top-0 h-screen z-30 border-r border-slate-800/80">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-black text-base tracking-tight text-white uppercase">ReleaseDrop</span>
          </div>

          <nav className="space-y-1.5">
            <button 
              onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                currentView === 'overview' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" /> Overview
            </button>
            <button 
              onClick={() => { setCurrentView('deliveries'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                currentView === 'deliveries' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderKanban className="w-4 h-4" /> Deliveries
              </div>
              {deliveries.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold">
                  {deliveries.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setCurrentView('create'); setWizardStep(1); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                currentView === 'create' ? 'bg-blue-600 text-white font-bold' : 'text-blue-400 hover:bg-white/5'
              }`}
            >
              <Plus className="w-4 h-4" /> New Delivery
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
              {userInitial}
            </div>
            <div className="truncate max-w-[120px]">
              <div className="text-sm font-bold text-white truncate">{user.displayName || user.email}</div>
              <div className="text-xs text-emerald-400 font-medium">Pro Escrow Core</div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-red-400 transition" title="Log Out">
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-500 font-medium">
              Studio Workspace • <strong className="text-slate-900 font-bold">{user.displayName || user.email?.split('@')[0]}</strong>
            </span>
          </div>

          <button 
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm active:scale-95 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Delivery
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          
          {/* STEP WIZARD */}
          {currentView === 'create' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <button 
                onClick={() => setCurrentView('overview')} 
                className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Overview
              </button>

              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Deploy Escrow Vault</h1>
                <p className="text-sm text-slate-500 mt-1">Upload master assets and configure zero-login client inspection.</p>
              </div>

              {/* 4 Steps Tracker */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  {[
                    { s: 1, label: "Asset File" },
                    { s: 2, label: "Details & Note" },
                    { s: 3, label: "Watermark & Due" },
                    { s: 4, label: "Deploy" }
                  ].map(({ s, label }) => {
                    const isPassed = wizardStep > s
                    const isCurrent = wizardStep === s
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isPassed ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-500/20' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : s}
                        </div>
                        <span className={`text-sm hidden sm:inline font-semibold ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(wizardStep / 4) * 100}%` }} />
                </div>
              </div>

              {/* STEP 1: ASSET FILE */}
              {wizardStep === 1 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3 text-sm text-amber-900">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Anti-Scraping Protection Active:</span> Client previews are rendered in a secure sandbox with anti-theft overlay protections to make high-resolution scraping impossible.
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 transition">
                    <UploadCloud className="w-12 h-12 text-blue-600 mb-3" />
                    <span className="text-base font-bold text-slate-900">Select Production Master Deliverable</span>
                    <span className="text-sm text-slate-400 mt-1 max-w-xs">
                      MP4, MOV, PNG, JPG, PDF, ZIP — held in encrypted escrow storage
                    </span>
                    <label className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl cursor-pointer shadow-md shadow-blue-500/20 active:scale-95 transition">
                      Browse Files
                      <input type="file" required onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.zip,.pdf" />
                    </label>
                  </div>

                  {selectedFile && (
                    <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5 truncate max-w-[240px]">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">{selectedFile.name}</span>
                      </div>
                      <span className="font-medium text-slate-500">{(selectedFile.size / (1024*1024)).toFixed(2)} MB</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setCurrentView('overview')} className="text-sm font-semibold text-slate-400">Cancel</button>
                    <button 
                      disabled={!selectedFile}
                      onClick={() => setWizardStep(2)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-md transition"
                    >
                      Next: Details & Note →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DETAILS & NOTE */}
              {wizardStep === 2 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
                  <div>
                    <label className="text-sm font-bold text-slate-800 block mb-1.5">Project Title *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 4K Commercial Color Grade — Final Cut" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-800 block mb-1.5">Client Name *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Apex Marketing Group" 
                        value={clientName} 
                        onChange={e => setClientName(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-800 block mb-1.5">Client Email (Auto-Alert)</label>
                      <input 
                        type="email" 
                        placeholder="client@apex.com" 
                        value={clientEmail} 
                        onChange={e => setClientEmail(e.target.value)} 
                        className="w-full bg-blue-50/40 border border-blue-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-semibold" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-800 flex items-center justify-between mb-1.5">
                      <span>Message / Handover Note to Client</span>
                      <span className="text-xs text-slate-400 font-normal">Optional</span>
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="e.g. Hi Team, here is the approved revision. Inspect the stream below; raw master will decrypt instantly upon settlement."
                      value={clientMessage} 
                      onChange={e => setClientMessage(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600" 
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(1)} className="text-sm font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={!title || !clientName}
                      onClick={() => setWizardStep(3)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-md transition"
                    >
                      Next: Watermark & Settlement →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: WATERMARK & DUE */}
              {wizardStep === 3 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
                  <div>
                    <label className="text-sm font-bold text-slate-800 block mb-1.5">Settlement Due from Client (₹ INR) *</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 12000" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600" 
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-800 block mb-1.5">Watermark Text</label>
                    <input 
                      type="text" 
                      value={watermarkText} 
                      onChange={e => setWatermarkText(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600" 
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-800 block">Watermark Style & Live Sandbox Preview</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setWatermarkStyle('grid')}
                        className={`p-3.5 rounded-xl border text-left transition ${
                          watermarkStyle === 'grid' ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="text-sm font-bold text-slate-900">Standard 45° Grid</div>
                        <div className="text-xs text-slate-500 mt-0.5">Repeating diagonal pattern</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWatermarkStyle('center')}
                        className={`p-3.5 rounded-xl border text-left transition ${
                          watermarkStyle === 'center' ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="text-sm font-bold text-slate-900">Bold Center Shield</div>
                        <div className="text-xs text-slate-500 mt-0.5">Prominent center lock badge</div>
                      </button>
                    </div>

                    <div className="relative aspect-video w-full rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800 select-none">
                      {filePreviewLocal && (
                        <div className="absolute inset-0 opacity-40">
                          {selectedFile?.type?.includes('video') ? (
                            <video src={filePreviewLocal} className="w-full h-full object-cover" muted autoPlay loop />
                          ) : (
                            <img src={filePreviewLocal} alt="Preview" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}
                      {watermarkStyle === 'grid' ? (
                        <div className="w-full h-full flex flex-col justify-around opacity-40 pointer-events-none transform -rotate-12">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="text-xs font-black text-white tracking-widest whitespace-nowrap flex justify-around">
                              <span>{watermarkText}</span>
                              <span>{watermarkText}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-3.5 bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 z-10">
                          <Lock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                          <div className="text-xs text-amber-300 font-bold tracking-widest uppercase">{watermarkText}</div>
                        </div>
                      )}
                      <span className="absolute bottom-2 right-2 text-xs bg-black/80 px-2.5 py-1 rounded text-slate-400 border border-slate-800">
                        Live Client Sandbox
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(2)} className="text-sm font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={!amount}
                      onClick={() => setWizardStep(4)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-md transition"
                    >
                      Next: Review & Deploy →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & DEPLOY */}
              {wizardStep === 4 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-3.5 bg-slate-50/60">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">ESCROW VAULT READY</span>
                        <h3 className="text-lg font-black text-slate-900">{title}</h3>
                      </div>
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                        ESCROW LOCKED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 text-sm">
                      <div>
                        <span className="text-slate-400 block text-xs">Client:</span>
                        <span className="font-bold text-slate-800">{clientName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs">Client Email:</span>
                        <span className="font-bold text-blue-600 truncate block">{clientEmail || 'Manual Link Share'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs">Settlement Due:</span>
                        <span className="font-bold text-slate-900">₹{numAmountPreview.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs">Watermark Style:</span>
                        <span className="font-bold text-slate-800 capitalize">{watermarkStyle}</span>
                      </div>
                    </div>

                    {clientMessage && (
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-sm">
                        <span className="text-xs font-bold text-slate-400 block mb-0.5">Attached Note:</span>
                        <p className="text-slate-700">{clientMessage}</p>
                      </div>
                    )}
                  </div>

                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-slate-600 font-medium">
                        <span>Securing master assets in escrow vault...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(3)} className="text-sm font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={creating || uploading}
                      onClick={handleFinalDeploy} 
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 active:scale-95 transition"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{creating ? 'Sealing Vault...' : 'Deploy Payment-Locked Vault'}</span>
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
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Overview</h1>
                  <p className="text-sm text-slate-500 mt-0.5">Zero-login escrow deliverables & real-time clearance.</p>
                </div>
                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm active:scale-95 transition"
                >
                  + New Drop
                </button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CLEARED PAYOUT</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
                  <span className="text-xs text-emerald-600 mt-1 block font-semibold">{paidDeliveries.length} settled drops</span>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">IN ESCROW HOLD</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">₹{pendingAmount.toLocaleString('en-IN')}</div>
                  <span className="text-xs text-amber-600 mt-1 block font-semibold">awaiting client clearance</span>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DISPUTE FLAGS</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{disputedDeliveries.length}</div>
                  <span className="text-xs text-slate-400 mt-1 block">platform mediation</span>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CLIENT VIEWS</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{totalViews}</div>
                  <span className="text-xs text-slate-400 mt-1 block">zero-login sessions</span>
                </div>
              </div>

              {/* Active Deliveries */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Active Drops</h3>
                  <button onClick={() => setCurrentView('deliveries')} className="text-sm font-bold text-blue-600 hover:underline">
                    View all ({deliveries.length})
                  </button>
                </div>

                {deliveries.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No deliveries created yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {deliveries.slice(0, 5).map(item => (
                      <div key={item.id} className="py-3.5 flex items-center justify-between text-sm gap-3">
                        <div className="truncate max-w-[200px] sm:max-w-xs">
                          <span className="font-bold text-slate-900 truncate block">{item.title}</span>
                          <span className="text-xs text-slate-400">{item.clientName} • {item.fileSize || 'Asset'}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-slate-900">₹{item.grossAmount?.toLocaleString('en-IN')}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            item.disputeStatus === 'Disputed' 
                              ? 'bg-red-50 text-red-600 border border-red-200' 
                              : item.status === 'Paid' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.disputeStatus === 'Disputed' ? 'Disputed' : item.status}
                          </span>
                          <button onClick={() => copyLink(item.id)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl">
                            {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <Link href={`/d/${item.id}`} target="_blank" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleDelete(item.id)} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl">
                            <Trash2 className="w-4 h-4" />
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
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivery Manifest</h1>
                  <p className="text-sm text-slate-500 mt-0.5">Immutable escrow vaults.</p>
                </div>
                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm"
                >
                  + New Drop
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliveries.map(item => (
                  <div key={item.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mb-1 inline-block">
                          {item.clientName}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900">{item.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{item.fileName} • {item.fileSize}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.disputeStatus === 'Disputed' ? 'bg-red-50 text-red-600 border border-red-200' : item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.disputeStatus === 'Disputed' ? 'Disputed' : item.status}
                      </span>
                    </div>

                    {item.clientMessage && (
                      <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl italic">"{item.clientMessage}"</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-sm">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase block">Invoice</span>
                        <span className="font-extrabold text-slate-900 text-base">₹{item.grossAmount?.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => copyLink(item.id)} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">
                          {copiedId === item.id ? 'Copied' : 'Share'}
                        </button>
                        <Link href={`/d/${item.id}`} target="_blank" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(item.id)} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl">
                          <Trash2 className="w-4 h-4" />
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

      {/* Mobile Slide Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex lg:hidden">
          <div className="w-72 bg-[#091122] text-slate-300 h-full p-5 flex flex-col justify-between shadow-2xl">
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10"
                >
                  <Home className="w-4 h-4" /> Overview
                </button>
                <button 
                  onClick={() => { setCurrentView('deliveries'); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  <FolderKanban className="w-4 h-4" /> Deliveries
                </button>
                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-blue-400"
                >
                  <Plus className="w-4 h-4" /> + New Delivery
                </button>
              </nav>
            </div>

            <button onClick={() => signOut(auth)} className="text-sm font-bold text-red-400 flex items-center gap-2 py-3 border-t border-slate-800">
              <X className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
