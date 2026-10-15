'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth'
import { 
  collection, addDoc, query, where, deleteDoc, doc, updateDoc, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore'
import { 
  Zap, Plus, Layers, MessageSquare, 
  UploadCloud, Lock, ExternalLink, FileArchive, 
  Trash2, RefreshCw, X, Menu, Search, LockKeyhole, Mail, AlertCircle,
  Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, Eye, EyeOff, Check
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "releasedrop_vault"

function formatINR(amount) {
  const num = Number(amount)
  if (isNaN(num)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num)
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [deliveries, setDeliveries] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [currentView, setCurrentView] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [balanceVisible, setBalanceVisible] = useState(true)

  // Escrow / Payment Request Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [expirySelection, setExpirySelection] = useState('7')
  const [watermarkText, setWatermarkText] = useState('PAYDROP • PREVIEW COPY')
  
  const [fileList, setFileList] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const [activeThreadDelivery, setActiveThreadDelivery] = useState(null)
  const [threadReplyText, setThreadReplyText] = useState('')
  
  const [authMode, setAuthMode] = useState('login')
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')

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

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    if (!emailInput || !passwordInput) {
      setAuthError("Email and password are required")
      return
    }

    try {
      setAuthLoading(true)
      setAuthError('')
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput)
        showToast("Welcome back!", "success")
      } else {
        await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput)
        showToast("Account created successfully!", "success")
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError("Invalid email or password.")
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError("Email already registered. Try logging in.")
      } else if (error.code === 'auth/weak-password') {
        setAuthError("Password should be at least 6 characters.")
      } else {
        setAuthError(error.message || "Authentication failed.")
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true)
      setAuthError('')
      await signInWithPopup(auth, googleProvider)
      showToast("Signed in with Google", "success")
    } catch {
      setAuthError("Google Sign-In blocked by device. Please use Email/Password login.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      showToast("Logged out successfully", "success")
    } catch {
      showToast("Logout failed", "error")
    }
  }

  const handleFilesAdd = (files) => {
    const selected = Array.from(files)
    if (!selected.length) return
    setFileList(prev => [...prev, ...selected])
  }

  const removeFile = (idx) => {
    setFileList(prev => prev.filter((_, i) => i !== idx))
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
          setUploadProgress(Math.round((event.loaded / event.total) * 98))
        }
      }

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText)
          if (xhr.status === 200 && (res.secure_url || res.url)) {
            const rawUrl = res.secure_url || res.url
            const previewUrl = file.type.startsWith('image/')
              ? rawUrl.replace('/upload/', `/upload/l_text:Arial_24_bold:${encodeURIComponent(watermarkText)},o_35,a_-30/`)
              : rawUrl

            resolve({
              name: file.name,
              size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
              type: file.type || 'application/octet-stream',
              rawUrl: rawUrl,
              previewUrl: previewUrl
            })
          } else {
            reject(new Error(res?.error?.message || "Storage error"))
          }
        } catch {
          reject(new Error("Upload parsing error"))
        }
      }
      xhr.onerror = () => reject(new Error("Network connection interrupted"))
      xhr.send(formData)
    })
  }

  const handleDeployVault = async () => {
    if (!title || !amount || !fileList.length || !user) {
      showToast("Please provide Deliverable Title, Due Amount, and Assets", "error")
      return
    }

    setUploading(true)

    try {
      const manifest = []
      for (let i = 0; i < fileList.length; i++) {
        setUploadProgress(Math.round(((i) / fileList.length) * 100))
        const res = await uploadFileToCloudinary(fileList[i])
        manifest.push(res)
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
        currency,
        platformFee,
        creatorPayout,
        watermarkText: watermarkText || 'PAYDROP • PREVIEW COPY',
        status: 'Awaiting Payment',
        files: manifest,
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        messages: [],
        createdAt: serverTimestamp()
      })

      showToast("Escrow payment request created successfully!", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setFileList([])
      setRequestModalOpen(false)
    } catch (err) {
      showToast(err.message || "Failed to create escrow", "error")
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this deliverable?")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      showToast("Vault deleted", "success")
    } catch {
      showToast("Failed to delete", "error")
    }
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    showToast("Client escrow link copied!", "success")
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleSendThreadReply = async (deliveryId) => {
    if (!threadReplyText.trim()) return
    try {
      const target = deliveries.find(d => d.id === deliveryId)
      const existing = target?.messages || []
      const updated = [...existing, { sender: 'creator', text: threadReplyText.trim(), time: new Date().toISOString() }]
      await updateDoc(doc(db, 'deliveries', deliveryId), { messages: updated })
      setThreadReplyText('')
      showToast("Reply sent", "success")
    } catch {
      showToast("Failed to send note", "error")
    }
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const totalRevenue = paidDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const pendingAmount = pendingDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const activeRevisionsCount = deliveries.filter(d => d.messages && d.messages.length > 0 && d.status !== 'Paid').length

  const filteredDeliveries = deliveries.filter(d => {
    const matchesFilter = filterStatus === 'all' ? true : filterStatus === 'pending' ? d.status === 'Awaiting Payment' : d.status === 'Paid'
    const matchesSearch = d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center text-xs text-slate-500 gap-3 font-mono">
        <div className="w-5 h-5 border-2 border-[#063D2A] border-t-transparent rounded-full animate-spin" />
        <span>LOADING SECURE ESCROW...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] text-slate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-[#88E72D]/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-3xl bg-[#063D2A] flex items-center justify-center text-white mx-auto shadow-xl shadow-[#063D2A]/10">
              <Zap className="w-7 h-7 fill-[#88E72D] text-[#88E72D]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">PayDrop Studio</h1>
            <p className="text-xs text-slate-500">Secure payment escrow for professional freelancers.</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 space-y-5">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-tight">{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="creator@studio.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#F8FAF8] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#063D2A] transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Password</label>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#F8FAF8] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#063D2A] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-[#063D2A] hover:bg-[#083B29] text-white font-bold text-xs rounded-2xl shadow-lg shadow-[#063D2A]/15 transition active:scale-95 flex items-center justify-center gap-2"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>}
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>{authMode === 'login' ? "New to PayDrop?" : "Already registered?"}</span>
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                className="text-[#063D2A] font-bold hover:underline"
              >
                {authMode === 'login' ? 'Create an Account' : 'Sign In'}
              </button>
            </div>

            <div className="relative flex items-center my-3">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="shrink-0 px-3 text-[10px] text-slate-400 font-mono">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full py-3 bg-[#F8FAF8] hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-2xl border border-slate-200 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-slate-900 font-sans flex antialiased pb-28 lg:pb-0 relative selection:bg-[#88E72D] selection:text-[#063D2A]">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl bg-[#063D2A] text-white text-xs font-semibold border border-[#083B29]">
            <span className="w-2 h-2 rounded-full bg-[#88E72D]" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between p-5 sticky top-0 h-screen z-30 select-none">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <div className="w-9 h-9 rounded-2xl bg-[#063D2A] flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4 fill-[#88E72D] text-[#88E72D]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-slate-900 uppercase">paydrop</span>
                <span className="w-2 h-2 rounded-full bg-[#88E72D]" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Escrow Studio</span>
            </div>
          </div>

          <button
            onClick={() => setRequestModalOpen(true)}
            className="w-full py-3 bg-[#063D2A] hover:bg-[#083B29] text-white text-xs font-bold rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-4 h-4 text-[#88E72D] transition-transform group-hover:rotate-90 duration-200" />
            <span>Request Payment</span>
          </button>

          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2 font-mono">Menu</span>
            
            <button
              onClick={() => setCurrentView('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
                currentView === 'overview' ? 'bg-[#063D2A] text-white font-bold shadow-md shadow-[#063D2A]/10' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4" />
                <span>Home / Wallet</span>
              </div>
            </button>

            <button
              onClick={() => setCurrentView('projects')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
                currentView === 'projects' ? 'bg-[#063D2A] text-white font-bold shadow-md shadow-[#063D2A]/10' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4" />
                <span>Active Projects</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-mono ${currentView === 'projects' ? 'bg-[#083B29] text-[#88E72D]' : 'bg-slate-100 text-slate-600'}`}>
                {deliveries.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentView('inbox')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
                currentView === 'inbox' || currentView === 'chat-thread' ? 'bg-[#063D2A] text-white font-bold shadow-md shadow-[#063D2A]/10' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                <span>Client Revisions</span>
              </div>
              {activeRevisionsCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#88E72D] text-[#063D2A] font-bold">
                  {activeRevisionsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="p-3.5 bg-[#F8FAF8] border border-slate-200/80 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-[#88E72D] animate-pulse" /> Protected in Escrow
            </span>
            <div className="text-sm font-black text-slate-900 font-mono">{formatINR(pendingAmount)}</div>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#063D2A] text-[#88E72D] text-[11px] font-bold flex items-center justify-center shrink-0">
                {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : (user.email ? user.email.slice(0, 2).toUpperCase() : 'AD')}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">{user.displayName || user.email?.split('@')[0]}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 text-xs p-2 rounded-xl transition" title="Sign Out">✕</button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 px-6 sm:px-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2.5 text-slate-700 hover:bg-slate-100 rounded-2xl transition">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs text-slate-400 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Good morning, {user.displayName || user.email?.split('@')[0] || 'Ankit'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-64">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects or clients..."
                value={searchQuery}
                exact="true"
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F8FAF8] border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-[#063D2A] transition"
              />
            </div>

            <button
              onClick={() => setRequestModalOpen(true)}
              className="px-4 py-2.5 bg-[#063D2A] hover:bg-[#083B29] text-white font-bold text-xs rounded-2xl shadow-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-[#88E72D]" />
              <span>Request money</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 space-y-8 animate-in fade-in duration-300">

          {/* VIEW: OVERVIEW / HOME */}
          {currentView === 'overview' && (
            <div className="space-y-8">
              
              {/* WALLET / AVAILABLE BALANCE CARD (Exact Figma Style) */}
              <div className="bg-[#063D2A] rounded-[36px] p-8 text-white relative overflow-hidden shadow-2xl shadow-[#063D2A]/20">
                {/* Background decorative circles */}
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#083B29] rounded-full blur-2xl pointer-events-none opacity-60" />
                <div className="absolute right-20 -bottom-20 w-72 h-72 bg-[#0A4532] rounded-full blur-3xl pointer-events-none opacity-50" />

                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-200/80">
                      <span>Available balance</span>
                      <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-1 hover:text-white transition">
                        {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                      <Wallet className="w-5 h-5 text-[#88E72D]" />
                    </div>
                  </div>

                  <div>
                    <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                      {balanceVisible ? formatINR(totalRevenue) : '₹ ••••••'}
                    </div>
                    <p className="text-xs text-emerald-200/70 mt-1">Ready for instant bank payout</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button 
                      onClick={() => showToast("Withdrawal gateway initialized. Funds routed to bank.", "success")}
                      className="px-5 py-3 bg-[#88E72D] hover:bg-[#7AD423] text-[#063D2A] font-bold text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center gap-2"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Withdraw</span>
                    </button>

                    <button 
                      onClick={() => setRequestModalOpen(true)}
                      className="px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs rounded-2xl border border-white/15 transition active:scale-95 flex items-center gap-2"
                    >
                      <ArrowDownLeft className="w-4 h-4 text-[#88E72D]" />
                      <span>Request money</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* MONTHLY EARNINGS SPARKLINE / CHART CARD */}
              <div className="bg-white border border-slate-200/90 rounded-[32px] p-7 shadow-sm space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">This month</span>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">May 1 – May 31</div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold font-mono">
                    +18.4%
                  </span>
                </div>

                {/* Vertical Bar Chart Bars */}
                <div className="grid grid-cols-12 gap-2 items-end h-28 pt-4 pb-2 px-2">
                  {[40, 55, 35, 75, 50, 65, 45, 80, 60, 95, 70, 85].map((val, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                      <div 
                        className={`w-full rounded-full transition-all duration-300 ${
                          idx === 9 ? 'bg-[#88E72D] shadow-md shadow-[#88E72D]/20' : 'bg-slate-100 group-hover:bg-slate-200'
                        }`}
                        style={{ height: `${val}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Total earned</div>
                    <div className="text-xl font-black text-slate-900 font-mono tracking-tight mt-0.5">{formatINR(totalRevenue)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Transactions</div>
                    <div className="text-xl font-black text-slate-900 font-mono tracking-tight mt-0.5">{paidDeliveries.length} payments</div>
                  </div>
                </div>
              </div>

              {/* ACTIVE PROJECTS SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Active projects</h3>
                    <p className="text-xs text-slate-500">Payments protected in escrow</p>
                  </div>
                  <button onClick={() => setCurrentView('projects')} className="text-xs font-bold text-[#063D2A] hover:underline">
                    View all
                  </button>
                </div>

                {deliveries.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-[32px] border border-slate-200/90 shadow-sm">
                    No active projects right now. Tap "Request money" to create your first escrow.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveries.slice(0, 3).map(item => (
                      <div key={item.id} className="p-6 bg-white border border-slate-200/90 rounded-[28px] shadow-sm space-y-4 hover:border-slate-300 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#063D2A] font-bold text-xs flex items-center justify-center border border-emerald-200/60">
                              {item.clientName ? item.clientName.slice(0, 2).toUpperCase() : 'CL'}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">with <span className="text-slate-700 font-medium">{item.clientName}</span></p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-black text-sm text-slate-900">{formatINR(item.grossAmount)}</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{item.status === 'Paid' ? 'Released' : 'In escrow'}</div>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="space-y-2">
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                item.status === 'Paid' ? 'w-full bg-[#88E72D]' : 'w-2/3 bg-[#88E72D]'
                              }`} 
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                              <span className={`w-2 h-2 rounded-full ${item.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {item.status === 'Paid' ? 'Funds released & settled' : 'Funded • In progress'}
                            </span>

                            <div className="flex items-center gap-2">
                              <button onClick={() => copyLink(item.id)} className="text-slate-500 hover:text-slate-900 font-semibold">
                                {copiedId === item.id ? 'Copied Link!' : 'Copy Link'}
                              </button>
                              <span className="text-slate-300">•</span>
                              <Link href={`/d/${item.id}`} target="_blank" className="text-[#063D2A] font-bold flex items-center gap-1 hover:underline">
                                <span>View project</span> <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW: ALL PROJECTS */}
          {currentView === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Active Projects</h1>
                  <p className="text-xs text-slate-500 mt-0.5">All escrow vaults and secured client handovers.</p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
                  {['all', 'pending', 'paid'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFilterStatus(tab)}
                      className={`px-3 py-1.5 rounded-xl transition capitalize ${
                        filterStatus === tab ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {filteredDeliveries.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-[32px] border border-slate-200">
                  No deliverables found matching your filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDeliveries.map(item => (
                    <div key={item.id} className="p-6 bg-white border border-slate-200/90 rounded-[28px] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#063D2A] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                          <FileArchive className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                          <p className="text-[11px] text-slate-500">
                            Client: <span className="text-slate-700 font-medium">{item.clientName}</span> • {item.files?.length || 1} asset(s)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="font-mono font-black text-xs text-slate-900">
                          {formatINR(item.grossAmount)}
                        </span>

                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                          item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.status === 'Paid' ? 'Released' : 'In Escrow'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => copyLink(item.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-xl transition"
                          >
                            {copiedId === item.id ? 'Copied' : 'Copy Link'}
                          </button>
                          <Link href={`/d/${item.id}`} target="_blank" className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: REVISIONS INBOX */}
          {currentView === 'inbox' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Revisions</h1>
                <p className="text-xs text-slate-500 mt-0.5">Active change requests and project discussions.</p>
              </div>

              <div className="space-y-3">
                {deliveries.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-[32px] border border-slate-200">
                    No active feedback threads.
                  </div>
                ) : (
                  deliveries.map(d => {
                    const hasMessages = d.messages && d.messages.length > 0
                    const lastMsg = hasMessages ? d.messages[d.messages.length - 1] : null
                    const isRevisionActive = hasMessages && d.status !== 'Paid'

                    return (
                      <div
                        key={d.id}
                        className={`p-6 rounded-[28px] bg-white border transition-all ${
                          isRevisionActive ? 'border-amber-300 shadow-sm ring-1 ring-amber-200/50' : 'border-slate-200/90 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isRevisionActive ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <MessageSquare className="w-4 h-4" />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{d.clientName}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs text-slate-500">{d.title}</span>
                              </div>

                              <p className="text-xs text-slate-600 leading-snug">
                                <strong className="text-slate-800 font-semibold">{lastMsg ? `${lastMsg.sender === 'creator' ? 'You' : d.clientName}: ` : 'Status: '}</strong>
                                {lastMsg ? lastMsg.text : (d.status === 'Paid' ? 'Funds released. Master files unlocked.' : 'Escrow vault active. Awaiting review.')}
                              </p>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
                                <span>{lastMsg ? new Date(lastMsg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                                <span>•</span>
                                <span className="font-bold text-slate-700">{formatINR(d.grossAmount)}</span>
                                {isRevisionActive && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                    Changes Requested
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => { setActiveThreadDelivery(d); setCurrentView('chat-thread'); }}
                            className="px-4 py-2.5 bg-[#063D2A] hover:bg-[#083B29] text-white text-xs font-bold rounded-2xl transition flex items-center gap-2"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Open Thread</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW: CHAT THREAD */}
          {currentView === 'chat-thread' && activeThreadDelivery && (
            <div className="bg-white border border-slate-200/90 rounded-[32px] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setCurrentView('inbox')} className="text-xs text-slate-400 hover:text-slate-700 font-bold transition">
                    ← Back
                  </button>
                  <span className="text-slate-300">|</span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{activeThreadDelivery.clientName}</h3>
                    <span className="text-[10px] text-slate-400">{activeThreadDelivery.title}</span>
                  </div>
                </div>

                <Link href={`/d/${activeThreadDelivery.id}`} target="_blank" className="text-xs text-[#063D2A] font-bold hover:underline flex items-center gap-1">
                  <span>Portal View</span> <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="h-80 overflow-y-auto p-5 bg-[#F8FAF8] rounded-2xl space-y-3">
                {(activeThreadDelivery.messages || []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No messages yet in this revision thread.
                  </div>
                ) : (
                  activeThreadDelivery.messages.map((m, idx) => {
                    const isCreator = m.sender === 'creator'
                    return (
                      <div key={idx} className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3.5 rounded-2xl text-xs max-w-sm ${
                          isCreator ? 'bg-[#063D2A] text-white rounded-br-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                        }`}>
                          <p className="leading-relaxed">{m.text}</p>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type revision reply..."
                  value={threadReplyText}
                  onChange={e => setThreadReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendThreadReply(activeThreadDelivery.id)}
                  className="flex-1 bg-[#F8FAF8] border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-[#063D2A] transition"
                />
                <button
                  onClick={() => handleSendThreadReply(activeThreadDelivery.id)}
                  className="px-5 py-3 bg-[#063D2A] hover:bg-[#083B29] text-white text-xs font-bold rounded-2xl transition"
                >
                  Send
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* REQUEST A PAYMENT MODAL (Exact Figma Design Match) */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-[36px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">NEW ESCROW</span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">Request a payment</h3>
              </div>
              <button 
                onClick={() => setRequestModalOpen(false)} 
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Client email</label>
                <input
                  type="email"
                  placeholder="client@company.com"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#F8FAF8] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#063D2A] transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Project name</label>
                <input
                  type="text"
                  placeholder="e.g. Website redesign"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#F8FAF8] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#063D2A] transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Lumio Labs"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#F8FAF8] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#063D2A] transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Amount</label>
                <div className="flex bg-[#F8FAF8] border border-slate-200 rounded-2xl overflow-hidden focus-within:border-[#063D2A] transition">
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="px-4 py-3.5 bg-transparent text-xs font-bold text-slate-700 focus:outline-none border-r border-slate-200 cursor-pointer"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-3.5 bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder:text-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Project Deliverables / Files</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files); }}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                    isDragging ? 'border-[#063D2A] bg-emerald-50/50' : 'border-slate-200 bg-[#F8FAF8] hover:border-[#063D2A]'
                  }`}
                >
                  <UploadCloud className="w-6 h-6 text-[#063D2A] mx-auto mb-1" />
                  <span className="text-xs font-bold text-slate-800 block">Drop files or browse</span>
                  <label className="mt-2 inline-block px-3 py-1.5 bg-[#063D2A] text-white text-[11px] font-bold rounded-xl cursor-pointer shadow-xs transition">
                    Select Files
                    <input type="file" multiple onChange={e => handleFilesAdd(e.target.files)} className="hidden" />
                  </label>
                </div>

                {fileList.length > 0 && (
                  <div className="space-y-1 bg-[#F8FAF8] p-2.5 rounded-2xl border border-slate-200">
                    {fileList.map((f, i) => (
                      <div key={i} className="flex justify-between text-xs items-center px-1">
                        <span className="truncate max-w-[280px] font-medium text-slate-800">{f.name}</span>
                        <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Escrow Guarantee Banner (Exact Match) */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#063D2A] shrink-0 mt-0.5" />
                <p className="text-xs text-[#063D2A] leading-relaxed font-medium">
                  Your client funds the escrow first. You get paid when the approved work is delivered.
                </p>
              </div>

              {uploading ? (
                <div className="p-4 bg-[#063D2A] text-white rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Deploying Escrow Vault...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#083B29] rounded-full overflow-hidden">
                    <div className="h-full bg-[#88E72D] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDeployVault}
                  disabled={!title || !amount || !fileList.length}
                  className="w-full py-4 bg-[#063D2A] hover:bg-[#083B29] disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-xl shadow-[#063D2A]/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-[#88E72D]" />
                  <span>Create secure payment</span>
                </button>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION (Exact Figma Match) */}
      <div className="fixed bottom-3 left-4 right-4 z-40 lg:hidden flex justify-center">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-[28px] px-4 py-2.5 flex items-center justify-around w-full max-w-sm">
          <button
            onClick={() => setCurrentView('overview')}
            className={`flex flex-col items-center gap-1 transition ${
              currentView === 'overview' ? 'text-[#063D2A] font-bold' : 'text-slate-400'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setCurrentView('projects')}
            className={`flex flex-col items-center gap-1 transition ${
              currentView === 'projects' ? 'text-[#063D2A] font-bold' : 'text-slate-400'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[10px]">Projects</span>
          </button>

          <button
            onClick={() => setRequestModalOpen(true)}
            className="flex flex-col items-center gap-1 text-white font-bold -mt-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#063D2A] text-[#88E72D] flex items-center justify-center shadow-xl shadow-[#063D2A]/30">
              <Plus className="w-6 h-6" />
            </div>
          </button>

          <button
            onClick={() => setCurrentView('inbox')}
            className={`flex flex-col items-center gap-1 transition relative ${
              currentView === 'inbox' || currentView === 'chat-thread' ? 'text-[#063D2A] font-bold' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4" />
              {activeRevisionsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#88E72D] absolute -top-0.5 -right-1" />
              )}
            </div>
            <span className="text-[10px]">Revisions</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-800"
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px]">Menu</span>
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex lg:hidden animate-in fade-in duration-150">
          <div className="w-72 bg-white h-full p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#063D2A] flex items-center justify-center text-white">
                    <Zap className="w-4 h-4 fill-[#88E72D] text-[#88E72D]" />
                  </div>
                  <span className="font-black text-sm text-slate-900 uppercase">paydrop</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                <button 
                  onClick={() => { setCurrentView('overview'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold ${
                    currentView === 'overview' ? 'bg-[#063D2A] text-white font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Wallet className="w-4 h-4" /> Home / Wallet
                </button>

                <button 
                  onClick={() => { setCurrentView('projects'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold ${
                    currentView === 'projects' ? 'bg-[#063D2A] text-white font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-4 h-4" /> Active Projects
                </button>

                <button 
                  onClick={() => { setCurrentView('inbox'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold ${
                    currentView === 'inbox' ? 'bg-[#063D2A] text-white font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" /> Client Revisions
                </button>

                <button 
                  onClick={() => { setRequestModalOpen(true); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold text-[#063D2A] bg-emerald-50"
                >
                  <Plus className="w-4 h-4" /> Request Payment
                </button>
              </nav>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="text-xs font-bold text-slate-900 truncate">{user.displayName || user.email?.split('@')[0]}</div>
              <button onClick={handleLogout} className="text-xs text-rose-600 font-bold py-1">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
