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
  TrendingUp, AlertCircle, RefreshCw, FileCheck
} from 'lucide-react'
import Link from 'next/link'

// EXACT CLOUDINARY CREDENTIALS FIXED
const CLOUDINARY_CLOUD_NAME = "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = "releasedrop_vault"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  
  // Navigation & View Mode
  const [currentView, setCurrentView] = useState('overview') // 'overview' | 'deliveries' | 'create'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // Multi-step Wizard State
  const [wizardStep, setWizardStep] = useState(1)
  const [creating, setCreating] = useState(false)
  
  // Form State
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [amount, setAmount] = useState('')
  const [watermarkText, setWatermarkText] = useState('UNPAID PREVIEW • CONFIDENTIAL')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

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
      setUploadError(null)
    }
  }

  // Robust Unsigned Direct Upload
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
            const errDetail = res?.error?.message || `Upload failed with status: ${xhr.status}`
            setUploadError(errDetail)
            reject(new Error(errDetail))
          }
        } catch (e) {
          setUploadError("Response parse error from Cloudinary")
          reject(new Error("Parse error"))
        }
      }

      xhr.onerror = () => {
        setUploading(false)
        setUploadError("Network error. Please check your internet connection.")
        reject(new Error("Network connection failed"))
      }

      xhr.send(formData)
    })
  }

  const handleFinalDeploy = async () => {
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
        clientEmail: clientEmail || '',
        notes: notes || '',
        grossAmount: numAmount,
        platformFee,
        creatorPayout,
        watermarkText: watermarkText || 'UNPAID PREVIEW',
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

      // Reset Wizard & Return to Overview
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
      alert("Deployment halted: " + err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Revoke this delivery link? Client access will be permanently revoked.")) return
    await deleteDoc(doc(db, 'deliveries', id))
    setDeliveries(prev => prev.filter(d => d.id !== id))
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  // Metrics
  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const totalRevenue = paidDeliveries.reduce((acc, c) => acc + (c.creatorPayout || c.grossAmount || 0), 0)
  const pendingAmount = pendingDeliveries.reduce((acc, c) => acc + (c.creatorPayout || c.grossAmount || 0), 0)
  const totalViews = deliveries.reduce((acc, c) => acc + (c.viewCount || 0), 0)

  const numAmountPreview = Number(amount) || 0
  const previewFee = Math.max(Math.round(numAmountPreview * 0.05), 50)
  const previewPayout = Math.max(numAmountPreview - previewFee, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-8 h-8 border-[2.5px] border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-semibold text-slate-500 tracking-wide">Initializing Studio Session...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-blue-500/20">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-semibold mb-3">
          <Shield className="w-3.5 h-3.5" /> ReleaseDrop Enterprise Core
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Welcome back</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-sm">
          Stop sending final files before you get paid. Automated escrow file delivery for pro creators.
        </p>
        <button 
          onClick={handleGoogleLogin} 
          className="mt-6 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition"
        >
          Sign In with Google
        </button>
      </div>
    )
  }

  const userInitial = user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex antialiased">
      
      {/* 1. Deep Navy Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#091124] text-slate-300 flex-col justify-between p-5 sticky top-0 h-screen z-30 border-r border-slate-800/60">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-black text-base tracking-tight text-white">ReleaseDrop</span>
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'deliveries' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FolderKanban className="w-4 h-4" /> Deliveries
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition">
              <CreditCard className="w-4 h-4" /> Payments
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition">
              <BarChart3 className="w-4 h-4" /> Analytics
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition">
              <Users className="w-4 h-4" /> Clients
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition">
              <Settings className="w-4 h-4" /> Settings
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {userInitial}
            </div>
            <div className="truncate max-w-[120px]">
              <div className="text-xs font-bold text-white truncate">{user.displayName || user.email}</div>
              <div className="text-[10px] text-slate-400 font-mono">Pro Creator</div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="p-1.5 text-slate-400 hover:text-red-400 transition" title="Log Out">
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Welcome back, <strong className="text-slate-900 font-bold">{user.displayName || user.email?.split('@')[0]}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setCurrentView('create'); setWizardStep(1); }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm active:scale-95 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Delivery
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
              <Bell className="w-4 h-4" />
            </button>
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {userInitial}
            </div>
          </div>
        </header>

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          
          {/* VIEW A: CREATE NEW DELIVERY WIZARD */}
          {currentView === 'create' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <button 
                onClick={() => setCurrentView('overview')} 
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
              </button>

              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Create a new delivery</h1>
                <p className="text-xs text-slate-500 mt-0.5">Encrypt and lock deliverables behind verified escrow.</p>
              </div>

              {/* Stepper Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-semibold">
                <div className={`flex items-center gap-2 ${wizardStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${wizardStep >= 1 ? 'bg-blue-600' : 'bg-slate-300'}`}>1</span>
                  <span>Files</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <div className={`flex items-center gap-2 ${wizardStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${wizardStep >= 2 ? 'bg-blue-600' : 'bg-slate-300'}`}>2</span>
                  <span>Details</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <div className={`flex items-center gap-2 ${wizardStep >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${wizardStep >= 3 ? 'bg-blue-600' : 'bg-slate-300'}`}>3</span>
                  <span>Protection</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <div className={`flex items-center gap-2 ${wizardStep >= 4 ? 'text-blue-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${wizardStep >= 4 ? 'bg-blue-600' : 'bg-slate-300'}`}>4</span>
                  <span>Review</span>
                </div>
              </div>

              {/* STEP 1: FILES */}
              {wizardStep === 1 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 transition relative">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Drop your master files here</span>
                    <span className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      MP4, MOV, PNG, JPG, PDF, ZIP — direct upload to secure media vault
                    </span>
                    <label className="mt-4 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer shadow-sm">
                      Browse Files
                      <input type="file" required onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.zip" />
                    </label>
                  </div>

                  {selectedFile && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-800 truncate max-w-[240px]">{selectedFile.name}</span>
                        <span className="text-slate-400">{(selectedFile.size / (1024*1024)).toFixed(2)} MB</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-blue-600" />
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setCurrentView('overview')} className="text-xs font-semibold text-slate-500">Cancel</button>
                    <button 
                      disabled={!selectedFile}
                      onClick={() => setWizardStep(2)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      Next: Details →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DETAILS */}
              {wizardStep === 2 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Project / Delivery Title *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Brand Campaign — Final Master 4K"
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Client Name *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Alex Creative Studio"
                        value={clientName} 
                        onChange={e => setClientName(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Client Email (Optional)</label>
                      <input 
                        type="email" 
                        placeholder="client@company.com"
                        value={clientEmail} 
                        onChange={e => setClientEmail(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Delivery Notes / Handover Instructions</label>
                    <textarea 
                      rows={3}
                      placeholder="Thanks for working with us! Master files will decrypt automatically after escrow authorization."
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white" 
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(1)} className="text-xs font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={!title || !clientName}
                      onClick={() => setWizardStep(3)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      Next: Protection & Escrow →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PROTECTION & ESCROW */}
              {wizardStep === 3 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Settlement Amount Due (₹ INR) *</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="e.g. 5000"
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white" 
                    />
                  </div>

                  {numAmountPreview > 0 && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Client Authorization:</span>
                        <span className="font-bold text-slate-900">₹{numAmountPreview.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Platform Escrow Fee (5%):</span>
                        <span>-₹{previewFee.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-blue-600 font-bold pt-2 border-t border-slate-200">
                        <span>Net Bank Payout:</span>
                        <span className="text-base">₹{previewPayout.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Anti-Theft Inspection Watermark</label>
                    <input 
                      type="text" 
                      value={watermarkText} 
                      onChange={e => setWatermarkText(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600" 
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(2)} className="text-xs font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={!amount}
                      onClick={() => setWizardStep(4)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      Next: Review & Deploy →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & DEPLOY */}
              {wizardStep === 4 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/50">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">DELIVERABLE</span>
                        <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
                      </div>
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">
                        ESCROW LOCKED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Recipient Client:</span>
                        <span className="font-bold text-slate-800">{clientName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Required Settlement:</span>
                        <span className="font-bold text-slate-900">₹{numAmountPreview.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">File:</span>
                        <span className="font-bold text-slate-800 truncate">{selectedFile?.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Payload Size:</span>
                        <span className="font-bold text-slate-800">{(selectedFile?.size / (1024*1024)).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>

                  {uploading && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Uploading deliverable to vault...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(3)} className="text-xs font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={creating || uploading}
                      onClick={handleFinalDeploy} 
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{creating ? 'Encrypting & Launching...' : 'Deploy Payment-Locked Vault'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW B: OVERVIEW DASHBOARD */}
          {currentView === 'overview' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Overview</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Your delivery and payment pulse.</p>
                </div>
                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm active:scale-95 transition"
                >
                  + New Delivery
                </button>
              </div>

              {/* 4 Metric Cards Matrix */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">REVENUE</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">{paidDeliveries.length} verified payments</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">PENDING</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">₹{pendingAmount.toLocaleString('en-IN')}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">awaiting client payment</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">PAID DELIVERIES</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{paidDeliveries.length}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">0 total</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">ACTIVE DELIVERIES</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{pendingDeliveries.length}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">{deliveries.length} active links</span>
                </div>
              </div>

              {/* High-Contrast Curved Revenue Graph */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Revenue — last 14 days</h3>
                    <p className="text-[11px] text-slate-400">Verified payments only. Demo transactions included.</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 font-mono">₹{totalRevenue} TOTAL</span>
                </div>

                {/* SVG Chart with Gradients */}
                <div className="h-44 w-full pt-4 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 600 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="revenueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <line x1="0" y1="20" x2="600" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="60" x2="600" y2="60" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="100" x2="600" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />

                    <path
                      fill="url(#revenueGrad)"
                      d={paidDeliveries.length > 0 
                        ? "M 0 115 Q 150 115, 300 70 T 600 20 L 600 115 L 0 115 Z"
                        : "M 0 115 L 600 115 L 600 115 L 0 115 Z"
                      }
                    />

                    <path
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      d={paidDeliveries.length > 0
                        ? "M 0 115 Q 150 115, 300 70 T 600 20"
                        : "M 0 115 L 600 115"
                      }
                    />
                  </svg>

                  <div className="flex justify-between text-[9px] font-mono text-slate-400 pt-3 border-t border-slate-100">
                    <span>08-31</span>
                    <span>09-02</span>
                    <span>09-04</span>
                    <span>09-06</span>
                    <span>09-08</span>
                    <span>09-10</span>
                    <span>09-12</span>
                    <span>09-13</span>
                  </div>
                </div>
              </div>

              {/* Delivery Funnel Tracker */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Delivery funnel</h3>
                  <p className="text-[11px] text-slate-400">All-time, privacy-conscious (hashed visitors).</p>
                </div>

                <div className="space-y-3 pt-1 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Delivery views</span>
                      <span className="font-bold text-slate-900 font-mono">{totalViews}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: totalViews > 0 ? '100%' : '0%' }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Preview views</span>
                      <span className="font-bold text-slate-900 font-mono">{totalViews}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: totalViews > 0 ? '85%' : '0%' }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Payment attempts</span>
                      <span className="font-bold text-slate-900 font-mono">{paidDeliveries.length}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: paidDeliveries.length > 0 ? '60%' : '0%' }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Successful payments</span>
                      <span className="font-bold text-slate-900 font-mono">{paidDeliveries.length}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: paidDeliveries.length > 0 ? '60%' : '0%' }} />
                    </div>
                  </div>

                  <div className="pt-2 text-[10px] font-mono text-slate-400">
                    Conversion: <span className="font-bold text-slate-800">{totalViews > 0 ? Math.round((paidDeliveries.length / totalViews) * 100) : 0}%</span>
                  </div>
                </div>
              </div>

              {/* Recent Deliveries */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">Recent deliveries</h3>
                  <button onClick={() => setCurrentView('deliveries')} className="text-xs font-bold text-blue-600 hover:underline">
                    View all
                  </button>
                </div>

                {deliveries.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="text-3xl">📦</div>
                    <h4 className="text-xs font-bold text-slate-800">No deliveries yet</h4>
                    <p className="text-[11px] text-slate-400">Your protected deliveries will appear here.</p>
                    <button 
                      onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                      className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                    >
                      Create Your First Delivery
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {deliveries.slice(0, 5).map(item => (
                      <div key={item.id} className="py-3.5 flex items-center justify-between text-xs gap-3">
                        <div className="truncate max-w-[200px] sm:max-w-xs">
                          <span className="font-bold text-slate-900 truncate block">{item.title}</span>
                          <span className="text-[10px] text-slate-400">{item.clientName} • {item.fileSize || ''}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 font-mono">₹{item.grossAmount?.toLocaleString('en-IN')}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {item.status}
                          </span>
                          <button onClick={() => copyLink(item.id)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg">
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW C: FULL DELIVERIES LIST */}
          {currentView === 'deliveries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Deliveries</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Manage all your payment-locked assets.</p>
                </div>
                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  + New Delivery
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliveries.map(item => (
                  <div key={item.id} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mb-1 inline-block">
                          {item.clientName}
                        </span>
                        <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{item.fileName || 'Master File'} • {item.fileSize}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block font-mono">Payout</span>
                        <span className="font-extrabold text-slate-900 text-sm font-mono">₹{item.grossAmount?.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => copyLink(item.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition flex items-center gap-1"
                        >
                          {copiedId === item.id ? 'Copied' : 'Share'}
                        </button>
                        <Link 
                          href={`/d/${item.id}`} 
                          target="_blank" 
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition"
                        >
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

      {/* 3. Mobile Slide-out Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex lg:hidden">
          <div className="w-72 bg-[#091124] text-slate-300 h-full p-5 flex flex-col justify-between shadow-2xl">
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

              <nav className="space-y-1">
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" /> + New Delivery
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
