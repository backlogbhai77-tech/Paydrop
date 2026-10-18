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
  Trash2, RefreshCw, X, Search, Wallet, ShieldCheck, Eye, EyeOff,
  Home, Briefcase, ChevronRight, Sparkles, File, Film, Image as ImageIcon,
  Send, Bot, ArrowRight, ArrowLeft, Share2, Shield, CheckCircle
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "releasedrop_vault"

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount)
  if (isNaN(num)) return currency === 'USD' ? '$0.00' : '₹0'
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
}

export default function CompleteStudioDashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const [currentTab, setCurrentTab] = useState('home')
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [activeChartPoint, setActiveChartPoint] = useState(null)

  // Drawer Modals
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)

  // Fullscreen Wizard States
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

      // BACKGROUND EMAIL DISPATCH VIA CORRECT API ROUTE
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

      showToast("Vault deployed & background email dispatched!", "success")
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

  // AREA CHART DATA GENERATOR
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

  const maxVal = Math.max(...monthlyDataPoints.map(p => p.amount), 5000)
  const chartPoints = monthlyDataPoints.map((p, idx) => {
    const x = (idx / 11) * 300
    const y = 100 - (p.amount / maxVal) * 80
    return { x, y, month: p.month, amount: p.amount }
  })

  const svgPathD = chartPoints.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  }, '')
  const areaPathD = `${svgPathD} L 300 120 L 0 120 Z`

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-xs text-slate-500 gap-3 font-mono">
        <div className="w-6 h-6 border-2 border-[#072217] border-t-transparent rounded-full animate-spin" />
        <span>[ INITIALIZING STUDIO VAULT ENGINE... ]</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-slate-500 mb-4 font-mono">Authentication session expired.</p>
        <Link href="/" className="px-6 py-2.5 bg-[#072217] text-white text-xs font-bold rounded-lg shadow-sm">
          Return to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex antialiased pb-28 lg:pb-8 relative selection:bg-emerald-200 selection:text-[#072217]">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-[#072217] text-white text-xs font-semibold border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* DEVELOPER SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between p-6 sticky top-0 h-screen z-30 select-none shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentTab('home')} className="flex items-center gap-2.5 text-left group">
              <div className="w-8 h-8 rounded-lg bg-[#072217] text-emerald-400 font-black text-base flex items-center justify-center shadow-xs">
                P
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">PayDrop Studio</span>
            </button>

            <button onClick={() => setAiDrawerOpen(true)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200/70 flex items-center justify-center text-slate-600 transition" title="AI Assistant">
              <Sparkles className="w-4 h-4 text-[#072217]" />
            </button>
          </div>

          <button
            onClick={() => { setWizardStep(1); setRequestModalOpen(true); }}
            className="w-full py-3 bg-[#072217] hover:bg-[#0b3827] text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New Escrow Vault</span>
          </button>

          <nav className="space-y-1">
            <button
              onClick={() => setCurrentTab('home')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition ${
                currentTab === 'home' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setCurrentTab('projects')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition ${
                currentTab === 'projects' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4" />
                <span>Deliverables</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                {deliveries.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('revisions')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition ${
                currentTab === 'revisions' || currentTab === 'chat-thread' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                <span>Revisions & Chat</span>
              </div>
              {unreadRevisions.length > 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white font-mono text-[9px] rounded-full font-black animate-pulse">
                  {unreadRevisions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('wallet')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition ${
                currentTab === 'wallet' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Settlement & Payout</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button onClick={() => setProfileDrawerOpen(true)} className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#072217] text-xs font-bold flex items-center justify-center shrink-0 border border-emerald-200">
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AN'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">{user.displayName || user.email?.split('@')[0]}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{user.email}</div>
            </div>
          </button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 text-xs p-1" title="Sign Out">✕</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <header className="px-6 sm:px-10 pt-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#072217] text-emerald-400 font-black text-lg flex items-center justify-center">
              P
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">PayDrop</span>
          </div>

          <div className="hidden lg:block">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">STUDIO CONTROL PORTAL</span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Welcome back, {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Ankit'}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setAiDrawerOpen(true)} 
              className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-50 transition"
              title="AI Assistant"
            >
              <Sparkles className="w-4 h-4 text-[#072217]" />
            </button>

            <button 
              onClick={() => setProfileDrawerOpen(true)}
              className="w-9 h-9 rounded-full bg-emerald-100 text-[#072217] font-bold text-xs flex items-center justify-center border border-emerald-200 shadow-xs"
            >
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AN'}
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-2xl lg:max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">

          {/* HOME OVERVIEW TAB */}
          {currentTab === 'home' && (
            <div className="space-y-6">
              
              {/* HERO BALANCE CARD */}
              <div className="bg-[#072217] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-200/80">
                      <span>Available Escrow Balance</span>
                      <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-1 text-emerald-300 hover:text-white transition">
                        {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>

                  <div>
                    <div className="text-4xl sm:text-5xl font-extrabold font-mono-data tracking-tight text-white">
                      {balanceVisible ? formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency) : '••••••'}
                    </div>
                    <p className="text-xs text-emerald-200/70 mt-1">Total settled earnings protected in escrow</p>
                  </div>
                </div>
              </div>

              {/* REVENUE AREA CHART */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Revenue Trend ({currentYear})</h3>
                    <span className="text-xs text-slate-400 font-medium">Real-time escrow settlement velocity</span>
                  </div>

                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                <div className="relative h-40 pt-4">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <path d={areaPathD} fill="url(#chartGradient)" />
                    <path d={svgPathD} fill="none" stroke="#072217" strokeWidth="2.5" strokeLinecap="round" />

                    {chartPoints.map((pt, idx) => (
                      <g key={idx} className="group cursor-pointer" onMouseEnter={() => setActiveChartPoint(pt)}>
                        <circle cx={pt.x} cy={pt.y} r="3.5" className="fill-[#072217] group-hover:fill-emerald-500 transition-all" />
                      </g>
                    ))}
                  </svg>

                  {activeChartPoint && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900 text-white text-[10px] font-mono rounded-md shadow-xl">
                      {activeChartPoint.month}: {formatCurrency(activeChartPoint.amount, currency)}
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100">
                  {monthNames.map((m, i) => <span key={i}>{m}</span>)}
                </div>
              </div>

              {/* ACTIVE PROJECTS LIST */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Active Deliverables</h3>
                    <p className="text-xs text-slate-400">Payments locked in escrow vault</p>
                  </div>
                  <button onClick={() => setCurrentTab('projects')} className="text-xs font-semibold text-[#072217] hover:underline">
                    View all
                  </button>
                </div>

                {deliveries.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80 font-mono">
                    [ NO ACTIVE VAULTS DEPLOYED ]
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveries.map(item => (
                      <div key={item.id} className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3 hover:border-slate-300 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#072217] font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-100">
                              {item.clientName ? item.clientName.slice(0, 2).toUpperCase() : 'CL'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 tracking-tight truncate">{item.title}</h4>
                              <p className="text-xs text-slate-400 truncate">with {item.clientName} ({item.clientEmail})</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-bold text-sm text-slate-900 font-mono-data">{formatCurrency(item.grossAmount, item.currency || 'INR')}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{item.status === 'Paid' ? 'Released' : 'In escrow'}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                          <span className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                            <span className={`w-2 h-2 rounded-full ${item.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                            {item.status === 'Paid' ? 'Funds Released' : 'Funded • In Escrow'}
                          </span>

                          <div className="flex items-center gap-3">
                            <button onClick={() => shareProject(item)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition" title="Share Escrow Link">
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => copyLink(item.id)} className="text-slate-500 font-semibold hover:text-slate-900 transition">
                              {copiedId === item.id ? 'Copied!' : 'Copy link'}
                            </button>
                            <span className="text-slate-300">•</span>
                            <Link href={`/d/${item.id}`} target="_blank" className="text-[#072217] font-semibold flex items-center gap-0.5 hover:underline">
                              <span>Portal</span> <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* PROJECTS / DELIVERABLES TAB */}
          {currentTab === 'projects' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Deliverable Manifest</h1>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search deliverables..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 transition"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredDeliveries.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 font-mono">No vaults found.</div>
                ) : (
                  filteredDeliveries.map(item => (
                    <div key={item.id} className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
                      <div className="min-w-0 pr-2 space-y-0.5">
                        <h4 className="font-bold text-sm text-slate-900 truncate">{item.title}</h4>
                        <p className="text-xs text-slate-500 truncate">Client: {item.clientName} ({item.clientEmail}) • {item.files?.length || 0} file(s)</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-xs font-mono-data">{formatCurrency(item.grossAmount, item.currency || 'INR')}</span>
                        <button onClick={() => shareProject(item)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition" title="Share Escrow Link">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="Delete project">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* REVISIONS TAB */}
          {currentTab === 'revisions' && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Collaboration Threads</h1>
              <div className="space-y-3">
                {deliveries.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 font-mono">No revision threads found.</div>
                ) : (
                  deliveries.map(d => {
                    const hasMessages = d.messages && d.messages.length > 0
                    const lastMsg = hasMessages ? d.messages[d.messages.length - 1] : null
                    const isUnreadClientMsg = lastMsg && lastMsg.sender === 'client'

                    return (
                      <div key={d.id} className={`p-5 bg-white border rounded-2xl flex justify-between items-center gap-4 shadow-xs hover:border-slate-300 transition relative ${
                        isUnreadClientMsg ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/80'
                      }`}>
                        <div className="space-y-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900 truncate">{d.clientName}</h4>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-500 truncate">{d.title}</span>
                          </div>
                          <p className="text-xs text-slate-600 truncate">
                            {lastMsg ? lastMsg.text : 'No revision notes yet.'}
                          </p>
                        </div>
                        <button 
                          onClick={() => { setActiveThreadDelivery(d); setCurrentTab('chat-thread'); }} 
                          className="px-4 py-2 bg-[#072217] hover:bg-[#0b3827] text-white font-semibold text-xs rounded-lg transition shrink-0 flex items-center gap-1.5"
                        >
                          <span>Open Thread</span>
                          {isUnreadClientMsg && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* CHAT THREAD VIEW */}
          {currentTab === 'chat-thread' && activeThreadDelivery && (
            <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col p-4 sm:p-8">
              <div className="max-w-4xl w-full mx-auto bg-white border border-slate-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
                
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setCurrentTab('revisions')} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition shrink-0">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 truncate">{activeThreadDelivery.clientName}</h3>
                      <p className="text-xs text-slate-400 truncate">{activeThreadDelivery.title} • {formatCurrency(activeThreadDelivery.grossAmount, activeThreadDelivery.currency)}</p>
                    </div>
                  </div>

                  <Link href={`/d/${activeThreadDelivery.id}`} target="_blank" className="px-3 py-1.5 bg-[#072217] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-[#0b3827] transition shrink-0">
                    <span>Portal</span> <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50">
                  {(activeThreadDelivery.messages || []).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">No revision notes yet. Start conversation.</div>
                  ) : (
                    activeThreadDelivery.messages.map((m, idx) => {
                      const isCreator = m.sender === 'creator'
                      return (
                        <div key={idx} className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}>
                          <div className={`p-3.5 text-xs rounded-xl max-w-md ${
                            isCreator ? 'bg-[#072217] text-white rounded-br-xs shadow-xs' : 'bg-white text-slate-800 shadow-xs rounded-bl-xs border border-slate-200'
                          }`}>
                            <p className="leading-relaxed">{m.text}</p>
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 font-mono">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type revision reply..."
                      value={threadReplyText}
                      onChange={e => setThreadReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendThreadReply(activeThreadDelivery.id)}
                      className="flex-1 bg-slate-50 px-4 py-2.5 rounded-lg text-xs border border-slate-200 focus:outline-none focus:border-slate-400 transition"
                    />
                    <button 
                      onClick={() => handleSendThreadReply(activeThreadDelivery.id)} 
                      className="px-5 py-2.5 bg-[#072217] hover:bg-[#0b3827] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* WALLET / SETTLEMENT TAB */}
          {currentTab === 'wallet' && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settlement & Bank Payout</h1>
              <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                <div className="text-xs text-slate-400 font-semibold">Available Balance for Instant Settlement</div>
                <div className="text-4xl font-extrabold text-[#072217] font-mono-data">{formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency)}</div>
                <p className="text-xs text-slate-500 leading-relaxed">Funds are automatically routed to your connected bank account upon escrow clearance.</p>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => { setWizardStep(1); setRequestModalOpen(true); }}
        className="fixed bottom-24 right-6 sm:bottom-10 sm:right-10 z-40 w-12 h-12 rounded-full bg-[#072217] text-white flex items-center justify-center shadow-xl transition hover:scale-105 active:scale-95"
      >
        <Plus className="w-6 h-6 text-emerald-400" />
      </button>

      {/* FULLSCREEN WIZARD MODAL */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">STEP {wizardStep} OF 4</span>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">Deploy Escrow Vault</h3>
              </div>
              <button 
                onClick={() => setRequestModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#072217] h-full transition-all duration-300"
                style={{ width: `${(wizardStep / 4) * 100}%` }}
              />
            </div>

            {wizardStep === 1 && (
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-700 block">Attach Deliverables (ZIP, Videos, Code, PDFs) *</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files); }}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isDragging ? 'border-[#072217] bg-emerald-50/50' : 'border-slate-200 bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-[#072217] mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-800 block">Drop deliverables here</span>
                  <label className="mt-3 inline-block px-4 py-2 bg-[#072217] text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs">
                    Browse Files
                    <input type="file" multiple onChange={e => handleFilesAdd(e.target.files)} className="hidden" />
                  </label>
                </div>

                {fileList.length > 0 && (
                  <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-36 overflow-y-auto">
                    {fileList.map((f, i) => (
                      <div key={i} className="flex justify-between text-xs items-center px-1">
                        <span className="truncate max-w-[280px] font-medium text-slate-800 flex items-center gap-2">
                          {f.type.startsWith('video/') ? <Film className="w-3.5 h-3.5 text-blue-600" /> : 
                           f.type.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5 text-emerald-600" /> : 
                           <File className="w-3.5 h-3.5 text-slate-600" />}
                          {f.name}
                        </span>
                        <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Client Email *</label>
                  <input
                    type="email"
                    placeholder="client@company.com"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Project Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Website Source Code & Assets"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Handover Message</label>
                  <textarea
                    rows={3}
                    placeholder="Final master draft attached. Unlocks upon escrow release."
                    value={clientMessage}
                    onChange={e => setClientMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Escrow Amount *</label>
                  <div className="flex bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:border-slate-400 transition">
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="px-3 py-2 bg-transparent text-xs font-bold text-slate-700 focus:outline-none border-r border-slate-200 cursor-pointer"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent text-xs font-bold text-slate-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Link Expiry</label>
                  <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                    {['7', '14', '30', 'never'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setExpirySelection(opt)}
                        className={`py-2 rounded-lg border transition ${
                          expirySelection === opt ? 'bg-emerald-50 border-[#072217] text-[#072217] font-bold' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {opt === 'never' ? 'Never' : `${opt} Days`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-medium border border-slate-200">
                  <div className="flex justify-between font-extrabold text-sm text-slate-900 border-b border-slate-200 pb-2">
                    <span>{title}</span>
                    <span>{formatCurrency(amount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>Client: {clientEmail}</span>
                    <span>{fileList.length} files attached</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              {wizardStep === 1 && (
                <button
                  disabled={fileList.length === 0}
                  onClick={() => setWizardStep(2)}
                  className="w-full py-3 bg-[#072217] hover:bg-[#0b3827] disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                >
                  <span>Next: Details</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              )}

              {wizardStep === 2 && (
                <div className="flex gap-2">
                  <button onClick={() => setWizardStep(1)} className="w-1/3 py-3 border border-slate-200 text-slate-600 font-semibold text-xs rounded-lg">Back</button>
                  <button
                    disabled={!clientEmail || !title}
                    onClick={() => setWizardStep(3)}
                    className="w-2/3 py-3 bg-[#072217] hover:bg-[#0b3827] disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <span>Next: Pricing</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="flex gap-2">
                  <button onClick={() => setWizardStep(2)} className="w-1/3 py-3 border border-slate-200 text-slate-600 font-semibold text-xs rounded-lg">Back</button>
                  <button
                    disabled={!amount}
                    onClick={() => setWizardStep(4)}
                    className="w-2/3 py-3 bg-[#072217] hover:bg-[#0b3827] disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <span>Review & Deploy</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              )}

              {wizardStep === 4 && (
                uploading ? (
                  <div className="p-3 bg-[#072217] text-white rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Uploading & Deploying Vault...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setWizardStep(3)} className="w-1/3 py-3 border border-slate-200 text-slate-600 font-semibold text-xs rounded-lg">Back</button>
                    <button
                      onClick={handleDeployVault}
                      className="w-2/3 py-3 bg-[#072217] hover:bg-[#0b3827] text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>Deploy Escrow Vault</span>
                    </button>
                  </div>
                )
              )}
            </div>

          </div>
        </div>
      )}

      {/* AI DRAWER */}
      {aiDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-80 bg-white h-full p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#072217]" />
                  <span className="font-bold text-sm text-slate-900">AI Assistant</span>
                </div>
                <button onClick={() => setAiDrawerOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-200">
                <div className="font-bold text-[#072217]">💡 Escrow Insights</div>
                <p className="text-slate-600 leading-relaxed">
                  You have {paidDeliveries.length} cleared payouts totaling {formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency)}.
                </p>
              </div>
            </div>

            <button onClick={() => setAiDrawerOpen(false)} className="w-full py-2.5 bg-[#072217] text-white font-semibold text-xs rounded-lg">
              Close Assistant
            </button>
          </div>
        </div>
      )}

      {/* PROFILE DRAWER */}
      {profileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-80 bg-white h-full p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-sm text-slate-900">Account Settings</span>
                <button onClick={() => setProfileDrawerOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#072217] font-bold flex items-center justify-center text-xs border border-emerald-200">
                  {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AN'}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">{user.displayName || 'Ankit'}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-semibold text-slate-700">
                <button onClick={() => showToast("Payout settings updated", "success")} className="w-full text-left p-3 bg-slate-50 rounded-lg flex items-center gap-2 border border-slate-200">
                  <Wallet className="w-4 h-4 text-[#072217]" /> Bank & UPI Details
                </button>
                <button onClick={handleLogout} className="w-full text-left p-3 bg-rose-50 text-rose-600 rounded-lg flex items-center gap-2 font-bold">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-between">
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center gap-1 transition ${
            currentTab === 'home' ? 'text-[#072217] font-extrabold' : 'text-slate-400'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => setCurrentTab('projects')}
          className={`flex flex-col items-center gap-1 transition ${
            currentTab === 'projects' ? 'text-[#072217] font-extrabold' : 'text-slate-400'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span className="text-[10px]">Deliverables</span>
        </button>

        <button
          onClick={() => setCurrentTab('revisions')}
          className={`flex flex-col items-center gap-1 transition relative ${
            currentTab === 'revisions' || currentTab === 'chat-thread' ? 'text-[#072217] font-extrabold' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-[10px]">Revisions</span>
          {unreadRevisions.length > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setCurrentTab('wallet')}
          className={`flex flex-col items-center gap-1 transition ${
            currentTab === 'wallet' ? 'text-[#072217] font-extrabold' : 'text-slate-400'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span className="text-[10px]">Settlement</span>
        </button>
      </div>

    </div>
  )
}
