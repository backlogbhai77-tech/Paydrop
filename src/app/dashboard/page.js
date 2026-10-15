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
  Plus, Layers, MessageSquare, 
  UploadCloud, Lock, ExternalLink, FileArchive, 
  Trash2, RefreshCw, X, Menu, Search, LockKeyhole, Mail, AlertCircle,
  Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, Eye, EyeOff, Check,
  Home, Briefcase, FileText, ChevronRight, Sparkles
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "releasedrop_vault"

function formatCurrency(amount, currency = 'USD') {
  const num = Number(amount)
  if (isNaN(num)) return currency === 'INR' ? '₹0' : '$0'
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(num)
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [deliveries, setDeliveries] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const [currentTab, setCurrentTab] = useState('home') // 'home', 'projects', 'payments', 'wallet', 'revisions'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [hoveredBarIndex, setHoveredBarIndex] = useState(9) // Default highlighted bar

  // Escrow Request Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
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
    if (!title || !amount || !user) {
      showToast("Please enter Project Name and Amount", "error")
      return
    }

    setUploading(true)

    try {
      const manifest = []
      if (fileList.length > 0) {
        for (let i = 0; i < fileList.length; i++) {
          setUploadProgress(Math.round(((i) / fileList.length) * 100))
          const res = await uploadFileToCloudinary(fileList[i])
          manifest.push(res)
        }
      }

      setUploadProgress(100)

      const numAmount = Number(amount) || 0
      const platformFee = Math.max(Math.round(numAmount * 0.05), 1)
      const creatorPayout = Math.max(numAmount - platformFee, 0)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title: title.trim(),
        clientName: clientName.trim() || clientEmail.split('@')[0] || 'Client',
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

      showToast("Secure payment request created!", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setFileList([])
      setRequestModalOpen(false)
    } catch (err) {
      showToast(err.message || "Failed to create escrow request", "error")
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this project?")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      showToast("Project deleted", "success")
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

  const handleSendThreadReply = async (deliveryId) => {
    if (!threadReplyText.trim()) return
    try {
      const target = deliveries.find(d => d.id === deliveryId)
      const existing = target?.messages || []
      const updated = [...existing, { sender: 'creator', text: threadReplyText.trim(), time: new Date().toISOString() }]
      await updateDoc(doc(db, 'deliveries', deliveryId), { messages: updated })
      setThreadReplyText('')
      showToast("Reply sent to client", "success")
    } catch {
      showToast("Failed to send message", "error")
    }
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const totalRevenue = paidDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0) || 6240
  const activeRevisionsCount = deliveries.filter(d => d.messages && d.messages.length > 0 && d.status !== 'Paid').length

  const barChartData = [
    { month: 'Jan', val: 35 }, { month: 'Feb', val: 50 }, { month: 'Mar', val: 30 },
    { month: 'Apr', val: 70 }, { month: 'May', val: 45 }, { month: 'Jun', val: 60 },
    { month: 'Jul', val: 40 }, { month: 'Aug', val: 80 }, { month: 'Sep', val: 55 },
    { month: 'Oct', val: 95 }, { month: 'Nov', val: 65 }, { month: 'Dec', val: 75 }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F5F1] flex flex-col items-center justify-center text-xs text-slate-500 gap-3 font-mono">
        <div className="w-6 h-6 border-2 border-[#063D2A] border-t-transparent rounded-full animate-spin" />
        <span>INITIALIZING PAYDROP...</span>
      </div>
    )
  }

  /* LOGIN / AUTH VIEW */
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F5F1] text-slate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
        <div className="w-full max-w-md relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#94EC36] text-[#063D2A] font-black text-2xl flex items-center justify-center mx-auto shadow-xl shadow-[#94EC36]/20">
              P
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">paydrop</h1>
            <p className="text-xs text-slate-500">Mobile Payment Escrow App</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-[32px] p-8 shadow-xl shadow-slate-200/60 space-y-5">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-tight">{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="alex@lumio.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F3F5F1] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#94EC36] focus:ring-2 focus:ring-[#94EC36]/30 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F3F5F1] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#94EC36] focus:ring-2 focus:ring-[#94EC36]/30 transition"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-[#063D2A] hover:bg-[#094E36] text-white font-bold text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>{authMode === 'login' ? "Need an account?" : "Already registered?"}</span>
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                className="text-[#063D2A] font-bold hover:underline"
              >
                {authMode === 'login' ? 'Sign Up' : 'Sign In'}
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
              className="w-full py-3 bg-[#F3F5F1] hover:bg-slate-200/60 text-slate-800 font-bold text-xs rounded-2xl border border-slate-200 transition flex items-center justify-center gap-2"
            >
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F5F1] text-slate-900 font-sans flex antialiased pb-28 lg:pb-8 relative selection:bg-[#94EC36] selection:text-[#063D2A]">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl bg-[#063D2A] text-white text-xs font-semibold border border-[#083B29]">
            <span className="w-2 h-2 rounded-full bg-[#94EC36] animate-pulse" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between p-6 sticky top-0 h-screen z-30 select-none">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#94EC36] text-[#063D2A] font-black text-xl flex items-center justify-center shadow-md shadow-[#94EC36]/20">
                P
              </div>
              <span className="font-black text-2xl tracking-tight text-slate-900">paydrop</span>
            </div>

            <div className="w-8 h-8 rounded-full bg-[#F3F5F1] flex items-center justify-center text-slate-600 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-[#063D2A]" />
            </div>
          </div>

          <button
            onClick={() => setRequestModalOpen(true)}
            className="w-full py-3.5 bg-[#063D2A] hover:bg-[#094E36] text-white text-xs font-bold rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-4 h-4 text-[#94EC36] transition-transform group-hover:rotate-90 duration-200" />
            <span>Request payment</span>
          </button>

          <nav className="space-y-1 pt-2">
            <button
              onClick={() => setCurrentTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'home' ? 'bg-[#F3F5F1] text-[#063D2A]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => setCurrentTab('projects')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'projects' ? 'bg-[#F3F5F1] text-[#063D2A]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4" />
                <span>Projects</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                {deliveries.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('revisions')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'revisions' || currentTab === 'chat-thread' ? 'bg-[#F3F5F1] text-[#063D2A]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                <span>Revisions</span>
              </div>
              {activeRevisionsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <button
              onClick={() => setCurrentTab('wallet')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'wallet' ? 'bg-[#F3F5F1] text-[#063D2A]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Wallet</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#FFD6A5] text-[#063D2A] text-xs font-bold flex items-center justify-center shrink-0">
              AD
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">{user.displayName || 'Alex'}</div>
              <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 text-xs p-1" title="Sign Out">✕</button>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP MOBILE / DESKTOP HEADER */}
        <header className="px-6 sm:px-10 pt-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-2xl bg-[#94EC36] text-[#063D2A] font-black text-xl flex items-center justify-center">
              P
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">paydrop</span>
          </div>

          <div className="hidden lg:block">
            <span className="text-xs font-medium text-slate-400">Wednesday, May 21</span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Good morning, {user.displayName?.split(' ')[0] || 'Alex'}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-xs cursor-pointer hover:bg-slate-50">
              <Sparkles className="w-4 h-4 text-[#063D2A]" />
            </div>

            <div className="w-10 h-10 rounded-full bg-[#FFD6A5] text-[#063D2A] font-bold text-xs flex items-center justify-center border border-white shadow-xs">
              AD
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-xl lg:max-w-3xl w-full mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">

          {/* TAB: HOME */}
          {currentTab === 'home' && (
            <div className="space-y-6">
              
              {/* HERO AVAILABLE BALANCE CARD (Exact Screenshot 5 Match) */}
              <div className="bg-[#063D2A] rounded-[36px] p-7 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-[#063D2A]/15">
                {/* Curved background pattern overlay */}
                <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#0B4C35] rounded-full blur-2xl pointer-events-none opacity-50" />
                <div className="absolute right-12 -bottom-24 w-72 h-72 bg-[#08422E] rounded-full blur-3xl pointer-events-none opacity-60" />

                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-200/80">
                      <span>Available balance</span>
                      <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-1 text-emerald-300 hover:text-white transition">
                        {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-[#94EC36]" />
                    </div>
                  </div>

                  <div>
                    <div className="text-4xl sm:text-5xl font-black font-sans tracking-tight text-white">
                      {balanceVisible ? formatCurrency(totalRevenue, 'USD') : '$ ••••••'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button 
                      onClick={() => showToast("Withdrawal request initialized to bank account.", "success")}
                      className="px-6 py-3.5 bg-[#94EC36] hover:bg-[#83E222] text-[#063D2A] font-bold text-xs rounded-2xl shadow-md transition active:scale-95 flex items-center gap-2"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Withdraw</span>
                    </button>

                    <button 
                      onClick={() => setRequestModalOpen(true)}
                      className="px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs rounded-2xl border border-white/15 transition active:scale-95 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-[#94EC36]" />
                      <span>Request money</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* THIS MONTH BAR GRAPH CARD (Exact Screenshot 3 Match) */}
              <div className="bg-white border border-slate-200/80 rounded-[36px] p-7 shadow-xs space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">This month</h3>
                    <span className="text-xs text-slate-400 font-medium">May 1 – May 31</span>
                  </div>

                  <span className="px-3 py-1 bg-[#94EC36]/20 text-[#063D2A] border border-[#94EC36]/40 rounded-full text-xs font-black">
                    +18.4%
                  </span>
                </div>

                {/* Animated Vertical Bars */}
                <div className="grid grid-cols-12 gap-2 items-end h-32 pt-4 px-1">
                  {barChartData.map((item, idx) => (
                    <div 
                      key={idx} 
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      className="flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group"
                    >
                      <div 
                        className={`w-full rounded-full transition-all duration-300 ${
                          hoveredBarIndex === idx ? 'bg-[#94EC36] shadow-md shadow-[#94EC36]/30' : 'bg-slate-100 group-hover:bg-slate-200'
                        }`}
                        style={{ height: `${item.val}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Total earned</div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{formatCurrency(totalRevenue, 'USD')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">12 payments</div>
                  </div>
                </div>
              </div>

              {/* ACTIVE PROJECTS LIST (Exact Screenshot 2 Match) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Active projects</h3>
                    <p className="text-xs text-slate-400">Payments protected in escrow</p>
                  </div>
                  <button onClick={() => setCurrentTab('projects')} className="text-xs font-bold text-[#063D2A] hover:underline">
                    View all
                  </button>
                </div>

                {/* Project Cards */}
                <div className="space-y-3">
                  {/* Card 1 */}
                  <div className="p-6 bg-white border border-slate-200/80 rounded-[32px] shadow-xs space-y-4 hover:border-slate-300 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#94EC36]/30 text-[#063D2A] font-bold text-sm flex items-center justify-center border border-[#94EC36]/50">
                          LL
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900 tracking-tight">SaaS landing page</h4>
                          <p className="text-xs text-slate-400 mt-0.5">with Lumio Labs</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-base text-slate-900">$1,800</div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">In escrow</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#94EC36] rounded-full w-3/4 transition-all duration-500" />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span className="w-2 h-2 rounded-full bg-[#94EC36]" />
                          Funded
                        </span>
                        <a href="#view" className="text-slate-500 font-bold hover:text-slate-900 flex items-center gap-0.5">
                          <span>View project</span> <ChevronRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="p-6 bg-white border border-slate-200/80 rounded-[32px] shadow-xs space-y-4 hover:border-slate-300 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center border border-blue-200">
                          NC
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900 tracking-tight">Brand identity system</h4>
                          <p className="text-xs text-slate-400 mt-0.5">with Northstar Co.</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-base text-slate-900">$950</div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">Milestone 2 of 3</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#94EC36] rounded-full w-1/2 transition-all duration-500" />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span className="w-2 h-2 rounded-full bg-[#94EC36]" />
                          In review
                        </span>
                        <a href="#view" className="text-slate-500 font-bold hover:text-slate-900 flex items-center gap-0.5">
                          <span>View project</span> <ChevronRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* User Created Deliveries */}
                  {deliveries.map(item => (
                    <div key={item.id} className="p-6 bg-white border border-slate-200/80 rounded-[32px] shadow-xs space-y-4 hover:border-slate-300 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-[#94EC36]/30 text-[#063D2A] font-bold text-sm flex items-center justify-center">
                            {item.clientName ? item.clientName.slice(0, 2).toUpperCase() : 'CL'}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-900 tracking-tight">{item.title}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">with {item.clientName}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-base text-slate-900">{formatCurrency(item.grossAmount, item.currency || 'USD')}</div>
                          <div className="text-xs text-slate-400 font-medium mt-0.5">{item.status === 'Paid' ? 'Released' : 'In escrow'}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${item.status === 'Paid' ? 'w-full bg-[#94EC36]' : 'w-2/3 bg-[#94EC36]'}`} />
                        </div>

                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span className={`w-2 h-2 rounded-full ${item.status === 'Paid' ? 'bg-emerald-500' : 'bg-[#94EC36]'}`} />
                            {item.status === 'Paid' ? 'Funds Released' : 'Funded'}
                          </span>

                          <div className="flex items-center gap-2">
                            <button onClick={() => copyLink(item.id)} className="text-slate-500 font-bold hover:text-slate-900">
                              {copiedId === item.id ? 'Copied' : 'Copy link'}
                            </button>
                            <span className="text-slate-300">•</span>
                            <Link href={`/d/${item.id}`} target="_blank" className="text-[#063D2A] font-bold flex items-center gap-0.5 hover:underline">
                              <span>View project</span> <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              </div>

            </div>
          )}

          {/* TAB: PROJECTS */}
          {currentTab === 'projects' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">All Projects</h1>
              <div className="space-y-3">
                {deliveries.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-[32px]">No extra projects deployed yet.</div>
                ) : (
                  deliveries.map(item => (
                    <div key={item.id} className="p-6 bg-white border border-slate-200/80 rounded-[32px] flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-400">Client: {item.clientName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs">{formatCurrency(item.grossAmount, item.currency)}</span>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: REVISIONS */}
          {currentTab === 'revisions' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Client Revisions</h1>
              <div className="space-y-3">
                {deliveries.map(d => (
                  <div key={d.id} className="p-6 bg-white border border-slate-200/80 rounded-[32px] flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{d.clientName}</h4>
                      <p className="text-xs text-slate-500">{d.title}</p>
                    </div>
                    <button onClick={() => { setActiveThreadDelivery(d); setCurrentTab('chat-thread'); }} className="px-4 py-2 bg-[#063D2A] text-white font-bold text-xs rounded-xl">
                      Open Chat
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: CHAT THREAD */}
          {currentTab === 'chat-thread' && activeThreadDelivery && (
            <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 space-y-4">
              <button onClick={() => setCurrentTab('revisions')} className="text-xs font-bold text-slate-400">← Back</button>
              <h3 className="font-bold text-sm">{activeThreadDelivery.title}</h3>
              <div className="h-64 overflow-y-auto bg-[#F3F5F1] p-4 rounded-2xl space-y-2">
                {(activeThreadDelivery.messages || []).map((m, idx) => (
                  <div key={idx} className={`p-3 text-xs rounded-xl max-w-xs ${m.sender === 'creator' ? 'bg-[#063D2A] text-white ml-auto' : 'bg-white text-slate-800'}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type reply..."
                  value={threadReplyText}
                  onChange={e => setThreadReplyText(e.target.value)}
                  className="flex-1 bg-[#F3F5F1] px-4 py-2 rounded-xl text-xs focus:outline-none"
                />
                <button onClick={() => handleSendThreadReply(activeThreadDelivery.id)} className="px-4 py-2 bg-[#063D2A] text-white text-xs font-bold rounded-xl">
                  Send
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* FLOATING PLUS ACTION BUTTON (Exact Screenshot 2 & 5 Match) */}
      <button
        onClick={() => setRequestModalOpen(true)}
        className="fixed bottom-24 right-6 sm:bottom-10 sm:right-10 z-40 w-14 h-14 rounded-full bg-[#063D2A] text-white flex items-center justify-center shadow-2xl shadow-[#063D2A]/40 transition hover:scale-105 active:scale-95"
      >
        <Plus className="w-7 h-7 text-[#94EC36]" />
      </button>

      {/* REQUEST A PAYMENT MODAL (Exact Screenshot 1 Match) */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-6">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">NEW ESCROW</span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">Request a payment</h3>
              </div>
              <button 
                onClick={() => setRequestModalOpen(false)} 
                className="w-10 h-10 rounded-full bg-[#F3F5F1] hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
              >
                <X className="w-5 h-5" />
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
                  className="w-full px-4 py-3.5 bg-[#F3F5F1] border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#94EC36] focus:ring-2 focus:ring-[#94EC36]/30 transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Project name</label>
                <input
                  type="text"
                  placeholder="e.g. Website redesign"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#F3F5F1] border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#94EC36] focus:ring-2 focus:ring-[#94EC36]/30 transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Amount</label>
                <div className="flex bg-[#F3F5F1] border border-slate-200/80 rounded-2xl overflow-hidden focus-within:border-[#94EC36] transition">
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="px-4 py-3.5 bg-transparent text-xs font-bold text-slate-700 focus:outline-none border-r border-slate-200 cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR (₹)</option>
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

              {/* Escrow Banner (Exact Match) */}
              <div className="p-4 bg-[#94EC36]/15 border border-[#94EC36]/30 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#063D2A] shrink-0 mt-0.5" />
                <p className="text-xs text-[#063D2A] leading-relaxed font-semibold">
                  Your client funds the escrow first. You get paid when the approved work is delivered.
                </p>
              </div>

              {uploading ? (
                <div className="p-4 bg-[#063D2A] text-white rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Creating payment...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#08422E] rounded-full overflow-hidden">
                    <div className="h-full bg-[#94EC36] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDeployVault}
                  disabled={!title || !amount}
                  className="w-full py-4 bg-[#063D2A] hover:bg-[#094E36] disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Create secure payment</span>
                </button>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (Exact Screenshot 2, 3, 5 Match) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center gap-1 transition ${
            currentTab === 'home' ? 'text-[#063D2A] font-extrabold' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => setCurrentTab('projects')}
          className={`flex flex-col items-center gap-1 transition ${
            currentTab === 'projects' ? 'text-[#063D2A] font-extrabold' : 'text-slate-400'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span className="text-[10px]">Projects</span>
        </button>

        <button
          onClick={() => setCurrentTab('revisions')}
          className={`flex flex-col items-center gap-1 transition relative ${
            currentTab === 'revisions' || currentTab === 'chat-thread' ? 'text-[#063D2A] font-extrabold' : 'text-slate-400'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Payments</span>
        </button>

        <button
          onClick={() => setCurrentTab('wallet')}
          className={`flex flex-col items-center gap-1 transition ${
            currentTab === 'wallet' ? 'text-[#063D2A] font-extrabold' : 'text-slate-400'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px]">Wallet</span>
        </button>
      </div>

    </div>
  )
}
