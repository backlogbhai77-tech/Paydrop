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
  Send, Bot, ArrowRight, ArrowLeft, Share2, Compass, Layers, Shield
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

export default function LiquidGlassDashboard() {
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
      setTitle(''); setClientName(''); setClientEmail(''); setClientMessage(''); setAmount(''); setFileList([]); setWizardStep(1); setRequestModalOpen(false)
    } catch (err) {
      showToast(err.message || "Failed to create vault", "error")
    } finally {
      setUploading(false); setUploadProgress(0)
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

  // Dynamic Chart Points
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
      <div className="min-h-screen flex flex-col items-center justify-center text-xs text-slate-500 gap-3 font-mono">
        <div className="w-8 h-8 border-2 border-[#063D2A] border-t-transparent rounded-full animate-spin" />
        <span>[ INITIALIZING LIQUID GLASS PORTAL... ]</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-slate-500 mb-4 font-mono">Session ended.</p>
        <Link href="/" className="px-6 py-2.5 bg-[#063D2A] text-white text-xs font-bold rounded-xl shadow-lg">
          Return to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-900 font-sans flex antialiased pb-32 lg:pb-10 relative selection:bg-emerald-200">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in duration-200">
          <div className="liquid-glass-dark px-5 py-3 rounded-full text-white text-xs font-semibold flex items-center gap-2.5 shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* DESKTOP LIQUID GLASS SIDEBAR */}
      <aside className="hidden lg:flex w-64 liquid-glass border-r border-white/40 flex-col justify-between p-6 sticky top-0 h-screen z-30 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentTab('home')} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#063D2A] text-emerald-400 font-black text-lg flex items-center justify-center shadow-md">
                P
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">paydrop</span>
            </button>

            <button onClick={() => setAiDrawerOpen(true)} className="w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-slate-700 transition" title="AI Assistant">
              <Sparkles className="w-4 h-4 text-[#063D2A]" />
            </button>
          </div>

          <button
            onClick={() => { setWizardStep(1); setRequestModalOpen(true); }}
            className="w-full py-3 bg-[#063D2A] hover:bg-[#084e35] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New Escrow Vault</span>
          </button>

          <nav className="space-y-1">
            {[
              { id: 'home', label: 'Overview', icon: Home },
              { id: 'projects', label: 'Deliverables', icon: Briefcase, count: deliveries.length },
              { id: 'revisions', label: 'Revisions', icon: MessageSquare, badge: unreadRevisions.length },
              { id: 'wallet', label: 'Settlement', icon: Wallet }
            ].map(tab => {
              const Icon = tab.icon
              const active = currentTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    active ? 'bg-[#063D2A] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${active ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'}`}>
                      {tab.count}
                    </span>
                  )}
                  {tab.badge > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200/50 flex items-center justify-between">
          <button onClick={() => setProfileDrawerOpen(true)} className="flex items-center gap-3 min-w-0 text-left">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#063D2A] text-xs font-bold flex items-center justify-center border border-white">
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AN'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">{user.displayName || 'Ankit'}</div>
              <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
            </div>
          </button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 text-xs p-1">✕</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <header className="px-6 sm:px-10 pt-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-[#063D2A] text-emerald-400 font-extrabold text-lg flex items-center justify-center">
              P
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">paydrop</span>
          </div>

          <div className="hidden lg:block">
            <span className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">LIQUID GLASS ENGINE</span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Studio Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setAiDrawerOpen(true)} 
              className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-slate-700 hover:scale-105 transition"
            >
              <Sparkles className="w-4 h-4 text-[#063D2A]" />
            </button>

            <button 
              onClick={() => setProfileDrawerOpen(true)}
              className="w-9 h-9 rounded-full bg-emerald-100 text-[#063D2A] font-bold text-xs flex items-center justify-center border border-white shadow-xs"
            >
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'AN'}
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-2xl lg:max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">

          {/* HOME TAB */}
          {currentTab === 'home' && (
            <div className="space-y-6">
              
              {/* LIQUID GLASS HERO CARD */}
              <div className="liquid-glass-dark rounded-3xl p-7 sm:p-8 text-white relative overflow-hidden shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                    <span>Available Escrow Balance</span>
                    <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-1 text-emerald-300">
                      {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                <div>
                  <div className="text-4xl sm:text-5xl font-black font-mono-data tracking-tight text-white">
                    {balanceVisible ? formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency) : '••••••'}
                  </div>
                  <p className="text-xs text-emerald-200/70 mt-1">Settled & protected in secure escrow vault</p>
                </div>
              </div>

              {/* AREA CHART */}
              <div className="liquid-glass rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Revenue Trend ({currentYear})</h3>
                    <span className="text-xs text-slate-400 font-medium">Escrow settlement velocity</span>
                  </div>

                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="px-3 py-1.5 bg-white/80 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                <div className="relative h-40 pt-4">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <path d={areaPathD} fill="url(#chartGradient)" />
                    <path d={svgPathD} fill="none" stroke="#063D2A" strokeWidth="2.5" strokeLinecap="round" />

                    {chartPoints.map((pt, idx) => (
                      <g key={idx} className="group cursor-pointer" onMouseEnter={() => setActiveChartPoint(pt)}>
                        <circle cx={pt.x} cy={pt.y} r="3.5" className="fill-[#063D2A] group-hover:fill-emerald-400 transition-all" />
                      </g>
                    ))}
                  </svg>

                  {activeChartPoint && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900 text-white text-[10px] font-mono rounded-lg shadow-xl">
                      {activeChartPoint.month}: {formatCurrency(activeChartPoint.amount, currency)}
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-200/50">
                  {monthNames.map((m, i) => <span key={i}>{m}</span>)}
                </div>
              </div>

              {/* ACTIVE PROJECTS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Active Deliverables</h3>
                  <button onClick={() => setCurrentTab('projects')} className="text-xs font-semibold text-[#063D2A]">View all</button>
                </div>

                {deliveries.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-400 liquid-glass rounded-2xl font-mono">
                    [ NO ACTIVE VAULTS DEPLOYED ]
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveries.map(item => (
                      <div key={item.id} className="p-5 liquid-glass rounded-2xl space-y-3 hover:border-white transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100/60 text-[#063D2A] font-bold text-xs flex items-center justify-center shrink-0 border border-white">
                              {item.clientName ? item.clientName.slice(0, 2).toUpperCase() : 'CL'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 tracking-tight truncate">{item.title}</h4>
                              <p className="text-xs text-slate-400 truncate">Client: {item.clientEmail}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-bold text-sm text-slate-900 font-mono-data">{formatCurrency(item.grossAmount, item.currency || 'INR')}</div>
                            <div className="text-[10px] text-slate-400">{item.status === 'Paid' ? 'Released' : 'In escrow'}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/50">
                          <span className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                            <span className={`w-2 h-2 rounded-full ${item.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                            {item.status === 'Paid' ? 'Funds Released' : 'Funded • In Escrow'}
                          </span>

                          <div className="flex items-center gap-3">
                            <button onClick={() => shareProject(item)} className="p-1.5 bg-white/80 rounded-lg text-slate-700" title="Share">
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => copyLink(item.id)} className="text-slate-600 font-semibold hover:text-slate-900">
                              {copiedId === item.id ? 'Copied!' : 'Copy link'}
                            </button>
                            <span className="text-slate-300">•</span>
                            <Link href={`/d/${item.id}`} target="_blank" className="text-[#063D2A] font-bold flex items-center gap-0.5">
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

          {/* PROJECTS TAB */}
          {currentTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Deliverable Manifest</h1>
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search deliverables..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 liquid-glass rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredDeliveries.map(item => (
                  <div key={item.id} className="p-5 liquid-glass rounded-2xl flex items-center justify-between gap-4">
                    <div className="min-w-0 pr-2">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{item.title}</h4>
                      <p className="text-xs text-slate-500 truncate">{item.clientEmail} • {item.files?.length || 0} file(s)</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-xs font-mono-data">{formatCurrency(item.grossAmount, item.currency || 'INR')}</span>
                      <button onClick={() => shareProject(item)} className="p-2 bg-white/80 rounded-lg text-slate-700">
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
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
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Collaboration Threads</h1>
              <div className="space-y-3">
                {deliveries.map(d => (
                  <div key={d.id} className="p-5 liquid-glass rounded-2xl flex justify-between items-center gap-4">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{d.clientName} ({d.title})</h4>
                      <p className="text-xs text-slate-500 truncate">{d.messages?.length ? d.messages[d.messages.length - 1].text : 'No notes yet.'}</p>
                    </div>
                    <button onClick={() => { setActiveThreadDelivery(d); setCurrentTab('chat-thread'); }} className="px-4 py-2 bg-[#063D2A] text-white text-xs font-bold rounded-lg shrink-0">
                      Open Thread
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WALLET TAB */}
          {currentTab === 'wallet' && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bank Payout & Settlement</h1>
              <div className="p-6 liquid-glass rounded-2xl space-y-3">
                <div className="text-xs text-slate-400 font-semibold">Instant Settlement Balance</div>
                <div className="text-4xl font-extrabold text-[#063D2A] font-mono-data">{formatCurrency(currency === 'INR' ? totalRevenueINR : totalRevenueUSD, currency)}</div>
                <p className="text-xs text-slate-500">Funds are directly settled upon client escrow approval.</p>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => { setWizardStep(1); setRequestModalOpen(true); }}
        className="fixed bottom-28 right-6 sm:bottom-10 sm:right-10 z-40 w-12 h-12 rounded-full bg-[#063D2A] text-white flex items-center justify-center shadow-2xl transition hover:scale-105 active:scale-95"
      >
        <Plus className="w-6 h-6 text-emerald-400" />
      </button>

      {/* iOS FLOATING LIQUID GLASS NAVIGATION TAB BAR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden w-[90%] max-w-md">
        <div className="liquid-glass-dark p-2 rounded-full shadow-2xl flex items-center justify-around border border-white/20">
          {[
            { id: 'home', label: 'Home', icon: Home },
            { id: 'projects', label: 'Vaults', icon: Briefcase },
            { id: 'revisions', label: 'Revisions', icon: MessageSquare, badge: unreadRevisions.length },
            { id: 'wallet', label: 'Wallet', icon: Wallet }
          ].map(tab => {
            const Icon = tab.icon
            const active = currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-2 px-4 rounded-full transition-all duration-300 ${
                  active ? 'bg-white/20 text-white shadow-lg' : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-emerald-400 scale-110' : 'text-emerald-200/80'} transition-transform`} />
                <span className="text-[9px] font-semibold tracking-tight mt-0.5">{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* WIZARD MODAL */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full liquid-glass rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200/50 pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">STEP {wizardStep} OF 4</span>
                <h3 className="text-lg font-bold text-slate-900">Deploy Escrow Vault</h3>
              </div>
              <button onClick={() => setRequestModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {wizardStep === 1 && (
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-700">Attach Deliverables *</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files); }}
                  className="border-2 border-dashed border-slate-300/80 rounded-2xl p-8 text-center bg-white/40"
                >
                  <UploadCloud className="w-8 h-8 text-[#063D2A] mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-800 block">Drop master files here</span>
                  <label className="mt-3 inline-block px-4 py-2 bg-[#063D2A] text-white text-xs font-semibold rounded-xl cursor-pointer">
                    Browse Files
                    <input type="file" multiple onChange={e => handleFilesAdd(e.target.files)} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Client Email *</label>
                  <input type="email" placeholder="client@company.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full p-2.5 bg-white/80 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Project Name *</label>
                  <input type="text" placeholder="Website Design Source Code" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2.5 bg-white/80 border border-slate-200 rounded-xl" />
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount *</label>
                  <input type="number" placeholder="2000" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2.5 bg-white/80 border border-slate-200 rounded-xl font-mono" />
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="p-4 bg-white/80 rounded-2xl text-xs space-y-2">
                <div className="font-bold text-slate-900">{title} — {formatCurrency(amount, currency)}</div>
                <p className="text-slate-500">Client: {clientEmail}</p>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              {wizardStep > 1 && <button onClick={() => setWizardStep(s => s - 1)} className="w-1/3 py-2.5 border rounded-xl text-xs font-semibold">Back</button>}
              {wizardStep < 4 ? (
                <button onClick={() => setWizardStep(s => s + 1)} className="w-full py-2.5 bg-[#063D2A] text-white rounded-xl text-xs font-semibold">Next Step</button>
              ) : (
                <button onClick={handleDeployVault} className="w-full py-2.5 bg-[#063D2A] text-white rounded-xl text-xs font-semibold">Deploy Vault</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI & PROFILE DRAWERS */}
      {aiDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex justify-end">
          <div className="w-80 liquid-glass h-full p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                <span className="font-bold text-sm text-slate-900">AI Assistant</span>
                <button onClick={() => setAiDrawerOpen(false)}>✕</button>
              </div>
              <p className="text-xs text-slate-600">All {paidDeliveries.length} vaults active and protected.</p>
            </div>
            <button onClick={() => setAiDrawerOpen(false)} className="w-full py-2 bg-[#063D2A] text-white text-xs font-bold rounded-xl">Close</button>
          </div>
        </div>
      )}

      {profileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex justify-end">
          <div className="w-80 liquid-glass h-full p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                <span className="font-bold text-sm text-slate-900">Account</span>
                <button onClick={() => setProfileDrawerOpen(false)}>✕</button>
              </div>
              <div className="text-xs font-bold text-slate-900">{user.email}</div>
            </div>
            <button onClick={handleLogout} className="w-full py-2 bg-rose-600 text-white text-xs font-bold rounded-xl">Sign Out</button>
          </div>
        </div>
      )}

    </div>
  )
}
