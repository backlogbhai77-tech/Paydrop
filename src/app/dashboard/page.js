'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { 
  Zap, Plus, Home, FolderKanban, CreditCard, 
  Settings, UploadCloud, CheckCircle2, Lock, 
  ArrowRight, ArrowLeft, Shield, Eye, Copy, Check, 
  Trash2, ExternalLink, FileText, Clock,
  AlertCircle, RefreshCw, Layers, ShieldCheck, 
  Info, Menu, X, Flag, MessageSquare, Send, Bell,
  Sparkles, Truck, FileArchive
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = "releasedrop_vault"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  
  const [currentView, setCurrentView] = useState('overview') // overview | deliveries | create | messages | branding
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)

  // 4-Step Creation Wizard
  const [wizardStep, setWizardStep] = useState(1)
  const [creating, setCreating] = useState(false)
  const [dispatchAnim, setDispatchAnim] = useState(false)

  // Form Fields (Multi-File + Custom Branding)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [expirySelection, setExpirySelection] = useState('7')
  const [watermarkText, setWatermarkText] = useState('RELEASEDROP • PROTECTED PREVIEW')
  const [watermarkType, setWatermarkType] = useState('full') // 'full' | 'email' | 'custom'
  
  // Custom Branding
  const [brandStudioName, setBrandStudioName] = useState('Creative Studio')
  const [brandThankYou, setBrandThankYou] = useState('Thank you for your business! Your master production package is unlocked below.')
  const [brandLogoUrl, setBrandLogoUrl] = useState('')

  // Multi-File Upload Queue
  const [fileList, setFileList] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  // Revision & Message Tab state
  const [selectedDeliveryChat, setSelectedDeliveryChat] = useState(null)
  const [replyText, setReplyText] = useState('')

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) {
        setBrandStudioName(currentUser.displayName ? `${currentUser.displayName} Studio` : 'Apex Studio')
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

  // Multi-File Collector
  const handleFilesAdd = (e) => {
    const selected = Array.from(e.target.files)
    if (!selected.length) return
    
    // Check total limit
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
            reject(new Error(res?.error?.message || "Vault upload error"))
          }
        } catch {
          reject(new Error("Parse failure"))
        }
      }
      xhr.onerror = () => reject(new Error("Network failed"))
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
    setDispatchAnim(true)

    try {
      const uploadedManifest = []
      for (let i = 0; i < fileList.length; i++) {
        setUploadProgress(Math.round(((i) / fileList.length) * 100))
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

      const effectiveWatermark = watermarkType === 'email' && clientEmail 
        ? `PREVIEW FOR ${clientEmail.toUpperCase()} • DO NOT DISTRIBUTE`
        : watermarkText

      const newDocRef = await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title,
        clientName: clientName || 'Client',
        clientEmail: clientEmail.trim(),
        clientMessage: clientMessage.trim(),
        grossAmount: numAmount,
        platformFee,
        creatorPayout,
        watermarkText: effectiveWatermark,
        status: 'Awaiting Payment',
        files: uploadedManifest,
        primaryPreviewUrl: uploadedManifest[0]?.url.replace('/fl_attachment/', '/'),
        expiresAt: expiresAt.toISOString(),
        expiryChoice: expirySelection,
        customBrand: {
          studioName: brandStudioName,
          thankYouMessage: brandThankYou,
          logoUrl: brandLogoUrl
        },
        viewCount: 0,
        timeline: [
          { step: 'Work Uploaded', time: new Date().toISOString(), done: true },
          { step: 'Client Notified', time: clientEmail ? new Date().toISOString() : null, done: !!clientEmail },
          { step: 'Awaiting Approval', time: null, done: false },
          { step: 'Payment Cleared', time: null, done: false },
          { step: 'Download Unlocked', time: null, done: false }
        ],
        messages: [],
        disputeStatus: 'None',
        createdAt: serverTimestamp()
      })

      showToast("Vault Sealed! 🚚 Deliverable dispatched.", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setFileList([])
      setWizardStep(1)
      setDispatchAnim(false)
      setCurrentView('overview')
      fetchDeliveries(user.uid)
    } catch (err) {
      showToast(err.message || "Upload interrupted", "error")
      setDispatchAnim(false)
    } finally {
      setCreating(false)
      setUploading(false)
    }
  }

  const handleSendReminder = (item) => {
    if (!item.clientEmail) {
      showToast("No client email saved for this delivery. Share link directly!", "error")
      return
    }
    showToast(`Friendly payment reminder dispatched to ${item.clientEmail}!`, "success")
  }

  const handleSendReply = async (deliveryId) => {
    if (!replyText.trim()) return
    try {
      const target = deliveries.find(d => d.id === deliveryId)
      const existing = target.messages || []
      const updated = [...existing, { sender: 'creator', text: replyText.trim(), time: new Date().toISOString() }]
      
      await updateDoc(doc(db, 'deliveries', deliveryId), {
        messages: updated
      })
      setReplyText('')
      fetchDeliveries(user.uid)
      showToast("Reply sent to client portal", "success")
    } catch {
      showToast("Failed to post message", "error")
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this escrow link?")) return
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
    showToast("Share link copied to clipboard!", "success")
    setTimeout(() => setCopiedId(null), 2500)
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const totalRevenue = paidDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const pendingAmount = pendingDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const unreadMessagesCount = deliveries.reduce((acc, c) => acc + (c.messages?.filter(m => m.sender === 'client').length || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B11] flex flex-col items-center justify-center text-sm gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Mounting ReleaseDrop Studio...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080B11] flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-xl shadow-blue-600/30">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">ReleaseDrop Studio</h1>
        <p className="text-slate-400 text-sm mt-2 max-w-sm">
          Deliver client work safely. Locked previews, automated settlement, zero ghosting.
        </p>
        <button 
          onClick={handleGoogleLogin} 
          className="mt-6 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition active:scale-95"
        >
          Sign In with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#080B11] text-slate-100 font-sans flex antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-[90vw]">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl bg-[#0F1626] text-white text-xs sm:text-sm font-semibold border border-blue-500/30 backdrop-blur-xl">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0A0E17] text-slate-300 flex-col justify-between p-5 sticky top-0 h-screen z-30 border-r border-slate-800/80">
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
                currentView === 'overview' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" /> Overview
            </button>
            
            <button 
              onClick={() => { setCurrentView('deliveries'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                currentView === 'deliveries' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
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
              onClick={() => { setCurrentView('messages'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                currentView === 'messages' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" /> Client Messages
              </div>
              {unreadMessagesCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setCurrentView('branding'); setWizardStep(1); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                currentView === 'branding' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" /> Studio Branding
            </button>

            <button 
              onClick={() => { setCurrentView('create'); setWizardStep(1); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition mt-4"
            >
              <Plus className="w-4 h-4" /> New Delivery
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 flex items-center justify-between px-2">
          <div className="truncate max-w-[140px]">
            <div className="text-sm font-bold text-white truncate">{user.displayName || user.email}</div>
            <div className="text-[11px] text-blue-400 font-mono font-medium">{brandStudioName}</div>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-rose-400 transition" title="Log Out">
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="h-16 bg-[#0A0E17]/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs sm:text-sm text-slate-400 font-medium truncate">
              {brandStudioName} • <strong className="text-white font-bold">{user.displayName || user.email?.split('@')[0]}</strong>
            </span>
          </div>

          <button 
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> <span>New Delivery</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          
          {/* ===================== VIEW: CREATE (4-STEP WIZARD) ===================== */}
          {currentView === 'create' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <button 
                onClick={() => setCurrentView('overview')} 
                className="text-xs sm:text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </button>

              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Deploy Escrow Vault</h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Bundle multi-file deliverables with automated anti-leak watermark inspection.</p>
              </div>

              {/* Progress Indicator */}
              <div className="bg-[#0F1422] border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className={wizardStep === 1 ? 'text-blue-400 font-bold' : ''}>1. Files</span>
                  <span className={wizardStep === 2 ? 'text-blue-400 font-bold' : ''}>2. Details</span>
                  <span className={wizardStep === 3 ? 'text-blue-400 font-bold' : ''}>3. Watermark & Pay</span>
                  <span className={wizardStep === 4 ? 'text-blue-400 font-bold' : ''}>4. Dispatch</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(wizardStep / 4) * 100}%` }} />
                </div>
              </div>

              {/* STEP 1: MULTI-FILE UPLOAD ZONE */}
              {wizardStep === 1 && (
                <div className="bg-[#0F1422] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
                  {/* Liquid Wave Animated Zone */}
                  <div className="border-2 border-dashed border-blue-500/40 hover:border-blue-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-blue-950/10 transition relative overflow-hidden group animate-liquid-wave">
                    <UploadCloud className="w-12 h-12 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-base font-bold text-white">Select Single or Multiple Deliverables</span>
                    <span className="text-xs text-slate-400 mt-1 max-w-sm">
                      Upload project assets (MP4, ZIP, FIG, PNG, PDF, PSD). All grouped into one clean client handoff portal.
                    </span>

                    <label className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl cursor-pointer shadow-lg shadow-blue-600/30 active:scale-95 transition">
                      Add Files
                      <input type="file" multiple onChange={handleFilesAdd} className="hidden" />
                    </label>
                  </div>

                  {/* Selected Files Manifest */}
                  {fileList.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Selected Bundle ({fileList.length} files):</span>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-black/30">
                        {fileList.map((f, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate max-w-[240px]">
                              <FileArchive className="w-4 h-4 text-blue-400 shrink-0" />
                              <span className="text-slate-200 truncate">{f.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500 font-mono">{(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                              <button onClick={() => removeFileFromList(idx)} className="text-slate-500 hover:text-rose-400">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setCurrentView('overview')} className="text-xs font-semibold text-slate-500">Cancel</button>
                    <button 
                      disabled={!fileList.length}
                      onClick={() => setWizardStep(2)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition"
                    >
                      Next: Details & Notes →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DETAILS & EXPIRATION */}
              {wizardStep === 2 && (
                <div className="bg-[#0F1422] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Project / Deliverable Title *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Website Overhaul & Brand Assets v2" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Client Name *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Acme Agency" 
                        value={clientName} 
                        onChange={e => setClientName(e.target.value)} 
                        className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Client Email (For Link & Reminders)</label>
                      <input 
                        type="email" 
                        placeholder="client@acme.com" 
                        value={clientEmail} 
                        onChange={e => setClientEmail(e.target.value)} 
                        className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 font-mono" 
                      />
                    </div>
                  </div>

                  {/* Expiration Configuration */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Link Expiration Period</label>
                    <div className="grid grid-cols-4 gap-2 text-xs font-medium">
                      {['7', '14', '30', 'never'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setExpirySelection(opt)}
                          className={`py-2 rounded-xl border transition uppercase ${
                            expirySelection === opt ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold' : 'border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {opt === 'never' ? 'Never' : `${opt} Days`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Handover Note / Instructions to Client</label>
                    <textarea 
                      rows={3}
                      placeholder="Hi team, here is the approved design bundle. You can inspect drafts below; original assets unlock immediately upon settlement."
                      value={clientMessage} 
                      onChange={e => setClientMessage(e.target.value)} 
                      className="w-full bg-black/40 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(1)} className="text-xs font-semibold text-slate-400">← Back</button>
                    <button 
                      disabled={!title || !clientName}
                      onClick={() => setWizardStep(3)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition"
                    >
                      Next: Watermark & Settlement →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: WATERMARK & PRICING */}
              {wizardStep === 3 && (
                <div className="bg-[#0F1422] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Total Settlement Due (₹ INR) *</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 15000" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-xl font-bold font-mono text-emerald-400 focus:outline-none focus:border-blue-500" 
                    />
                  </div>

                  {/* Watermark Generation Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">Automatic Preview Watermark Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <button
                        type="button"
                        onClick={() => { setWatermarkType('full'); setWatermarkText('PREVIEW ONLY • UNPAID ASSET'); }}
                        className={`p-3 rounded-xl border text-left transition ${
                          watermarkType === 'full' ? 'bg-blue-600/20 border-blue-500 text-white font-bold' : 'border-slate-800 text-slate-400'
                        }`}
                      >
                        <div>Standard Preview</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">PREVIEW ONLY</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setWatermarkType('email'); }}
                        className={`p-3 rounded-xl border text-left transition ${
                          watermarkType === 'email' ? 'bg-blue-600/20 border-blue-500 text-white font-bold' : 'border-slate-800 text-slate-400'
                        }`}
                      >
                        <div>Client Email Overlay</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Stops screenshots & leaks</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setWatermarkType('custom'); setWatermarkText(`${brandStudioName} • DRAFT`); }}
                        className={`p-3 rounded-xl border text-left transition ${
                          watermarkType === 'custom' ? 'bg-blue-600/20 border-blue-500 text-white font-bold' : 'border-slate-800 text-slate-400'
                        }`}
                      >
                        <div>Brand / Studio Tag</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Your studio signature</div>
                      </button>
                    </div>

                    <input 
                      type="text" 
                      value={watermarkText} 
                      onChange={e => setWatermarkText(e.target.value)} 
                      className="w-full bg-black/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 mt-2" 
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(2)} className="text-xs font-semibold text-slate-400">← Back</button>
                    <button 
                      disabled={!amount}
                      onClick={() => setWizardStep(4)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition"
                    >
                      Next: Review & Dispatch →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & DISPATCH */}
              {wizardStep === 4 && (
                <div className="bg-[#0F1422] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
                  <div className="border border-slate-800 rounded-xl p-5 bg-black/30 space-y-3">
                    <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] text-blue-400 font-mono uppercase font-bold">READY TO DEPLOY</span>
                        <h3 className="text-lg font-black text-white">{title}</h3>
                      </div>
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-mono font-bold">
                        ESCROW LOCKED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                      <div>Client: <strong className="text-white">{clientName}</strong></div>
                      <div>Files: <strong className="text-white">{fileList.length} assets bundled</strong></div>
                      <div>Settlement Due: <strong className="text-emerald-400 font-mono text-sm">₹{Number(amount).toLocaleString('en-IN')}</strong></div>
                      <div>Expires: <strong className="text-slate-300">{expirySelection === 'never' ? 'Never' : `${expirySelection} Days`}</strong></div>
                    </div>
                  </div>

                  {/* Delivery Truck 🚚 Dispatching Animation */}
                  {dispatchAnim && (
                    <div className="p-6 bg-blue-600/10 border border-blue-500/30 rounded-2xl text-center space-y-3 overflow-hidden">
                      <div className="flex items-center justify-center text-3xl animate-dispatch">
                        🚚 📦 💨
                      </div>
                      <span className="text-xs font-mono text-blue-300 font-bold block">
                        Sealing Vault & Delivering to Client Link... ({uploadProgress}%)
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button disabled={creating} onClick={() => setWizardStep(3)} className="text-xs font-semibold text-slate-400">← Back</button>
                    <button 
                      disabled={creating || uploading}
                      onClick={handleFinalDeploy} 
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xl shadow-blue-600/30 flex items-center gap-2 active:scale-95 transition"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{creating ? 'Sealing Assets...' : 'Deploy Payment-Locked Vault'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== VIEW: OVERVIEW ===================== */}
          {currentView === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight">Studio Overview</h1>
                  <p className="text-xs sm:text-sm text-slate-400">Zero-login escrow deliverables and verified payouts.</p>
                </div>
                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition"
                >
                  + New Drop
                </button>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">CLEARED PAYOUT</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
                  <span className="text-xs text-slate-500 mt-1 block">{paidDeliveries.length} settled handoffs</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">ESCROW HOLD</span>
                  <div className="text-2xl font-bold font-mono text-amber-300 mt-1">₹{pendingAmount.toLocaleString('en-IN')}</div>
                  <span className="text-xs text-slate-500 mt-1 block">awaiting clearance</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">ACTIVE DROPS</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{deliveries.length}</div>
                  <span className="text-xs text-slate-500 mt-1 block">live secure links</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">CLIENT MESSAGES</span>
                  <div className="text-2xl font-bold font-mono text-blue-400 mt-1">{unreadMessagesCount}</div>
                  <span className="text-xs text-slate-500 mt-1 block">revision requests</span>
                </div>
              </div>

              {/* Recent Drops List */}
              <div className="p-6 rounded-2xl bg-[#0F1422] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Recent Deliveries</h3>
                  <button onClick={() => setCurrentView('deliveries')} className="text-xs text-blue-400 font-bold hover:underline">
                    View all ({deliveries.length})
                  </button>
                </div>

                {deliveries.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">No active deliveries created yet.</div>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {deliveries.slice(0, 5).map(item => (
                      <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-white text-sm">{item.title}</div>
                          <div className="text-slate-400 mt-0.5">
                            {item.clientName} • {item.files?.length || 1} file(s) • ₹{Number(item.grossAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Paid' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}>
                            {item.status}
                          </span>

                          {item.status !== 'Paid' && (
                            <button
                              onClick={() => handleSendReminder(item)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                              title="Send friendly payment reminder"
                            >
                              🔔 Remind
                            </button>
                          )}

                          <button onClick={() => copyLink(item.id)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <Link href={`/d/${item.id}`} target="_blank" className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:text-rose-400 text-slate-500">
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

          {/* ===================== VIEW: CLIENT MESSAGES & REVISION TAB ===================== */}
          {currentView === 'messages' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Revision & Message Enclave</h1>
                <p className="text-xs sm:text-sm text-slate-400">Direct feedback loop before client clears final payment.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-2">
                  <span className="text-xs font-mono uppercase text-slate-500 block">Deliverable Conversations:</span>
                  {deliveries.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDeliveryChat(d)}
                      className={`w-full p-4 rounded-xl border text-left transition text-xs space-y-1 ${
                        selectedDeliveryChat?.id === d.id ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-[#0F1422] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-slate-200">{d.title}</div>
                      <div className="text-slate-500">Client: {d.clientName}</div>
                      <div className="text-[10px] text-blue-400">{d.messages?.length || 0} messages exchanged</div>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-7 bg-[#0F1422] border border-slate-800 rounded-2xl p-5 flex flex-col h-[480px]">
                  {selectedDeliveryChat ? (
                    <>
                      <div className="border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold text-white">{selectedDeliveryChat.title}</h3>
                        <span className="text-xs text-slate-400">{selectedDeliveryChat.clientName} ({selectedDeliveryChat.clientEmail || 'Direct link'})</span>
                      </div>

                      <div className="flex-1 overflow-y-auto py-4 space-y-3">
                        {(selectedDeliveryChat.messages || []).length === 0 ? (
                          <div className="text-center py-16 text-xs text-slate-500">No client messages or revision requests yet.</div>
                        ) : (
                          selectedDeliveryChat.messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.sender === 'creator' ? 'items-end' : 'items-start'}`}>
                              <div className={`p-3 rounded-2xl text-xs max-w-xs sm:max-w-md ${
                                m.sender === 'creator' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'
                              }`}>
                                {m.text}
                              </div>
                              <span className="text-[9px] text-slate-500 mt-1 font-mono">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Send message or confirm revision..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendReply(selectedDeliveryChat.id)}
                          className="flex-1 bg-black/40 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                        <button 
                          onClick={() => handleSendReply(selectedDeliveryChat.id)}
                          className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="m-auto text-xs text-slate-500">Select a project on the left to view client discussion.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW: BRANDING ===================== */}
          {currentView === 'branding' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Studio White-Label Branding</h1>
                <p className="text-xs sm:text-sm text-slate-400">Replace generic branding with your personal studio identity.</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0F1422] border border-slate-800 space-y-4 shadow-xl">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Your Brand / Studio Name</label>
                  <input 
                    type="text" 
                    value={brandStudioName} 
                    onChange={e => setBrandStudioName(e.target.value)}
                    className="w-full bg-black/40 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Custom Post-Payment Thank-You Message</label>
                  <textarea 
                    rows={3}
                    value={brandThankYou} 
                    onChange={e => setBrandThankYou(e.target.value)}
                    className="w-full bg-black/40 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                  Client will see: <strong>"Delivered by {brandStudioName}"</strong> on their private payment portal.
                </div>

                <button 
                  onClick={() => showToast("Studio branding configurations saved!", "success")}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Save Branding Settings
                </button>
              </div>
            </div>
          )}

          {/* ===================== VIEW: DELIVERIES ===================== */}
          {currentView === 'deliveries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-white tracking-tight">Delivery Manifest</h1>
                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl"
                >
                  + New Drop
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliveries.map(item => (
                  <div key={item.id} className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md inline-block font-mono">
                          {item.clientName}
                        </span>
                        <h3 className="text-base font-bold text-white mt-1">{item.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{item.files?.length || 1} bundled file(s)</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Status Timeline */}
                    <div className="py-2 px-3 bg-black/40 rounded-xl text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span className="text-emerald-400">✓ Uploaded</span>
                      <span>→</span>
                      <span className={item.viewCount > 0 ? "text-emerald-400" : ""}>
                        {item.viewCount > 0 ? "✓ Inspected" : "○ Awaiting Review"}
                      </span>
                      <span>→</span>
                      <span className={item.status === 'Paid' ? "text-emerald-400 font-bold" : ""}>
                        {item.status === 'Paid' ? "✓ Paid & Unlocked" : "○ Unpaid"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-mono">Settlement</span>
                        <span className="font-bold text-white font-mono text-sm">₹{Number(item.grossAmount || 0).toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => copyLink(item.id)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl">
                          {copiedId === item.id ? 'Copied' : 'Share Link'}
                        </button>
                        <Link href={`/d/${item.id}`} target="_blank" className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:text-rose-400 text-slate-500">
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

      {/* Mobile Slide Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex lg:hidden">
          <div className="w-72 bg-[#0A0E17] text-slate-300 h-full p-5 flex flex-col justify-between shadow-2xl">
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400"
                >
                  <FolderKanban className="w-4 h-4" /> Deliveries
                </button>
                <button 
                  onClick={() => { setCurrentView('messages'); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400"
                >
                  <MessageSquare className="w-4 h-4" /> Client Messages
                </button>
                <button 
                  onClick={() => { setCurrentView('branding'); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400"
                >
                  <Settings className="w-4 h-4" /> Studio Branding
                </button>
              </nav>
            </div>

            <button onClick={() => signOut(auth)} className="text-sm font-bold text-rose-400 flex items-center gap-2 py-3 border-t border-slate-800">
              <X className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
