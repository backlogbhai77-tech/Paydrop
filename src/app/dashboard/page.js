'use client'

import React, { useState, useEffect, useRef } from 'react'
import { auth, db } from '../../lib/firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { 
  collection, addDoc, query, where, deleteDoc, doc, updateDoc, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore'
import { 
  Plus, MessageSquare, UploadCloud, Lock, ExternalLink, 
  Trash2, X, Search, Wallet, ShieldCheck, Eye, EyeOff,
  Home, Briefcase, ChevronRight, Sparkles, File, Film, Image as ImageIcon,
  Send, Bot, ArrowRight, ArrowLeft, Share2, Info, TrendingUp
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "releasedrop_vault"

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount)
  if (isNaN(num)) return currency === 'USD' ? '$0' : '₹0'
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num)
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
}

export default function OptimizedDashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const [currentTab, setCurrentTab] = useState('home')
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [balanceVisible, setBalanceVisible] = useState(true)

  // Drawer Modals
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)

  // Fullscreen Wizard
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [expirySelection, setExpirySelection] = useState('7')
  const [watermarkText] = useState('PAYDROP • PREVIEW COPY')
  
  const [fileList, setFileList] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Revision Chat
  const [activeThreadDelivery, setActiveThreadDelivery] = useState(null)
  const [threadReplyText, setThreadReplyText] = useState('')
  const chatBottomRef = useRef(null)

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
            const updated = docs.find(d => d.id === activeThreadDelivery.id)
            if (updated) setActiveThreadDelivery(updated)
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
      showToast("Complete all steps and attach at least one file", "error")
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

      const newDocRef = await addDoc(collection(db, 'deliveries'), {
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

      const clientPortalUrl = `${window.location.origin}/d/${newDocRef.id}`
      if (clientEmail) {
        try {
          await fetch('/api/send-delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientEmail: clientEmail.trim(),
              clientName: clientName.trim() || 'Client',
              creatorName: user.displayName || user.email?.split('@')[0] || 'Creator',
              projectTitle: title.trim(),
              amount: numAmount,
              deliveryUrl: clientPortalUrl
            })
          })
        } catch (emailErr) {
          console.error("Email dispatch failed:", emailErr)
        }
      }

      showToast("Vault deployed & background email sent!", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setFileList([])
      setWizardStep(1)
      setRequestModalOpen(false)
    } catch (err) {
      showToast(err.message || "Failed to create vault", "error")
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

  const shareProject = (item) => {
    const url = `${window.location.origin}/d/${item.id}`
    if (navigator.share) {
      navigator.share({
        title: `PayDrop Escrow: ${item.title}`,
        text: `Review protected deliverables for ${item.title}`,
        url: url,
      }).catch(() => copyLink(item.id))
    } else {
      copyLink(item.id)
    }
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
      showToast("Failed to send reply", "error")
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

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const totalRevenueINR = paidDeliveries.filter(d => (d.currency || 'INR') === 'INR').reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const totalRevenueUSD = paidDeliveries.filter(d => d.currency === 'USD').reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const unreadRevisions = deliveries.filter(d => d.messages && d.messages.length > 0 && d.messages[d.messages.length - 1].sender === 'client')

  const filteredDeliveries = deliveries.filter(d => 
    d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentYear = new Date().getFullYear()
  
  const monthlyDataPoints = monthNames.map((m, i) => {
    const monthItems = paidDeliveries.filter(d => {
      const dDate = d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000) : new Date()
      return dDate.getMonth() === i && dDate.getFullYear() === currentYear
    })
    const sum = monthItems.reduce((acc, c) => acc + (Number(c.grossAmount) || 0), 0)
    return { month: m, amount: sum }
  })

  const totalRevenueAll = monthlyDataPoints.reduce((acc, p) => acc + p.amount, 0)
  const maxVal = Math.max(...monthlyDataPoints.map(p => p.amount), 10000)
  
  const chartPoints = monthlyDataPoints.map((p, idx) => {
    const x = (idx / 11) * 280
    const y = 60 - (p.amount / maxVal) * 50
    return { x, y, month: p.month, amount: p.amount }
  })

  const svgPathD = chartPoints.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  }, '')
  const areaPathD = `${svgPathD} L 280 80 L 0 80 Z`

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECFDF5] flex flex-col items-center justify-center text-xs text-emerald-800 gap-3 font-mono">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span>INITIALIZING DASHBOARD...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#ECFDF5] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-emerald-800 mb-4 font-mono">Session expired.</p>
        <Link href="/" className="px-6 py-3 bg-emerald-800 text-white text-xs font-bold rounded-2xl">
          Return to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-900 font-sans flex antialiased pb-32 lg:pb-8 relative selection:bg-lime-300 selection:text-emerald-950">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div className="glass-mint-dark flex items-center gap-2 px-5 py-2.5 rounded-full shadow-2xl text-white text-xs font-semibold border border-lime-400/40">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 glass-mint border-r border-emerald-200/60 flex-col justify-between p-6 sticky top-0 h-screen z-30 select-none shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentTab('home')} className="flex items-center gap-2.5 text-left group">
              <div className="w-10 h-10 rounded-2xl bg-lime-400 text-emerald-950 font-black text-xl flex items-center justify-center shadow-md shadow-lime-500/20 transition-transform group-hover:scale-105">
                P
              </div>
              <span className="font-black text-2xl tracking-tight text-emerald-950">paydrop</span>
            </button>

            <button onClick={() => setAiDrawerOpen(true)} className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-emerald-800 transition shadow-xs" title="AI Assistant">
              <Sparkles className="w-4 h-4 text-emerald-700" />
            </button>
          </div>

          <button
            onClick={() => { setWizardStep(1); setRequestModalOpen(true); }}
            className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-4 h-4 text-lime-400 transition-transform group-hover:rotate-90 duration-200" />
            <span>+ Secure Link</span>
          </button>

          <nav className="space-y-1 pt-2">
            <button
              onClick={() => setCurrentTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'home' ? 'bg-emerald-800 text-white shadow-md' : 'text-emerald-800 hover:text-emerald-950 hover:bg-white/50'
              }`}
            >
              <Home className={`w-4 h-4 ${currentTab === 'home' ? 'text-lime-400' : ''}`} />
              <span>Home</span>
            </button>

            <button
              onClick={() => setCurrentTab('projects')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'projects' ? 'bg-emerald-800 text-white shadow-md' : 'text-emerald-800 hover:text-emerald-950 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase className={`w-4 h-4 ${currentTab === 'projects' ? 'text-lime-400' : ''}`} />
                <span>Projects</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${currentTab === 'projects' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {deliveries.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('revisions')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'revisions' || currentTab === 'chat-thread' ? 'bg-emerald-800 text-white shadow-md' : 'text-emerald-800 hover:text-emerald-950 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className={`w-4 h-4 ${currentTab === 'revisions' || currentTab === 'chat-thread' ? 'text-lime-400' : ''}`} />
                <span>Revisions</span>
              </div>
              {unreadRevisions.length > 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white font-mono text-[9px] rounded-full font-black animate-pulse">
                  {unreadRevisions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('wallet')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'wallet' ? 'bg-emerald-800 text-white shadow-md' : 'text-emerald-800 hover:text-emerald-950 hover:bg-white/50'
              }`}
            >
              <Wallet className={`w-4 h-4 ${currentTab === 'wallet' ? 'text-lime-400' : ''}`} />
              <span>Wallet</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-emerald-200/60 flex items-center justify-between">
          <button onClick={() => setProfileDrawerOpen(true)} className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition">
            <div className="w-9 h-9 rounded-full bg-lime-200 text-emerald-950 text-xs font-bold flex items-center justify-center shrink-0 border border-white shadow-xs">
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AN'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-emerald-950 truncate">{user.displayName || user.email?.split('@')[0]}</div>
              <div className="text-[10px] text-emerald-700 truncate">{user.email}</div>
            </div>
          </button>
          <button onClick={handleLogout} className="text-emerald-600 hover:text-rose-600 text-xs p-1" title="Sign Out">✕</button>
        </div>
      </aside>

      {/* MAIN CONTENT VIEW */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER BAR */}
        <header className="px-5 sm:px-10 pt-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-2xl bg-lime-400 text-emerald-950 font-black text-xl flex items-center justify-center shadow-sm">
              P
            </div>
            <span className="font-black text-2xl tracking-tight text-emerald-950">paydrop</span>
          </div>

          <div className="hidden lg:block">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider font-mono">Freelancer Escrow Engine</span>
            <h1 className="text-xl font-extrabold text-emerald-950 tracking-tight">Dashboard Overview</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setAiDrawerOpen(true)} 
              className="w-9 h-9 rounded-full glass-mint flex items-center justify-center text-emerald-800 shadow-xs hover:scale-105 transition"
              title="AI Assistant"
            >
              <Sparkles className="w-4 h-4 text-emerald-700" />
            </button>

            {/* HIGH-CONTRAST TOP-RIGHT TOKEN AS SPECIFIED */}
            <button 
              onClick={() => setProfileDrawerOpen(true)}
              className="px-3 py-1.5 rounded-full bg-slate-900 text-emerald-400 font-mono text-xs font-black border border-slate-700 shadow-md flex items-center gap-1 hover:bg-slate-800 transition"
            >
              <span>// AM</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-2xl lg:max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5 animate-in fade-in duration-200">

          {/* HOME TAB */}
          {currentTab === 'home' && (
            <div className="space-y-5">
              
              {/* 1. TOP WALLET CARD FIXES */}
              <div className="glass-mint-dark rounded-[32px] p-6 sm:p-7 text-white relative overflow-hidden shadow-2xl border border-emerald-600/50">
                <div className="absolute -right-12 -top-12 w-56 h-56 bg-emerald-700 rounded-full blur-2xl pointer-events-none opacity-40" />

                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    {/* EXPLICIT "Protected in Escrow" LABEL WITH INFO ICON */}
                    <div className="flex items-center gap-1.5 bg-emerald-900/80 px-3 py-1 rounded-full border border-emerald-700/60">
                      <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
                      <span className="text-xs font-bold text-emerald-100 tracking-tight">Protected in Escrow</span>
                      <Info className="w-3.5 h-3.5 text-lime-400/80 cursor-pointer ml-0.5 hover:text-white transition" title="Funds held safely until client approves deliverables" />
                    </div>

                    <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-1 text-emerald-300 hover:text-white transition">
                      {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>

                  <div>
                    <div className="text-3xl sm:text-4xl font-black font-mono-data tracking-tight text-white">
                      {balanceVisible ? formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency) : '••••••'}
                    </div>
                    
                    {/* ENHANCED CONTRAST HELPER TEXT */}
                    <p className="text-xs font-semibold text-emerald-100 mt-1.5 leading-relaxed bg-emerald-900/40 px-3 py-1.5 rounded-xl inline-block border border-emerald-700/40">
                      🔒 Zero-risk payouts • Client deposits locked prior to deliverable handover
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. MIDDLE REVENUE GRAPH CARD FIXES (REDUCED HEIGHT & Y-AXIS LABELS) */}
              <div className="glass-mint rounded-[28px] p-5 shadow-xs space-y-3 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-800" />
                    <h3 className="text-sm font-extrabold text-emerald-950 tracking-tight">Revenue Trend ({currentYear})</h3>
                  </div>

                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="px-2.5 py-1 bg-white/90 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-900 focus:outline-none cursor-pointer"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                {totalRevenueAll === 0 ? (
                  /* CLEAN EMPTY-STATE ILLUSTRATION/MICROCOPY */
                  <div className="py-7 px-4 text-center bg-white/60 rounded-2xl border border-dashed border-emerald-300 space-y-1.5">
                    <div className="w-8 h-8 rounded-full bg-lime-200 text-emerald-900 flex items-center justify-center mx-auto text-xs font-bold">₹</div>
                    <p className="text-xs font-bold text-emerald-950">No Escrow Revenue Yet</p>
                    <p className="text-[11px] text-emerald-800 font-medium max-w-xs mx-auto">
                      Your protected revenue timeline will appear here once links are generated and funded.
                    </p>
                  </div>
                ) : (
                  /* COMPACT GRAPH WITH EXPLICIT HIGH-READABILITY Y-AXIS LABELS */
                  <div className="flex gap-2 items-center pt-1">
                    {/* Y-AXIS LABELS */}
                    <div className="flex flex-col justify-between h-20 text-[10px] font-mono font-bold text-emerald-800 shrink-0">
                      <span>10k</span>
                      <span>5k</span>
                      <span>0</span>
                    </div>

                    <div className="relative flex-1 h-20">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 280 80" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#84CC16" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#84CC16" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        <path d={areaPathD} fill="url(#chartGradient)" />
                        <path d={svgPathD} fill="none" stroke="#064E3B" strokeWidth="2.5" strokeLinecap="round" />

                        {chartPoints.map((pt, idx) => (
                          <circle key={idx} cx={pt.x} cy={pt.y} r="3" className="fill-emerald-900" />
                        ))}
                      </svg>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-[9px] text-emerald-800 font-mono font-semibold pt-1 border-t border-emerald-200/50">
                  {monthNames.map((m, i) => <span key={i}>{m}</span>)}
                </div>
              </div>

              {/* 4. ACTIVE PROJECTS & SPACING (SHIFTED HIGHER, VISIBLE 2+ ROWS WITH STATUS BADGES) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-950 tracking-tight">Active Projects</h3>
                    <p className="text-[11px] text-emerald-800 font-medium">Protected escrow deliverables</p>
                  </div>
                  <button onClick={() => setCurrentTab('projects')} className="text-xs font-bold text-emerald-800 hover:underline">
                    View all ({deliveries.length})
                  </button>
                </div>

                {deliveries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-emerald-800 glass-mint rounded-2xl font-mono">
                    [ NO ACTIVE VAULTS DEPLOYED ]
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {deliveries.map(item => {
                      const isPaid = item.status === 'Paid'
                      return (
                        <div key={item.id} className="p-4 glass-mint rounded-2xl shadow-xs space-y-3 hover:border-emerald-400 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-lime-300/80 text-emerald-950 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                                {item.clientName ? item.clientName.slice(0, 2).toUpperCase() : 'CL'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-emerald-950 tracking-tight truncate">{item.title}</h4>
                                  
                                  {/* DISTINCT REQUIRED STATUS BADGES */}
                                  {isPaid ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-mono text-[10px] font-extrabold shrink-0">
                                      ✓ Funded
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-mono text-[10px] font-extrabold shrink-0">
                                      🔒 Files Locked
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-emerald-800 mt-0.5 truncate">Client: {item.clientEmail}</p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-bold text-sm text-emerald-950 font-mono-data">{formatCurrency(item.grossAmount, item.currency || 'INR')}</div>
                              <div className="text-[10px] text-emerald-700 font-semibold">{isPaid ? 'Released' : 'Escrow Pending'}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-2 border-t border-emerald-200/50">
                            <span className="text-[11px] font-bold text-emerald-900">
                              {item.files?.length || 0} master file(s) attached
                            </span>

                            <div className="flex items-center gap-3">
                              <button onClick={() => shareProject(item)} className="p-1 bg-white hover:bg-emerald-50 rounded-lg text-emerald-800 transition" title="Share">
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => copyLink(item.id)} className="text-emerald-800 font-bold text-xs hover:text-emerald-950">
                                {copiedId === item.id ? 'Copied!' : 'Copy Link'}
                              </button>
                              <span className="text-emerald-300">•</span>
                              <Link href={`/d/${item.id}`} target="_blank" className="text-emerald-800 font-bold flex items-center gap-0.5 hover:underline">
                                <span>Portal</span> <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* PROJECTS TAB */}
          {currentTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl font-extrabold text-emerald-950 tracking-tight">All Deliverables</h1>
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 glass-mint rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredDeliveries.map(item => (
                  <div key={item.id} className="p-4 glass-mint rounded-2xl flex items-center justify-between gap-4 shadow-xs">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-emerald-950 truncate">{item.title}</h4>
                      <p className="text-[11px] text-emerald-700 truncate">{item.clientEmail} • {item.files?.length || 0} files</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-xs font-mono-data">{formatCurrency(item.grossAmount, item.currency || 'INR')}</span>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REVISIONS TAB */}
          {currentTab === 'revisions' && (
            <div className="space-y-4">
              <h1 className="text-xl font-extrabold text-emerald-950 tracking-tight">Client Revisions</h1>
              <div className="space-y-2.5">
                {deliveries.map(d => (
                  <div key={d.id} className="p-4 glass-mint rounded-2xl flex justify-between items-center gap-4">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-emerald-950 truncate">{d.clientName} ({d.title})</h4>
                      <p className="text-[11px] text-emerald-700 truncate">{d.messages?.length ? d.messages[d.messages.length - 1].text : 'No revision notes yet.'}</p>
                    </div>
                    <button onClick={() => { setActiveThreadDelivery(d); setCurrentTab('chat-thread'); }} className="px-3.5 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl shrink-0">
                      Open
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WALLET TAB */}
          {currentTab === 'wallet' && (
            <div className="space-y-4">
              <h1 className="text-xl font-extrabold text-emerald-950 tracking-tight">Bank Settlement</h1>
              <div className="p-6 glass-mint rounded-2xl space-y-2">
                <div className="text-xs text-emerald-700 font-semibold">Available Settlement Balance</div>
                <div className="text-3xl font-black text-emerald-950 font-mono-data">{formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency)}</div>
                <p className="text-xs text-emerald-800">Directly deposited to bank account upon escrow release.</p>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* 3. REPOSITIONED FAB BUTTON (EXPANDED PILL BUTTON "+ SECURE LINK" AT BOTTOM RIGHT ABOVE NAV BAR) */}
      <button
        onClick={() => { setWizardStep(1); setRequestModalOpen(true); }}
        className="fixed bottom-24 right-5 z-40 px-5 py-3 rounded-full bg-emerald-800 text-white font-extrabold text-xs shadow-2xl transition hover:scale-105 active:scale-95 flex items-center gap-2 border border-lime-400/50"
      >
        <Plus className="w-4 h-4 text-lime-400" />
        <span>+ Secure Link</span>
      </button>

      {/* 5. BOTTOM NAVIGATION BAR (WITH 16px+ / pb-6 SAFE-AREA PADDING) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-emerald-200/80 px-6 pt-3 pb-6 flex items-center justify-between shadow-2xl">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'projects', label: 'Projects', icon: Briefcase },
          { id: 'revisions', label: 'Revisions', icon: MessageSquare, badge: unreadRevisions.length },
          { id: 'wallet', label: 'Wallet', icon: Wallet }
        ].map(tab => {
          const Icon = tab.icon
          const active = currentTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center gap-1 transition ${
                active ? 'text-emerald-900 font-black scale-105' : 'text-emerald-600/80 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-emerald-800' : 'text-emerald-600/70'}`} />
              <span className={`text-[10px] ${active ? 'font-black text-emerald-950' : 'font-semibold'}`}>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping absolute top-2" />
              )}
            </button>
          )
        })}
      </div>

      {/* FULLSCREEN WIZARD MODAL */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-emerald-950/40 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="max-w-xl w-full mx-auto glass-mint rounded-[36px] flex-1 p-6 sm:p-8 shadow-2xl flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-5">
              <div className="flex items-start justify-between border-b border-emerald-200/60 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest font-mono">STEP {wizardStep} OF 4</span>
                  <h3 className="text-xl font-black text-emerald-950 tracking-tight mt-0.5">Generate Escrow Link</h3>
                </div>
                <button 
                  onClick={() => setRequestModalOpen(false)} 
                  className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-emerald-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {wizardStep === 1 && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-emerald-900 block">Attach Master Files *</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files); }}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      isDragging ? 'border-emerald-800 bg-emerald-100/50' : 'border-emerald-300/80 bg-white/60'
                    }`}
                  >
                    <UploadCloud className="w-8 h-8 text-emerald-800 mx-auto mb-2 animate-bounce" />
                    <span className="text-xs font-bold text-emerald-950 block">Drop ZIP / Videos / Code files</span>
                    <label className="mt-3 inline-block px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md">
                      Browse Files
                      <input type="file" multiple onChange={e => handleFilesAdd(e.target.files)} className="hidden" />
                    </label>
                  </div>

                  {fileList.length > 0 && (
                    <div className="space-y-1.5 bg-white/80 p-3 rounded-xl border border-emerald-200/80 max-h-36 overflow-y-auto">
                      {fileList.map((f, i) => (
                        <div key={i} className="flex justify-between text-xs items-center px-1">
                          <span className="truncate max-w-[240px] font-medium text-emerald-950 flex items-center gap-2">
                            <File className="w-3.5 h-3.5 text-emerald-700" />
                            {f.name}
                          </span>
                          <button onClick={() => removeFile(i)} className="text-emerald-500 hover:text-rose-600 font-bold">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-emerald-900 block mb-1">Client Email *</label>
                    <input
                      type="email"
                      placeholder="client@company.com"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white/90 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-950 focus:outline-none focus:border-lime-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-emerald-900 block mb-1">Project Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Website Redesign & Source Code"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white/90 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-950 focus:outline-none focus:border-lime-500"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-emerald-900 block mb-1">Escrow Amount *</label>
                    <div className="flex bg-white/90 border border-emerald-200 rounded-xl overflow-hidden">
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="px-3 py-2 bg-transparent text-xs font-bold text-emerald-800 focus:outline-none border-r border-emerald-200 cursor-pointer"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-transparent text-xs font-bold text-emerald-950 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="p-4 bg-white/90 rounded-2xl space-y-2 text-xs font-medium border border-emerald-200/80">
                  <div className="flex justify-between font-extrabold text-sm text-emerald-950 border-b border-emerald-200 pb-2">
                    <span>{title}</span>
                    <span>{formatCurrency(amount, currency)}</span>
                  </div>
                  <div className="text-emerald-800">Client: {clientEmail}</div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-emerald-200/60 flex gap-2">
              {wizardStep > 1 && (
                <button onClick={() => setWizardStep(s => s - 1)} className="w-1/3 py-3 border border-emerald-200 bg-white/70 text-emerald-800 font-bold text-xs rounded-xl">Back</button>
              )}
              {wizardStep < 4 ? (
                <button onClick={() => setWizardStep(s => s + 1)} className="w-full py-3 bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md">Next Step</button>
              ) : (
                <button onClick={handleDeployVault} className="w-full py-3 bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md">Deploy Escrow Link</button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* AI DRAWER */}
      {aiDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-emerald-950/40 backdrop-blur-md flex justify-end">
          <div className="w-80 glass-mint h-full p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <span className="font-bold text-sm text-emerald-950">AI Assistant</span>
                <button onClick={() => setAiDrawerOpen(false)}>✕</button>
              </div>
              <p className="text-xs text-emerald-800">All {paidDeliveries.length} vaults active & secured.</p>
            </div>
            <button onClick={() => setAiDrawerOpen(false)} className="w-full py-2.5 bg-emerald-800 text-white text-xs font-bold rounded-xl">Close</button>
          </div>
        </div>
      )}

      {/* PROFILE DRAWER */}
      {profileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-emerald-950/40 backdrop-blur-md flex justify-end">
          <div className="w-80 glass-mint h-full p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <span className="font-bold text-sm text-emerald-950">Account</span>
                <button onClick={() => setProfileDrawerOpen(false)}>✕</button>
              </div>
              <div className="text-xs font-bold text-emerald-950">{user.email}</div>
            </div>
            <button onClick={handleLogout} className="w-full py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl">Sign Out</button>
          </div>
        </div>
      )}

    </div>
  )
}
