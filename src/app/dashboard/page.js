'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  Wallet, ShieldCheck, Eye, EyeOff, Check,
  Home, Briefcase, FileText, ChevronRight, Sparkles, File, Film, Image as ImageIcon,
  Send, Bot, Settings, Bell, HelpCircle, ArrowRight, ArrowLeft, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "releasedrop_vault"

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount)
  if (isNaN(num)) return currency === 'USD' ? '$0' : '₹0'
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(num)
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [deliveries, setDeliveries] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const [currentTab, setCurrentTab] = useState('home') // 'home', 'projects', 'revisions', 'wallet'
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null)

  // Drawer / Menu Modals
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)

  // Fullscreen 4-Step Escrow Wizard State
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
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

  // Fullscreen Revision Chat State
  const [activeThreadDelivery, setActiveThreadDelivery] = useState(null)
  const [threadReplyText, setThreadReplyText] = useState('')
  const chatBottomRef = useRef(null)
  
  // Auth State
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
          
          if (activeThreadDelivery) {
            const updatedThread = docs.find(d => d.id === activeThreadDelivery.id)
            if (updatedThread) setActiveThreadDelivery(updatedThread)
          }
        })
      } else {
        setDeliveries([])
      }
    })
    return () => {
      unsubAuth()
      if (unsubFirestore) unsubFirestore()
    }
  }, [activeThreadDelivery?.id])

  useEffect(() => {
    if (currentTab === 'chat-thread' || activeThreadDelivery) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentTab, activeThreadDelivery?.messages])

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
      showToast("Please complete all steps and attach at least one deliverable file", "error")
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
      const platformFee = Math.max(Math.round(numAmount * 0.05), 1)
      const creatorPayout = Math.max(numAmount - platformFee, 0)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (expirySelection === 'never' ? 3650 : parseInt(expirySelection)))

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

      showToast("Secure escrow payment request created!", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setFileList([])
      setWizardStep(1)
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
    showToast("Escrow link copied!", "success")
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
  const totalRevenueINR = paidDeliveries.filter(d => (d.currency || 'INR') === 'INR').reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const totalRevenueUSD = paidDeliveries.filter(d => d.currency === 'USD').reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const unreadRevisionsCount = deliveries.filter(d => d.messages && d.messages.length > 0 && d.messages[d.messages.length - 1].sender === 'client').length

  const filteredDeliveries = deliveries.filter(d => 
    d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dynamicMonthlyStats = monthNames.map((m, i) => {
    const monthPaid = paidDeliveries.filter(d => {
      const date = d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000) : new Date()
      return date.getMonth() === i
    })
    const sum = monthPaid.reduce((acc, c) => acc + (Number(c.grossAmount) || 0), 0)
    return { month: m, val: Math.min(Math.max((sum / 10000) * 100, 15), 100), amount: formatCurrency(sum, currency) }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F5EE] flex flex-col items-center justify-center text-xs text-slate-500 gap-3 font-mono">
        <div className="w-6 h-6 border-2 border-[#063D2A] border-t-transparent rounded-full animate-spin" />
        <span>INITIALIZING PAYDROP STUDIO...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F0F5EE] text-slate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
        <div className="w-full max-w-md relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#94EC36] text-[#063D2A] font-black text-2xl flex items-center justify-center mx-auto shadow-xl shadow-[#94EC36]/20">
              P
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">paydrop</h1>
            <p className="text-xs text-slate-500">Secure Payment Escrow Studio</p>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-8 shadow-xl space-y-5">
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
                  placeholder="ankit@studio.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F0F5EE] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#94EC36] transition"
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
                  className="w-full px-4 py-3 bg-[#F0F5EE] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#94EC36] transition"
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
              className="w-full py-3 bg-[#F0F5EE] hover:bg-slate-200/60 text-slate-800 font-bold text-xs rounded-2xl border border-slate-200 transition flex items-center justify-center gap-2"
            >
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F5EE] text-slate-900 font-sans flex antialiased pb-28 lg:pb-8 relative selection:bg-[#94EC36] selection:text-[#063D2A]">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl bg-[#063D2A] text-white text-xs font-semibold border border-[#083B29]">
            <span className="w-2 h-2 rounded-full bg-[#94EC36] animate-pulse" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/80 flex-col justify-between p-6 sticky top-0 h-screen z-30 select-none">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentTab('home')} className="flex items-center gap-2.5 text-left group">
              <div className="w-10 h-10 rounded-2xl bg-[#94EC36] text-[#063D2A] font-black text-xl flex items-center justify-center shadow-md shadow-[#94EC36]/20 transition-transform group-hover:scale-105">
                P
              </div>
              <span className="font-black text-2xl tracking-tight text-slate-900">paydrop</span>
            </button>

            <button onClick={() => setAiDrawerOpen(true)} className="w-8 h-8 rounded-full bg-[#F0F5EE] hover:bg-slate-200/60 flex items-center justify-center text-slate-600 transition" title="AI Assistant">
              <Sparkles className="w-4 h-4 text-[#063D2A]" />
            </button>
          </div>

          <button
            onClick={() => { setWizardStep(1); setRequestModalOpen(true); }}
            className="w-full py-3.5 bg-[#063D2A] hover:bg-[#094E36] text-white text-xs font-bold rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-4 h-4 text-[#94EC36] transition-transform group-hover:rotate-90 duration-200" />
            <span>Request payment</span>
          </button>

          <nav className="space-y-1 pt-2">
            <button
              onClick={() => setCurrentTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'home' ? 'bg-[#F0F5EE] text-[#063D2A]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => setCurrentTab('projects')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'projects' ? 'bg-[#F0F5EE] text-[#063D2A]' : 'text-slate-500 hover:text-slate-900'
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
                currentTab === 'revisions' || currentTab === 'chat-thread' ? 'bg-[#F0F5EE] text-[#063D2A]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                <span>Revisions</span>
              </div>
              {unreadRevisionsCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#94EC36] animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setCurrentTab('wallet')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'wallet' ? 'bg-[#F0F5EE] text-[#063D2A]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Wallet</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button onClick={() => setProfileDrawerOpen(true)} className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition">
            <div className="w-9 h-9 rounded-full bg-[#FFD6A5] text-[#063D2A] text-xs font-bold flex items-center justify-center shrink-0 border border-white shadow-xs">
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AN'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">{user.displayName || user.email?.split('@')[0]}</div>
              <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
            </div>
          </button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 text-xs p-1" title="Sign Out">✕</button>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <header className="px-6 sm:px-10 pt-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-2xl bg-[#94EC36] text-[#063D2A] font-black text-xl flex items-center justify-center">
              P
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">paydrop</span>
          </div>

          <div className="hidden lg:block">
            <span className="text-xs font-medium text-slate-400">Wednesday, May 21</span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Good morning, {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Ankit'}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setAiDrawerOpen(true)} 
              className="w-10 h-10 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-95"
              title="AI Assistant"
            >
              <Sparkles className="w-4 h-4 text-[#063D2A]" />
            </button>

            <button 
              onClick={() => setProfileDrawerOpen(true)}
              className="w-10 h-10 rounded-full bg-[#FFD6A5] text-[#063D2A] font-bold text-xs flex items-center justify-center border border-white shadow-xs hover:opacity-90 transition"
            >
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AN'}
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-xl lg:max-w-3xl w-full mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">

          {/* TAB: HOME */}
          {currentTab === 'home' && (
            <div className="space-y-6">
              
              {/* HERO AVAILABLE BALANCE CARD */}
              <div className="bg-[#063D2A] rounded-[36px] p-7 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-[#063D2A]/15 backdrop-blur-xl">
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
                      {balanceVisible ? formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency) : '••••••'}
                    </div>
                    <p className="text-xs text-emerald-200/70 mt-1">Total settled earnings protected in escrow</p>
                  </div>
                </div>
              </div>

              {/* DYNAMIC MONTHLY EARNINGS BAR GRAPH */}
              <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[36px] p-7 shadow-xs space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">This month</h3>
                    <span className="text-xs text-slate-400 font-medium">May 1 – May 31</span>
                  </div>

                  <span className="px-3 py-1 bg-[#94EC36]/20 text-[#063D2A] border border-[#94EC36]/40 rounded-full text-xs font-black">
                    Live Real-time Data
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-2 items-end h-32 pt-4 px-1 relative">
                  {dynamicMonthlyStats.map((item, idx) => (
                    <div 
                      key={idx} 
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      className="flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group relative"
                    >
                      {hoveredBarIndex === idx && (
                        <div className="absolute -top-8 px-2 py-1 bg-slate-900 text-white text-[10px] font-mono rounded-lg shadow-xl animate-in fade-in duration-150 whitespace-nowrap z-20 pointer-events-none">
                          {item.month}: {item.amount}
                        </div>
                      )}

                      <div 
                        className={`w-full rounded-full transition-all duration-300 ${
                          hoveredBarIndex === idx ? 'bg-[#94EC36] shadow-md shadow-[#94EC36]/30 scale-y-105' : 'bg-slate-100 group-hover:bg-slate-200'
                        }`}
                        style={{ height: `${item.val}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Total earned</div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">{paidDeliveries.length} payments cleared</div>
                  </div>
                </div>
              </div>

              {/* ACTIVE PROJECTS LIST */}
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

                {deliveries.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-white/90 rounded-[32px] border border-slate-200/80 shadow-xs">
                    No active escrow projects yet. Tap '+' to request your first payment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveries.map(item => (
                      <div key={item.id} className="p-6 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[32px] shadow-xs space-y-4 hover:-translate-y-1 hover:border-slate-300 transition-all duration-200">
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
                            <div className="font-black text-base text-slate-900">{formatCurrency(item.grossAmount, item.currency || 'INR')}</div>
                            <div className="text-xs text-slate-400 font-medium mt-0.5">{item.status === 'Paid' ? 'Released' : 'In escrow'}</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${item.status === 'Paid' ? 'w-full bg-[#94EC36]' : 'w-2/3 bg-[#94EC36]'}`} />
                          </div>

                          <div className="flex items-center justify-between text-xs pt-0.5">
                            <span className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span className={`w-2 h-2 rounded-full ${item.status === 'Paid' ? 'bg-emerald-500' : 'bg-[#94EC36] animate-ping'}`} />
                              {item.status === 'Paid' ? 'Funds Released' : 'Funded • In Progress'}
                            </span>

                            <div className="flex items-center gap-2">
                              <button onClick={() => copyLink(item.id)} className="text-slate-500 font-bold hover:text-slate-900 transition">
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
                )}
              </div>

            </div>
          )}

          {/* TAB: PROJECTS */}
          {currentTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">All Projects</h1>
                <div className="relative w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200/80 rounded-2xl text-xs focus:outline-none focus:border-[#94EC36] transition"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredDeliveries.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-[32px]">No projects found.</div>
                ) : (
                  filteredDeliveries.map(item => (
                    <div key={item.id} className="p-6 bg-white border border-slate-200/80 rounded-[32px] flex items-center justify-between shadow-xs hover:border-slate-300 transition">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-400">Client: {item.clientName} • {item.files?.length || 0} file(s)</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs">{formatCurrency(item.grossAmount, item.currency || 'INR')}</span>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: REVISIONS LIST */}
          {currentTab === 'revisions' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Client Revisions</h1>
              <div className="space-y-3">
                {deliveries.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-[32px]">No revision threads found.</div>
                ) : (
                  deliveries.map(d => {
                    const hasMessages = d.messages && d.messages.length > 0
                    const lastMsg = hasMessages ? d.messages[d.messages.length - 1] : null
                    return (
                      <div key={d.id} className="p-6 bg-white border border-slate-200/80 rounded-[32px] flex justify-between items-center shadow-xs hover:border-slate-300 transition">
                        <div className="space-y-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900">{d.clientName}</h4>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-500 truncate">{d.title}</span>
                          </div>
                          <p className="text-xs text-slate-600 truncate">
                            {lastMsg ? lastMsg.text : 'No messages yet.'}
                          </p>
                        </div>
                        <button 
                          onClick={() => { setActiveThreadDelivery(d); setCurrentTab('chat-thread'); }} 
                          className="px-4 py-2.5 bg-[#063D2A] hover:bg-[#094E36] text-white font-bold text-xs rounded-2xl transition shrink-0"
                        >
                          Open Chat
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: CHAT THREAD (FULLSCREEN STUDIO VAULT) */}
          {currentTab === 'chat-thread' && activeThreadDelivery && (
            <div className="fixed inset-0 z-50 bg-[#F0F5EE] flex flex-col p-4 sm:p-8 animate-in fade-in duration-200">
              <div className="max-w-4xl w-full mx-auto bg-white border border-slate-200/80 rounded-[36px] flex-1 flex flex-col overflow-hidden shadow-2xl">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCurrentTab('revisions')} className="p-2 bg-[#F0F5EE] hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">{activeThreadDelivery.clientName}</h3>
                      <p className="text-xs text-slate-400">{activeThreadDelivery.title} • {formatCurrency(activeThreadDelivery.grossAmount, activeThreadDelivery.currency)}</p>
                    </div>
                  </div>

                  <Link href={`/d/${activeThreadDelivery.id}`} target="_blank" className="px-4 py-2 bg-[#063D2A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-[#094E36] transition">
                    <span>Portal</span> <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F0F5EE]">
                  {(activeThreadDelivery.messages || []).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">No revision notes yet. Start the conversation.</div>
                  ) : (
                    activeThreadDelivery.messages.map((m, idx) => {
                      const isCreator = m.sender === 'creator'
                      return (
                        <div key={idx} className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}>
                          <div className={`p-4 text-xs rounded-2xl max-w-md ${
                            isCreator ? 'bg-[#063D2A] text-white rounded-br-xs shadow-md' : 'bg-white text-slate-800 shadow-xs rounded-bl-xs'
                          }`}>
                            <p className="leading-relaxed">{m.text}</p>
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px]">
                    {["Working on this draft ✍️", "Uploaded revised files 📁", "Revision completed ✅"].map((pill, i) => (
                      <button
                        key={i}
                        onClick={() => setThreadReplyText(pill)}
                        className="px-3 py-1 bg-[#F0F5EE] hover:bg-slate-200 text-slate-700 font-semibold rounded-full shrink-0 transition"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type revision reply..."
                      value={threadReplyText}
                      onChange={e => setThreadReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendThreadReply(activeThreadDelivery.id)}
                      className="flex-1 bg-[#F0F5EE] px-4 py-3 rounded-2xl text-xs focus:outline-none focus:border-[#94EC36] transition"
                    />
                    <button 
                      onClick={() => handleSendThreadReply(activeThreadDelivery.id)} 
                      className="px-6 py-3 bg-[#063D2A] hover:bg-[#094E36] text-white text-xs font-bold rounded-2xl transition active:scale-95 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-[#94EC36]" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: WALLET */}
          {currentTab === 'wallet' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wallet & Payouts</h1>
              <div className="p-8 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[36px] space-y-4 shadow-xs">
                <div className="text-xs text-slate-400 font-medium">Available Balance for Bank Payout</div>
                <div className="text-4xl font-black text-[#063D2A] font-mono">{formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency)}</div>
                <p className="text-xs text-slate-500 leading-relaxed">Funds are securely locked in escrow and instantly released to your linked bank account upon client approval.</p>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* FLOATING PLUS ACTION BUTTON */}
      <button
        onClick={() => { setWizardStep(1); setRequestModalOpen(true); }}
        className="fixed bottom-24 right-6 sm:bottom-10 sm:right-10 z-40 w-14 h-14 rounded-full bg-[#063D2A] text-white flex items-center justify-center shadow-2xl shadow-[#063D2A]/40 transition hover:scale-105 active:scale-95"
      >
        <Plus className="w-7 h-7 text-[#94EC36]" />
      </button>

      {/* FULLSCREEN 4-STEP WIZARD MODAL */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#F0F5EE] flex flex-col p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="max-w-2xl w-full mx-auto bg-white border border-slate-200/80 rounded-[40px] flex-1 p-8 shadow-2xl flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">STEP {wizardStep} OF 4</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">Request a payment</h3>
                </div>
                <button 
                  onClick={() => setRequestModalOpen(false)} 
                  className="w-10 h-10 rounded-full bg-[#F0F5EE] hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#063D2A] h-full transition-all duration-300"
                  style={{ width: `${(wizardStep / 4) * 100}%` }}
                />
              </div>

              {/* STEP 1: FILE ATTACHMENTS */}
              {wizardStep === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                  <label className="text-xs font-bold text-slate-700 block">Attach Deliverables (ZIP, Videos, PDFs) *</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files); }}
                    className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${
                      isDragging ? 'border-[#063D2A] bg-emerald-50/50' : 'border-slate-200 bg-[#F0F5EE] hover:border-[#94EC36]'
                    }`}
                  >
                    <UploadCloud className="w-10 h-10 text-[#063D2A] mx-auto mb-3 animate-bounce" />
                    <span className="text-sm font-bold text-slate-800 block">Drop ZIP / Videos / Files here</span>
                    <label className="mt-4 inline-block px-5 py-2.5 bg-[#063D2A] text-white text-xs font-bold rounded-2xl cursor-pointer shadow-md transition hover:scale-105">
                      Browse Files
                      <input type="file" multiple onChange={e => handleFilesAdd(e.target.files)} className="hidden" />
                    </label>
                  </div>

                  {fileList.length > 0 && (
                    <div className="space-y-2 bg-[#F0F5EE] p-4 rounded-2xl border border-slate-200 max-h-40 overflow-y-auto">
                      {fileList.map((f, i) => (
                        <div key={i} className="flex justify-between text-xs items-center px-1">
                          <span className="truncate max-w-[280px] font-medium text-slate-800 flex items-center gap-2">
                            {f.type.startsWith('video/') ? <Film className="w-4 h-4 text-blue-600" /> : 
                             f.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-emerald-600" /> : 
                             <File className="w-4 h-4 text-slate-600" />}
                            {f.name}
                          </span>
                          <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: DETAILS */}
              {wizardStep === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Client Email *</label>
                    <input
                      type="email"
                      placeholder="client@company.com"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full px-4 py-3.5 bg-[#F0F5EE] border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#94EC36] transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Project Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Website redesign"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-4 py-3.5 bg-[#F0F5EE] border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#94EC36] transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Handover Message</label>
                    <textarea
                      rows={3}
                      placeholder="Final master draft attached. Unlocks upon escrow release."
                      value={clientMessage}
                      onChange={e => setClientMessage(e.target.value)}
                      className="w-full px-4 py-3.5 bg-[#F0F5EE] border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#94EC36] transition"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: PRICE & WATERMARK */}
              {wizardStep === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Escrow Amount *</label>
                    <div className="flex bg-[#F0F5EE] border border-slate-200 rounded-2xl overflow-hidden focus-within:border-[#94EC36] transition">
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
                        className="w-full px-4 py-3.5 bg-transparent text-xs font-bold text-slate-900 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Link Expiry</label>
                    <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                      {['7', '14', '30', 'never'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setExpirySelection(opt)}
                          className={`py-3 rounded-2xl border transition ${
                            expirySelection === opt ? 'bg-[#94EC36]/20 border-[#063D2A] text-[#063D2A] font-bold' : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {opt === 'never' ? 'Never' : `${opt} Days`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: FINAL REVIEW & DEPLOY */}
              {wizardStep === 4 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div className="p-6 bg-[#F0F5EE] rounded-3xl space-y-3 text-xs font-medium border border-slate-200">
                    <div className="flex justify-between font-extrabold text-sm text-slate-900 border-b border-slate-200 pb-3">
                      <span>{title}</span>
                      <span>{formatCurrency(amount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1">
                      <span>Client: {clientEmail}</span>
                      <span>{fileList.length} files attached</span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#94EC36]/15 border border-[#94EC36]/30 rounded-2xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#063D2A] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#063D2A] leading-relaxed font-semibold">
                      Your client funds the escrow first. You get paid when the approved work is delivered.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="pt-6 border-t border-slate-100">
              {wizardStep === 1 && (
                <button
                  disabled={fileList.length === 0}
                  onClick={() => setWizardStep(2)}
                  className="w-full py-4 bg-[#063D2A] hover:bg-[#094E36] disabled:opacity-40 text-white font-bold text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Next: Project Details</span>
                  <ArrowRight className="w-4 h-4 text-[#94EC36]" />
                </button>
              )}

              {wizardStep === 2 && (
                <div className="flex gap-3">
                  <button onClick={() => setWizardStep(1)} className="w-1/3 py-4 border border-slate-200 text-slate-600 font-bold text-xs rounded-2xl">Back</button>
                  <button
                    disabled={!clientEmail || !title}
                    onClick={() => setWizardStep(3)}
                    className="w-2/3 py-4 bg-[#063D2A] hover:bg-[#094E36] disabled:opacity-40 text-white font-bold text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <span>Next: Pricing</span>
                    <ArrowRight className="w-4 h-4 text-[#94EC36]" />
                  </button>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="flex gap-3">
                  <button onClick={() => setWizardStep(2)} className="w-1/3 py-4 border border-slate-200 text-slate-600 font-bold text-xs rounded-2xl">Back</button>
                  <button
                    disabled={!amount}
                    onClick={() => setWizardStep(4)}
                    className="w-2/3 py-4 bg-[#063D2A] hover:bg-[#094E36] disabled:opacity-40 text-white font-bold text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <span>Review & Deploy</span>
                    <ArrowRight className="w-4 h-4 text-[#94EC36]" />
                  </button>
                </div>
              )}

              {wizardStep === 4 && (
                uploading ? (
                  <div className="p-4 bg-[#063D2A] text-white rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Uploading & Deploying Vault...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#08422E] rounded-full overflow-hidden">
                      <div className="h-full bg-[#94EC36] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => setWizardStep(3)} className="w-1/3 py-4 border border-slate-200 text-slate-600 font-bold text-xs rounded-2xl">Back</button>
                    <button
                      onClick={handleDeployVault}
                      className="w-2/3 py-4 bg-[#063D2A] hover:bg-[#094E36] text-white font-bold text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4 text-[#94EC36]" />
                      <span>Create secure payment</span>
                    </button>
                  </div>
                )
              )}
            </div>

          </div>
        </div>
      )}

      {/* AI ASSISTANT DRAWER */}
      {aiDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-80 bg-white h-full p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#063D2A]" />
                  <span className="font-bold text-sm text-slate-900">AI Escrow Assistant</span>
                </div>
                <button onClick={() => setAiDrawerOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <div className="p-4 bg-[#F0F5EE] rounded-2xl text-xs space-y-2">
                <div className="font-bold text-[#063D2A]">💡 Quick Insights</div>
                <p className="text-slate-600 leading-relaxed">
                  You have {paidDeliveries.length} cleared payouts totaling {formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency)}.
                </p>
              </div>
            </div>

            <button onClick={() => setAiDrawerOpen(false)} className="w-full py-3 bg-[#063D2A] text-white font-bold text-xs rounded-2xl">
              Close Assistant
            </button>
          </div>
        </div>
      )}

      {/* PROFILE SETTINGS DRAWER */}
      {profileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-80 bg-white h-full p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-sm text-slate-900">Account Settings</span>
                <button onClick={() => setProfileDrawerOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#FFD6A5] text-[#063D2A] font-bold flex items-center justify-center text-sm border border-white shadow-xs">
                  {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AN'}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">{user.displayName || 'Ankit'}</div>
                  <div className="text-[10px] text-slate-400">{user.email}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-semibold text-slate-700">
                <button onClick={() => showToast("Payout settings updated", "success")} className="w-full text-left p-3 bg-[#F0F5EE] rounded-xl flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#063D2A]" /> Bank & UPI Details
                </button>
                <button onClick={handleLogout} className="w-full text-left p-3 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2 font-bold">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
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
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Revisions</span>
          {unreadRevisionsCount > 0 && (
            <span className="absolute top-0 right-3 w-2 h-2 rounded-full bg-[#94EC36] animate-pulse" />
          )}
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
