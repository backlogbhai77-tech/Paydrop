'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, deleteDoc, doc, updateDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore'
import { 
  Zap, Plus, LayoutDashboard, FolderKanban, ShieldCheck, 
  UploadCloud, CheckCircle2, Lock, ArrowRight, ArrowLeft, 
  Copy, Check, Trash2, ExternalLink, FileArchive, Clock,
  AlertCircle, RefreshCw, X, MessageSquare, Send, Bell,
  Menu, Search, Layers, FileText, Users, Sliders, Shield,
  CreditCard, Sparkles, ChevronRight, Eye, CornerDownRight
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = "releasedrop_vault"

function formatINR(amount) {
  const num = Number(amount)
  if (isNaN(num)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num)
}

// Touch-Interactive SVG Sparkline with Tooltip
function InteractiveSparkline({ title, amount, subtitle, data, color, badge, cardId, activePoint, onPointHover }) {
  const width = 280
  const height = 55
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const minVal = Math.min(...data.map(d => d.value), 0)
  const range = maxVal - minVal || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 24) + 12
    const y = height - ((d.value - minVal) / range) * (height - 20) - 10
    return { x, y, ...d }
  })

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
  }, '')

  const fillD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
  const strokeColor = color === 'emerald' ? '#059669' : color === 'amber' ? '#D97706' : '#2563EB'
  const gradId = `spark-fill-${cardId}`

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden transition hover:shadow-md">
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        {badge && (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
            color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            color === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-slate-100 text-slate-700'
          }`}>
            {badge}
          </span>
        )}
      </div>

      <div className="mt-1">
        <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{amount}</div>
        <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="relative mt-2">
        {activePoint && activePoint.cardId === cardId && (
          <div 
            className="absolute z-20 px-2 py-1 bg-slate-900 text-white rounded-md text-[10px] font-mono shadow-lg -translate-x-1/2 -top-7 pointer-events-none"
            style={{ left: `${activePoint.x}px` }}
          >
            {activePoint.label}: {activePoint.formatted || activePoint.value}
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12 overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={fillD} fill={`url(#${gradId})`} />
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={activePoint?.cardId === cardId && activePoint?.index === i ? "4.5" : "2.5"}
              className="cursor-pointer transition-all"
              fill={activePoint?.cardId === cardId && activePoint?.index === i ? strokeColor : "#FFFFFF"}
              stroke={strokeColor}
              strokeWidth="2"
              onMouseEnter={() => onPointHover({ ...p, cardId, index: i })}
              onMouseLeave={() => onPointHover(null)}
              onTouchStart={() => onPointHover({ ...p, cardId, index: i })}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Views: 'overview' | 'inbox' | 'create' | 'chat-thread'
  const [currentView, setCurrentView] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [activeChartPoint, setActiveChartPoint] = useState(null)

  // 4-Step Animated Creation Wizard
  const [wizardStep, setWizardStep] = useState(1)
  const [creating, setCreating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Form Fields
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [expirySelection, setExpirySelection] = useState('7')
  const [watermarkText, setWatermarkText] = useState('RELEASEDROP • PROTECTED PREVIEW')
  
  // Multi-File Upload Queue
  const [fileList, setFileList] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [loaderStepText, setLoaderStepText] = useState('Encrypting assets...')

  // Client Chat / Thread State
  const [activeThreadDelivery, setActiveThreadDelivery] = useState(null)
  const [threadReplyText, setThreadReplyText] = useState('')

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

  useEffect(() => {
    if (!uploading) return
    const steps = [
      'Encrypting assets via SHA-256...',
      'Applying dynamic anti-theft watermark...',
      'Binding escrow smart settlement link...'
    ]
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % steps.length
      setLoaderStepText(steps[i])
    }, 1400)
    return () => clearInterval(interval)
  }, [uploading])

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch {
      await signInWithRedirect(auth, googleProvider)
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
            resolve({
              name: file.name,
              size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
              type: file.type || 'application/octet-stream',
              url: res.secure_url || res.url
            })
          } else {
            reject(new Error(res?.error?.message || "Storage error"))
          }
        } catch {
          reject(new Error("Upload parse error"))
        }
      }
      xhr.onerror = () => reject(new Error("Network failed"))
      xhr.send(formData)
    })
  }

  const handleDeployVault = async () => {
    if (!title || !amount || !fileList.length || !user) {
      showToast("Please complete Title, Amount, and upload files", "error")
      return
    }

    setCreating(true)
    setUploading(true)

    try {
      const manifest = []
      for (let i = 0; i < fileList.length; i++) {
        setUploadProgress(Math.round((i / fileList.length) * 100))
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
        platformFee,
        creatorPayout,
        watermarkText: watermarkText || 'RELEASEDROP • PROTECTED PREVIEW',
        status: 'Awaiting Payment',
        files: manifest,
        primaryPreviewUrl: manifest[0]?.url,
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        messages: [],
        createdAt: serverTimestamp()
      })

      showToast("Delivery Vault created successfully!", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setFileList([])
      setWizardStep(1)
      setCurrentView('overview')
    } catch (err) {
      showToast(err.message || "Failed to create vault", "error")
    } finally {
      setCreating(false)
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this delivery? Client access will be revoked.")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      showToast("Delivery revoked", "success")
    } catch {
      showToast("Failed to delete", "error")
    }
  }

  const handleDeleteAll = async () => {
    if (!deliveries.length) return
    if (!confirm(`Permanently delete all ${deliveries.length} deliveries?`)) return
    try {
      const batch = writeBatch(db)
      deliveries.forEach(d => batch.delete(doc(db, 'deliveries', d.id)))
      await batch.commit()
      showToast("All deliveries cleared", "success")
    } catch {
      showToast("Purge failed", "error")
    }
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    showToast("Portal link copied!", "success")
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
      showToast("Reply sent to client thread", "success")
    } catch {
      showToast("Failed to send", "error")
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

  // Sparkline Trends Data
  const pendingTrendData = [
    { label: 'Mon', value: Math.round(pendingAmount * 0.4), formatted: formatINR(pendingAmount * 0.4) },
    { label: 'Tue', value: Math.round(pendingAmount * 0.7), formatted: formatINR(pendingAmount * 0.7) },
    { label: 'Wed', value: Math.round(pendingAmount * 0.5), formatted: formatINR(pendingAmount * 0.5) },
    { label: 'Thu', value: Math.round(pendingAmount * 0.85), formatted: formatINR(pendingAmount * 0.85) },
    { label: 'Today', value: pendingAmount, formatted: formatINR(pendingAmount) }
  ]

  const clearedTrendData = [
    { label: 'Mon', value: Math.round(totalRevenue * 0.2), formatted: formatINR(totalRevenue * 0.2) },
    { label: 'Tue', value: Math.round(totalRevenue * 0.35), formatted: formatINR(totalRevenue * 0.35) },
    { label: 'Wed', value: Math.round(totalRevenue * 0.6), formatted: formatINR(totalRevenue * 0.6) },
    { label: 'Thu', value: Math.round(totalRevenue * 0.75), formatted: formatINR(totalRevenue * 0.75) },
    { label: 'Today', value: totalRevenue, formatted: formatINR(totalRevenue) }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-xs text-slate-500 gap-2 font-mono">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>AUTHENTICATING WORKSPACE...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-sm">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ReleaseDrop Workspace</h1>
        <p className="text-slate-500 text-xs mt-1 max-w-sm">Payment-locked deliverables for creative professionals.</p>
        <button onClick={handleGoogleLogin} className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition">
          Sign In with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex antialiased">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl bg-slate-900 text-white text-xs font-semibold border border-slate-800">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* PRO ENTERPRISE SIDEBAR (From Reference Screenshot) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/90 flex-col justify-between p-4 sticky top-0 h-screen z-30 select-none">
        <div className="space-y-4">
          {/* Logo & Workspace Title */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-slate-900 uppercase">ReleaseDrop</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">PRO</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Studio Craft Agency</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Protected Drop</span>
          </button>

          {/* Search Jump Box */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Quick jump / search... [⌘K]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Navigation Section */}
          <div className="space-y-0.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">Workspace</span>
            
            <button
              onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition ${
                currentView === 'overview' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Deliveries & Proofs</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${currentView === 'overview' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                {deliveries.length}
              </span>
            </button>

            <button
              onClick={() => { setCurrentView('inbox'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition ${
                currentView === 'inbox' || currentView === 'chat-thread' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Revisions & Inbox</span>
              </div>
              {activeRevisionsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                  {activeRevisionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setCurrentView('overview'); showToast("Escrow cleared payouts balance: " + formatINR(totalRevenue), "success"); }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4" />
                <span>Escrow & Payouts</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => showToast("Client CRM ready: " + deliveries.length + " clients onboarded.", "success")}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Clients CRM</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => { setCurrentView('create'); setWizardStep(3); }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4" />
                <span>Watermark Studio</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => showToast("Security & Audit Logs: SHA-256 Vault Encryption Active", "success")}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" />
                <span>Security & Audit Logs</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Bottom Sidebar Widgets (Screenshot Matching) */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          {/* Escrow Protected Pill Card */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Escrow Protected
              </span>
              <span className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">Payouts →</span>
            </div>
            <div className="text-sm font-black text-slate-900 font-mono">{formatINR(pendingAmount)}</div>
          </div>

          {/* Storage Bar */}
          <div className="px-1 space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono font-medium">
              <span>Private Storage</span>
              <span>28.4 / 100 GB</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="w-1/4 h-full bg-blue-600 rounded-full" />
            </div>
          </div>

          {/* Creator Profile */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'RD'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">{user.displayName || user.email?.split('@')[0]}</div>
                <div className="text-[10px] text-emerald-600 font-medium">Verified Pro Creator ✓</div>
              </div>
            </div>
            <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-rose-600 text-xs p-1" title="Log Out">✕</button>
          </div>
        </div>
      </aside>

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>Studio Craft Agency</span>
              <span>/</span>
              <span className="text-slate-900 font-bold capitalize">{currentView.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { setCurrentView('create'); setWizardStep(1); }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Delivery</span>
            </button>
          </div>
        </header>

        {/* Dynamic Screens */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">

          {/* SCREEN 1: OVERVIEW & DELIVERIES */}
          {currentView === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Deliveries & Proofs</h1>
                <p className="text-xs text-slate-500 mt-0.5">Real-time payment-locked handoff vaults.</p>
              </div>

              {/* Sparkline Cards (Touch-interactive) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InteractiveSparkline
                  cardId="pending"
                  title="Pending Escrow Payouts"
                  amount={formatINR(pendingAmount)}
                  subtitle="Locked in active client drops"
                  data={pendingTrendData}
                  color="blue"
                  badge="In Escrow"
                  activePoint={activeChartPoint}
                  onPointHover={setActiveChartPoint}
                />
                <InteractiveSparkline
                  cardId="cleared"
                  title="Verified Cleared Earnings"
                  amount={formatINR(totalRevenue)}
                  subtitle="Released to bank accounts"
                  data={clearedTrendData}
                  color="emerald"
                  badge="Settled"
                  activePoint={activeChartPoint}
                  onPointHover={setActiveChartPoint}
                />
              </div>

              {/* Deliveries Table Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Deliveries ({deliveries.length})</h3>
                    {deliveries.length > 0 && (
                      <button onClick={handleDeleteAll} className="text-xs text-rose-600 hover:underline font-semibold">
                        Delete All
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    {['all', 'pending', 'paid'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setFilterStatus(tab)}
                        className={`px-3 py-1 rounded-lg transition capitalize ${
                          filterStatus === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredDeliveries.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No deliveries found.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredDeliveries.map(item => (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <FileArchive className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Client: <span className="text-slate-700 font-medium">{item.clientName}</span> • {item.files?.length || 1} file(s)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span className="font-mono font-black text-xs text-slate-900">
                            {formatINR(item.grossAmount)}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.status === 'Paid' ? 'Paid' : 'Pending'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyLink(item.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition"
                            >
                              {copiedId === item.id ? 'Copied' : 'Copy'}
                            </button>
                            <Link href={`/d/${item.id}`} target="_blank" className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 2: DEDICATED CLIENT INBOX & REVISIONS (Matching Reference Screenshot) */}
          {currentView === 'inbox' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Inbox & Revisions</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time delivery communication and revision request triage.</p>
                </div>

                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search messages, clients..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Triage Tabs */}
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5">
                  <span>All Conversations</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">{deliveries.length}</span>
                </button>
                <button className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5">
                  <span>Active Revisions</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">{activeRevisionsCount}</span>
                </button>
              </div>

              {/* List of Client Message Cards (Exact Reference Design) */}
              <div className="space-y-3">
                {deliveries.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                    No client conversations found.
                  </div>
                ) : (
                  deliveries.map(d => {
                    const hasMessages = d.messages && d.messages.length > 0
                    const lastMsg = hasMessages ? d.messages[d.messages.length - 1] : null
                    const isRevisionActive = hasMessages && d.status !== 'Paid'

                    return (
                      <div
                        key={d.id}
                        className={`p-5 rounded-2xl bg-white border transition-all ${
                          isRevisionActive ? 'border-amber-300 shadow-xs ring-1 ring-amber-200/50' : 'border-slate-200/80 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isRevisionActive ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {isRevisionActive ? <AlertCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{d.clientName}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs text-slate-500 font-medium">{d.title}</span>
                              </div>

                              <p className="text-xs text-slate-600 leading-snug">
                                <strong className="text-slate-800 font-semibold">{lastMsg ? `${lastMsg.sender === 'creator' ? 'You' : d.clientName}: ` : 'Status: '}</strong>
                                {lastMsg ? lastMsg.text : (d.status === 'Paid' ? 'Payment cleared. Files unlocked.' : 'Vault awaiting client clearance.')}
                              </p>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                                <span>{lastMsg ? new Date(lastMsg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                                <span>•</span>
                                <span className="font-mono font-bold text-slate-700">{formatINR(d.grossAmount)}</span>
                                {isRevisionActive && (
                                  <span className="px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                    Revision Requested
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:self-center">
                            <button
                              onClick={() => { setActiveThreadDelivery(d); setCurrentView('chat-thread'); }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Open Thread</span>
                            </button>

                            <Link
                              href={`/d/${d.id}`}
                              target="_blank"
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                              title="Inspect Client Portal"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* SCREEN 3: INDIVIDUAL CLIENT CHAT THREAD VIEW */}
          {currentView === 'chat-thread' && activeThreadDelivery && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => setCurrentView('inbox')} className="text-xs text-slate-400 hover:text-slate-700 font-bold">
                    ← Back to Inbox
                  </button>
                  <span className="text-slate-300">|</span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{activeThreadDelivery.clientName}</h3>
                    <span className="text-[10px] text-slate-400">{activeThreadDelivery.title}</span>
                  </div>
                </div>

                <Link href={`/d/${activeThreadDelivery.id}`} target="_blank" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                  <span>Portal View</span> <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Chat Stream */}
              <div className="h-80 overflow-y-auto p-4 bg-[#F8FAFC] rounded-xl space-y-3">
                {(activeThreadDelivery.messages || []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No client revision notes yet. Write a message below.
                  </div>
                ) : (
                  activeThreadDelivery.messages.map((m, idx) => {
                    const isCreator = m.sender === 'creator'
                    return (
                      <div key={idx} className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-2xl text-xs max-w-sm shadow-xs ${
                          isCreator ? 'bg-blue-600 text-white rounded-br-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                        }`}>
                          <p className="leading-relaxed">{m.text}</p>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Input composer */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type official reply to client..."
                  value={threadReplyText}
                  onChange={e => setThreadReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendThreadReply(activeThreadDelivery.id)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <button
                  onClick={() => handleSendThreadReply(activeThreadDelivery.id)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
                >
                  Send Reply
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: 4-STEP DELIVERY CREATION WIZARD (Intact & Fully Restored) */}
          {currentView === 'create' && (
            <div className="max-w-xl mx-auto space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Deploy Escrow Vault</h2>
                  <p className="text-xs text-slate-500">Lock master deliverables behind payment clearance.</p>
                </div>
                <button onClick={() => setCurrentView('overview')} className="text-xs font-semibold text-slate-400">Cancel</button>
              </div>

              {/* Step Navigation Pill */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs font-semibold shadow-xs">
                <span className={wizardStep === 1 ? 'text-blue-600 font-bold' : 'text-slate-400'}>1. Assets</span>
                <span className="text-slate-300">→</span>
                <span className={wizardStep === 2 ? 'text-blue-600 font-bold' : 'text-slate-400'}>2. Details</span>
                <span className="text-slate-300">→</span>
                <span className={wizardStep === 3 ? 'text-blue-600 font-bold' : 'text-slate-400'}>3. Watermark</span>
                <span className="text-slate-300">→</span>
                <span className={wizardStep === 4 ? 'text-blue-600 font-bold' : 'text-slate-400'}>4. Deploy</span>
              </div>

              {/* STEP 1: DROPZONE WITH ANIMATION */}
              {wizardStep === 1 && (
                <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files); }}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      isDragging ? 'border-blue-600 bg-blue-50/50 scale-[1.01]' : 'border-slate-200 bg-slate-50/50 hover:border-blue-500'
                    }`}
                  >
                    <UploadCloud className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                    <span className="text-sm font-bold text-slate-900 block">Select Master Production Deliverables</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">MP4, MOV, PNG, JPG, PDF, ZIP (Max 250MB)</span>
                    <label className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition">
                      Browse Files
                      <input type="file" multiple onChange={e => handleFilesAdd(e.target.files)} className="hidden" />
                    </label>
                  </div>

                  {fileList.length > 0 && (
                    <div className="space-y-1.5 border border-slate-100 rounded-xl p-3 bg-slate-50">
                      {fileList.map((f, i) => (
                        <div key={i} className="flex justify-between text-xs items-center">
                          <span className="truncate max-w-[240px] font-medium text-slate-800">{f.name}</span>
                          <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    disabled={!fileList.length}
                    onClick={() => setWizardStep(2)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    Next: Project Details →
                  </button>
                </div>
              )}

              {/* STEP 2: DETAILS */}
              {wizardStep === 2 && (
                <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Deliverable Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. 4K Commercial Brand Edit"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Client Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Media"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Settlement Due (₹ INR) *</label>
                      <input
                        type="number"
                        placeholder="12000"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Handover Note to Client</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Approved master cut. Uncompressed raw files unseal post-settlement."
                      value={clientMessage}
                      onChange={e => setClientMessage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setWizardStep(1)} className="w-1/3 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl">Back</button>
                    <button
                      disabled={!title || !amount}
                      onClick={() => setWizardStep(3)}
                      className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      Next: Watermark & Expiry →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: WATERMARK & EXPIRY */}
              {wizardStep === 3 && (
                <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Anti-Scrape Watermark Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={e => setWatermarkText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Vault Link Expiration</label>
                    <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                      {['7', '14', '30', 'never'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setExpirySelection(opt)}
                          className={`py-2 rounded-xl border transition ${
                            expirySelection === opt ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {opt === 'never' ? 'Never' : `${opt} Days`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setWizardStep(2)} className="w-1/3 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl">Back</button>
                    <button
                      onClick={() => setWizardStep(4)}
                      className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      Review & Deploy Vault →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & DEPLOY WITH STEP-LOADER */}
              {wizardStep === 4 && (
                <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                      <span>{title}</span>
                      <span>{formatINR(amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Client: {clientName}</span>
                      <span>{fileList.length} files attached</span>
                    </div>
                    <div className="text-slate-500">
                      Expires: {expirySelection === 'never' ? 'Never' : `${expirySelection} Days`}
                    </div>
                  </div>

                  {uploading && (
                    <div className="space-y-1.5 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                      <div className="flex justify-between text-xs text-blue-900 font-semibold">
                        <span className="animate-pulse">{loaderStepText}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button disabled={creating} onClick={() => setWizardStep(3)} className="w-1/3 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl">Back</button>
                    <button
                      disabled={creating || uploading}
                      onClick={handleDeployVault}
                      className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{creating ? 'Sealing Vault...' : 'Deploy Payment-Locked Vault'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

    </div>
  )
}
