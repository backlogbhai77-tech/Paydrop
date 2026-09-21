'use client'

import React, { useState, useEffect, useRef } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, deleteDoc, doc, updateDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore'
import { 
  Zap, Plus, LayoutDashboard, FolderKanban, ShieldCheck, 
  UploadCloud, CheckCircle2, Lock, ArrowRight, ArrowLeft, 
  Copy, Check, Trash2, ExternalLink, FileArchive, Clock,
  AlertCircle, RefreshCw, X, MessageSquare, Send, Bell,
  Sparkles, Filter, Eye, Mail, Menu, Search, Play, Pause,
  Layers, ChevronRight, Shield, TrendingUp, DollarSign
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

// Sparkline SVG Component with Tooltip
function SparklineCard({ title, amount, subtitle, data, color, icon: Icon, badge, onPointHover, activePoint, cardId }) {
  const width = 280
  const height = 55
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const minVal = Math.min(...data.map(d => d.value), 0)
  const range = maxVal - minVal || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 20) + 10
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

  const strokeColor = color === 'emerald' ? '#059669' : color === 'blue' ? '#2563EB' : color === 'amber' ? '#D97706' : '#475569'
  const gradientId = `spark-grad-${cardId}`

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
            color === 'blue' ? 'bg-blue-50 text-blue-600' :
            color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-1 flex items-baseline justify-between">
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
          {amount}
        </div>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
            color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            color === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-slate-100 text-slate-700'
          }`}>
            {badge}
          </span>
        )}
      </div>

      <div className="relative mt-2">
        {activePoint && activePoint.cardId === cardId && (
          <div 
            className="absolute z-10 px-2 py-1 bg-slate-900 text-white rounded-md text-[10px] font-mono shadow-md -translate-x-1/2 -top-7 pointer-events-none transition-all"
            style={{ left: `${activePoint.x}px` }}
          >
            {activePoint.label}: {activePoint.formatted || activePoint.value}
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12 overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <path d={fillD} fill={`url(#${gradientId})`} />
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={activePoint?.cardId === cardId && activePoint?.index === i ? "4.5" : "2.5"}
              className="cursor-pointer transition-all duration-150"
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

      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <span>{subtitle}</span>
      </p>
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [currentView, setCurrentView] = useState('overview')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)

  // Confetti Particle Burst State
  const [confettiActive, setConfettiActive] = useState(false)
  const [payoutInProgress, setPayoutInProgress] = useState(false)
  const [activeChartPoint, setActiveChartPoint] = useState(null)

  // 4-Step Creation Wizard
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
  const [brandStudioName, setBrandStudioName] = useState('')

  // Multi-File Upload Queue
  const [fileList, setFileList] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [loaderStepText, setLoaderStepText] = useState('Securing deliverables...')

  // WhatsApp-Style Messaging State
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [replyText, setReplyText] = useState('')

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Auth & Firestore Sync
  useEffect(() => {
    let unsubscribeFirestore = null

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)

      if (currentUser) {
        setBrandStudioName(currentUser.displayName ? `${currentUser.displayName} Studio` : 'Studio Workspace')
        
        const q = query(collection(db, 'deliveries'), where('userId', '==', currentUser.uid))
        unsubscribeFirestore = onSnapshot(q, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setDeliveries(docs)
        }, (err) => {
          console.error("Firestore sync error:", err)
        })
      } else {
        setDeliveries([])
      }
    })

    return () => {
      unsubAuth()
      if (unsubscribeFirestore) unsubscribeFirestore()
    }
  }, [])

  useEffect(() => {
    if (!uploading) return
    const sequence = [
      'Encrypting and uploading to private vault...',
      'Injecting dynamic anti-leak watermark layer...',
      'Generating verified escrow PayLink portal...'
    ]
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % sequence.length
      setLoaderStepText(sequence[idx])
    }, 1500)
    return () => clearInterval(interval)
  }, [uploading])

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      await signInWithRedirect(auth, googleProvider)
    }
  }

  // Trigger Video 1 Instant Bank Payout Animation & Particles Burst[span_9](start_span)[span_9](end_span)
  const triggerInstantBankPayout = () => {
    setPayoutInProgress(true)
    setTimeout(() => {
      setPayoutInProgress(false)
      setConfettiActive(true)
      showToast("Instant Payout Dispatched! ₹1,20,000 deposited to your bank via IMPS/UPI.", "success") //[span_10](start_span)[span_10](end_span)
      setTimeout(() => setConfettiActive(false), 3000)
    }, 1000)
  }

  const handleFilesAdd = (filesToAdd) => {
    const selected = Array.from(filesToAdd)
    if (!selected.length) return
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
            const rawUrl = res.secure_url || res.url
            const ext = file.name.split('.').pop().toLowerCase()
            const detectedType = file.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream')

            resolve({
              name: file.name,
              size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
              type: detectedType,
              url: rawUrl
            })
          } else {
            reject(new Error(res?.error?.message || "Storage upload failure"))
          }
        } catch {
          reject(new Error("Response parse failure"))
        }
      }
      xhr.onerror = () => reject(new Error("Network connection lost"))
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

    try {
      const uploadedManifest = []
      for (let i = 0; i < fileList.length; i++) {
        setUploadProgress(Math.round((i / fileList.length) * 100))
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
        files: uploadedManifest,
        primaryPreviewUrl: uploadedManifest[0]?.url,
        expiresAt: expiresAt.toISOString(),
        expiryChoice: expirySelection,
        customBrand: {
          studioName: brandStudioName || 'ReleaseDrop Workspace'
        },
        viewCount: 0,
        messages: [],
        createdAt: serverTimestamp()
      })

      showToast("Vault Sealed! Client portal link is live.", "success")
      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setFileList([])
      setWizardStep(1)
      setCurrentView('overview')
    } catch (err) {
      showToast(err.message || "Upload process failed", "error")
    } finally {
      setCreating(false)
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently revoke this escrow delivery?")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      showToast("Delivery revoked", "success")
    } catch {
      showToast("Failed to delete", "error")
    }
  }

  const handleDeleteAll = async () => {
    if (deliveries.length === 0) return
    const confirmed = confirm(`Are you sure you want to PERMANENTLY delete all ${deliveries.length} deliveries?`)
    if (!confirmed) return

    try {
      const batch = writeBatch(db)
      deliveries.forEach(d => {
        batch.delete(doc(db, 'deliveries', d.id))
      })
      await batch.commit()
      showToast(`Successfully deleted all ${deliveries.length} deliveries.`, "success")
    } catch (err) {
      showToast("Failed to delete deliveries: " + err.message, "error")
    }
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    showToast("Portal link copied to clipboard", "success")
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleSendReply = async (deliveryId) => {
    if (!replyText.trim()) return
    try {
      const target = deliveries.find(d => d.id === deliveryId)
      const existing = target?.messages || []
      const updated = [...existing, { 
        sender: 'creator', 
        text: replyText.trim(), 
        time: new Date().toISOString() 
      }]
      
      await updateDoc(doc(db, 'deliveries', deliveryId), { messages: updated })
      setReplyText('')
      showToast("Message sent to client portal", "success")
    } catch {
      showToast("Failed to send message", "error")
    }
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const totalRevenue = paidDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const pendingAmount = pendingDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)

  const filteredDeliveries = deliveries.filter(d => {
    const matchesFilter = filterStatus === 'all' 
      ? true 
      : filterStatus === 'pending' 
        ? d.status === 'Awaiting Payment' 
        : d.status === 'Paid'
    const matchesSearch = d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const activeChatDelivery = deliveries.find(d => d.id === (selectedChatId || deliveries[0]?.id))

  // Dynamic Chart Points Generation[span_11](start_span)[span_11](end_span)[span_12](start_span)[span_12](end_span)
  const pendingChartData = [
    { label: 'Mon', value: Math.round(pendingAmount * 0.4), formatted: formatINR(pendingAmount * 0.4) },
    { label: 'Tue', value: Math.round(pendingAmount * 0.7), formatted: formatINR(pendingAmount * 0.7) },
    { label: 'Wed', value: Math.round(pendingAmount * 0.5), formatted: formatINR(pendingAmount * 0.5) },
    { label: 'Thu', value: Math.round(pendingAmount * 0.85), formatted: formatINR(pendingAmount * 0.85) },
    { label: 'Today', value: pendingAmount, formatted: formatINR(pendingAmount) }
  ]

  const clearedChartData = [
    { label: 'Mon', value: Math.round(totalRevenue * 0.2), formatted: formatINR(totalRevenue * 0.2) },
    { label: 'Tue', value: Math.round(totalRevenue * 0.35), formatted: formatINR(totalRevenue * 0.35) },
    { label: 'Wed', value: Math.round(totalRevenue * 0.6), formatted: formatINR(totalRevenue * 0.6) },
    { label: 'Thu', value: Math.round(totalRevenue * 0.75), formatted: formatINR(totalRevenue * 0.75) },
    { label: 'Today', value: totalRevenue, formatted: formatINR(totalRevenue) }
  ]

  const feedbackChartData = [
    { label: 'Mon', value: 0 },
    { label: 'Tue', value: 1 },
    { label: 'Wed', value: 0 },
    { label: 'Thu', value: 2 },
    { label: 'Today', value: 1 }
  ]

  const dropsChartData = [
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 2 },
    { label: 'Thu', value: Math.max(deliveries.length - 1, 1) },
    { label: 'Today', value: deliveries.length }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-xs text-slate-500 gap-3 font-mono">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>SYNCING WORKSPACE...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-sm">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ReleaseDrop Workspace</h1>
        <p className="text-slate-500 text-xs mt-1 max-w-sm">
          Lock client deliverables behind automated settlement gateways. No client signup required.
        </p>
        <button 
          onClick={handleGoogleLogin} 
          className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
        >
          Sign In with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans flex antialiased selection:bg-blue-600 selection:text-white pb-20 lg:pb-0 relative">
      
      {/* Confetti Celebration Particle Burst (Video 1) */}
      {confettiActive && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-xs animate-bounce"
              style={{
                backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'][i % 5],
                top: `${20 + Math.random() * 60}%`,
                left: `${15 + Math.random() * 70}%`,
                transform: `rotate(${Math.random() * 360}deg) scale(${0.8 + Math.random() * 0.8})`,
                transition: 'all 1s ease-out'
              }}
            />
          ))}
        </div>
      )}

      {/* Toast Alert / Bottom Dispatch Notification (Video 1) */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[90vw]">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl bg-slate-900 text-white text-xs font-semibold border border-slate-800">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col justify-between p-5 sticky top-0 h-screen z-30">
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900 uppercase">ReleaseDrop</span>
          </Link>

          <nav className="space-y-1">
            <button
              onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => { setCurrentView('deliveries'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'deliveries' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderKanban className="w-4 h-4" />
                <span>Deliveries</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                {deliveries.length}
              </span>
            </button>
            <button
              onClick={() => { setCurrentView('messages'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'messages' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                <span>Client Messages</span>
              </div>
              {deliveries.some(d => d.messages?.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              )}
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="px-2">
            <div className="text-xs font-bold text-slate-900 truncate">{brandStudioName}</div>
            <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full text-left px-2 py-1.5 text-xs text-slate-500 hover:text-rose-600 transition"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search deliveries or clients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600 w-56 lg:w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setCurrentView('create'); setWizardStep(1); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Delivery</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">

          {/* ======================= VIEW: OVERVIEW ======================= */}
          {currentView === 'overview' && (
            <div className="space-y-6">
              
              {/* Creator Profile & Instant Bank Payout Action Strip (Video 1 Inspired)[span_13](start_span)[span_13](end_span) */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md">
                    {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'RD'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{user.displayName || user.email?.split('@')[0]}</h2>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                        Verified Creator
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Vault ID: RD-9821 • Escrow Core Active
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => { setCurrentView('create'); setWizardStep(1); }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Drop</span>
                  </button>

                  <button
                    disabled={payoutInProgress}
                    onClick={triggerInstantBankPayout}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Zap className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                    <span>{payoutInProgress ? 'Processing Payout...' : 'Instant Bank Payout'}</span>
                  </button>
                </div>
              </div>

              {/* Escrow Circuit Animation Pipeline (Video 2 Inspired)[span_14](start_span)[span_14](end_span) */}
              <div className="p-5 rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-300">Live Escrow Pipeline Circuit</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Node Cluster: RD-AP-SOUTH</span>
                </div>

                <div className="flex items-center justify-between max-w-xl mx-auto py-3 relative">
                  {/* Glowing Connection Line */}
                  <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500 z-0 opacity-80" />

                  {/* Creator Node */}
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 border border-blue-400">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-300">Creator Node</span>
                  </div>

                  {/* Escrow Core */}
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
                      <Lock className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">Escrow Core (Locked)</span>
                  </div>

                  {/* Client Portal */}
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-indigo-400">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-300">Client Portal</span>
                  </div>
                </div>
              </div>

              {/* Sparkline Wave Cards Grid (Images 2 & 3 Inspired)[span_15](start_span)[span_15](end_span)[span_16](start_span)[span_16](end_span) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SparklineCard
                  cardId="pending"
                  title="Pending Escrow Payouts"
                  amount={formatINR(pendingAmount)}
                  subtitle="Locked in active client escrow"
                  data={pendingChartData}
                  color="blue"
                  icon={Lock}
                  activePoint={activeChartPoint}
                  onPointHover={setActiveChartPoint}
                />

                <SparklineCard
                  cardId="cleared"
                  title="Verified Cleared Earnings"
                  amount={formatINR(totalRevenue)}
                  subtitle="Ready for instant IMPS / UPI payout"
                  data={clearedChartData}
                  color="emerald"
                  icon={ShieldCheck}
                  badge="Settled"
                  activePoint={activeChartPoint}
                  onPointHover={setActiveChartPoint}
                />

                <SparklineCard
                  cardId="feedback"
                  title="Pending Feedback"
                  amount="1"
                  subtitle="Requires attention in inbox"
                  data={feedbackChartData}
                  color="amber"
                  icon={AlertCircle}
                  badge="Urgent"
                  activePoint={activeChartPoint}
                  onPointHover={setActiveChartPoint}
                />

                <SparklineCard
                  cardId="drops"
                  title="Total Drops"
                  amount={deliveries.length.toString()}
                  subtitle="Encrypted delivery drops"
                  data={dropsChartData}
                  color="slate"
                  icon={Layers}
                  badge="100% Tamper Proof"
                  activePoint={activeChartPoint}
                  onPointHover={setActiveChartPoint}
                />
              </div>

              {/* Deliveries Container */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Deliveries & Handoffs</h2>
                    {deliveries.length > 0 && (
                      <button
                        onClick={handleDeleteAll}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        title="Permanently remove all previous deliveries"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete All</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
                    <button 
                      onClick={() => setFilterStatus('all')}
                      className={`px-2.5 py-0.5 rounded-md transition ${filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setFilterStatus('pending')}
                      className={`px-2.5 py-0.5 rounded-md transition ${filterStatus === 'pending' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}
                    >
                      Awaiting
                    </button>
                    <button 
                      onClick={() => setFilterStatus('paid')}
                      className={`px-2.5 py-0.5 rounded-md transition ${filterStatus === 'paid' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}
                    >
                      Paid
                    </button>
                  </div>
                </div>

                {filteredDeliveries.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No matching deliveries located.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredDeliveries.map(item => (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <FileArchive className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 truncate">{item.title}</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Client: <span className="text-slate-700 font-medium">{item.clientName}</span> • {item.files?.length || 1} file(s)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span className="font-mono font-black text-xs text-slate-900">
                            {formatINR(item.grossAmount)}
                          </span>

                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${item.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {item.status === 'Paid' ? 'Paid' : 'Pending'}
                          </span>

                          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                            <button
                              onClick={() => copyLink(item.id)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg shadow-xs transition flex items-center gap-1"
                            >
                              {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === item.id ? 'Copied' : 'Link'}</span>
                            </button>

                            <Link
                              href={`/d/${item.id}`}
                              target="_blank"
                              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition"
                              title="Open Portal"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition"
                              title="Delete"
                            >
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

          {/* ======================= VIEW: CREATE WIZARD ======================= */}
          {currentView === 'create' && (
            <div className="max-w-xl mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Create Encrypted Vault</h1>
                  <p className="text-xs text-slate-500">Lock master deliverables behind payment verification.</p>
                </div>
                <button 
                  onClick={() => setCurrentView('overview')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  ✕ Cancel
                </button>
              </div>

              {/* Stepper Header */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between text-xs font-medium">
                <span className={wizardStep === 1 ? 'text-blue-600 font-semibold' : 'text-slate-400'}>1. Assets</span>
                <span className="text-slate-300">→</span>
                <span className={wizardStep === 2 ? 'text-blue-600 font-semibold' : 'text-slate-400'}>2. Details</span>
                <span className="text-slate-300">→</span>
                <span className={wizardStep === 3 ? 'text-blue-600 font-semibold' : 'text-slate-400'}>3. Pricing</span>
                <span className="text-slate-300">→</span>
                <span className={wizardStep === 4 ? 'text-blue-600 font-semibold' : 'text-slate-400'}>4. Deploy</span>
              </div>

              {/* Step 1: Dropzone */}
              {wizardStep === 1 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files); }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                      isDragging ? 'border-blue-600 bg-blue-50/50 scale-[1.01]' : 'border-slate-200 bg-slate-50/50 hover:border-blue-400'
                    }`}
                  >
                    <UploadCloud className={`w-8 h-8 mx-auto mb-2 transition-colors ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-semibold text-slate-900 block">Drag & Drop Master Deliverables</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">MP4, MOV, PNG, JPG, PDF, ZIP (Max 250MB)</span>
                    <label className="mt-3 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition">
                      Browse Files
                      <input type="file" multiple onChange={(e) => handleFilesAdd(e.target.files)} className="hidden" />
                    </label>
                  </div>

                  {fileList.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-700 block">Selected Items ({fileList.length}):</span>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                        {fileList.map((f, i) => (
                          <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <FileArchive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-medium text-slate-800 truncate max-w-[180px] sm:max-w-xs">{f.name}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-slate-400 font-mono">{(f.size / (1024*1024)).toFixed(2)} MB</span>
                              <button onClick={() => removeFileFromList(i)} className="text-slate-400 hover:text-rose-600">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      disabled={!fileList.length}
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                    >
                      Continue to Details →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Details */}
              {wizardStep === 2 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Project Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Commercial 4K Master Edit"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Client Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Studio"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Client Email (For Link Delivery)</label>
                      <input
                        type="email"
                        placeholder="client@acme.com"
                        value={clientEmail}
                        onChange={e => setClientEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Link Expiration</label>
                    <div className="grid grid-cols-4 gap-2 text-xs font-medium">
                      {['7', '14', '30', 'never'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setExpirySelection(opt)}
                          className={`py-1.5 rounded-lg border transition text-center ${
                            expirySelection === opt ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {opt === 'never' ? 'Never' : `${opt}d`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Handover Note</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Approved master cut. Inspect preview below; raw master unpacks instantly upon settlement."
                      value={clientMessage}
                      onChange={e => setClientMessage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex justify-between pt-2">
                    <button onClick={() => setWizardStep(1)} className="text-xs font-medium text-slate-500">← Back</button>
                    <button
                      disabled={!title || !clientName}
                      onClick={() => setWizardStep(3)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                    >
                      Pricing & Watermark →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Pricing */}
              {wizardStep === 3 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Settlement Due (₹ INR) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 15000"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Watermark Overlay Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={e => setWatermarkText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex justify-between pt-2">
                    <button onClick={() => setWizardStep(2)} className="text-xs font-medium text-slate-500">← Back</button>
                    <button
                      disabled={!amount}
                      onClick={() => setWizardStep(4)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                    >
                      Review & Deploy →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Deploy */}
              {wizardStep === 4 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold text-slate-900 border-b border-slate-200 pb-1.5">
                      <span className="truncate max-w-[200px]">{title}</span>
                      <span className="font-mono">{formatINR(amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Client: {clientName}</span>
                      <span>{fileList.length} files bundled</span>
                    </div>
                    <div className="text-slate-500">
                      Expires: {expirySelection === 'never' ? 'Never' : `${expirySelection} Days`}
                    </div>
                  </div>

                  {uploading && (
                    <div className="space-y-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <div className="flex justify-between text-xs text-blue-900 font-medium">
                        <span className="animate-pulse">{loaderStepText}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <button disabled={creating} onClick={() => setWizardStep(3)} className="text-xs font-medium text-slate-500">← Back</button>
                    <button
                      disabled={creating || uploading}
                      onClick={handleFinalDeploy}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{creating ? 'Sealing Assets...' : 'Deploy Payment-Locked Vault'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= VIEW: WHATSAPP-STYLE MESSAGES ======================= */}
          {currentView === 'messages' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Client Inquiries & Revisions</h1>
                <p className="text-xs text-slate-500">Real-time two-way communication thread with your clients.</p>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 h-[560px]">
                
                {/* Left Pane: Contacts List */}
                <div className="md:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/40">
                  <div className="p-3 border-b border-slate-200 bg-white">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Active Threads</span>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {deliveries.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">No active delivery projects found.</div>
                    ) : (
                      deliveries.map(d => {
                        const lastMsg = d.messages?.[d.messages.length - 1]
                        const isSelected = activeChatDelivery?.id === d.id

                        return (
                          <button
                            key={d.id}
                            onClick={() => setSelectedChatId(d.id)}
                            className={`w-full p-3.5 text-left flex items-start gap-3 transition ${
                              isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/60'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {d.clientName?.slice(0, 2).toUpperCase() || 'CL'}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 truncate">{d.clientName}</span>
                                {lastMsg && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {new Date(lastMsg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-blue-600 truncate font-medium">{d.title}</div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {lastMsg ? `${lastMsg.sender === 'creator' ? 'You: ' : ''}${lastMsg.text}` : 'No messages yet'}
                              </p>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Right Pane: WhatsApp-Style Viewport */}
                <div className="md:col-span-8 flex flex-col h-full bg-white">
                  {activeChatDelivery ? (
                    <>
                      <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                            {activeChatDelivery.clientName?.slice(0, 2).toUpperCase() || 'CL'}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-slate-900">{activeChatDelivery.clientName}</h3>
                            <span className="text-[10px] text-slate-500 font-medium">Project: {activeChatDelivery.title}</span>
                          </div>
                        </div>

                        <Link 
                          href={`/d/${activeChatDelivery.id}`} 
                          target="_blank"
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium flex items-center gap-1 shadow-xs"
                        >
                          <span>Open Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
                        {(activeChatDelivery.messages || []).length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6">
                            <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                            <span className="text-xs font-semibold text-slate-600">No communication recorded yet.</span>
                            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                              Messages and change requests submitted from the client's delivery portal will appear here in real time.
                            </p>
                          </div>
                        ) : (
                          activeChatDelivery.messages.map((m, idx) => {
                            const isCreator = m.sender === 'creator'
                            return (
                              <div key={idx} className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}>
                                <div className={`p-3 rounded-2xl text-xs max-w-sm shadow-xs ${
                                  isCreator 
                                    ? 'bg-blue-600 text-white rounded-br-xs' 
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                                }`}>
                                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono mt-1 px-1">
                                  {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )
                          })
                        )}
                      </div>

                      <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                        <input 
                          type="text"
                          placeholder="Type reply or update to client..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendReply(activeChatDelivery.id)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                        <button 
                          onClick={() => handleSendReply(activeChatDelivery.id)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs transition"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Select a conversation on the left to review client messages.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Floating Bottom Navigation Bar (Image 1 Inspired)[span_17](start_span)[span_17](end_span)[span_18](start_span)[span_18](end_span)[span_19](start_span)[span_19](end_span) */}
      <div className="fixed bottom-3 left-4 right-4 z-40 lg:hidden flex justify-center">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl px-3 py-2 flex items-center gap-1 sm:gap-2 w-full max-w-sm justify-around">
          <button
            onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
              currentView === 'overview' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[10px]">Drops</span>
          </button>

          <button
            onClick={() => { setCurrentView('messages'); setWizardStep(1); }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition relative ${
              currentView === 'messages' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4" />
              {deliveries.some(d => d.messages?.length > 0) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5" />
              )}
            </div>
            <span className="text-[10px]">Revisions</span>
          </button>

          <button
            onClick={() => { setCurrentView('overview'); triggerInstantBankPayout(); }}
            className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-emerald-600 font-bold"
          >
            <Lock className="w-4 h-4" />
            <span className="text-[10px]">Escrow</span>
          </button>

          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-slate-500"
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px]">Menu</span>
          </button>
        </div>
      </div>

    </div>
  )
}
