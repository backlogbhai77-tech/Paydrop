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
  onSnapshot, serverTimestamp, writeBatch 
} from 'firebase/firestore'
import { 
  Zap, Plus, LayoutDashboard, FolderKanban, ShieldCheck, 
  UploadCloud, CheckCircle2, Lock, ArrowRight, ArrowLeft, 
  Copy, Check, Trash2, ExternalLink, FileArchive, Clock,
  AlertCircle, RefreshCw, X, MessageSquare, Send, Bell,
  Menu, Search, Layers, FileText, ChevronRight, CheckCheck,
  TrendingUp, IndianRupee, Shield, Sparkles, LockKeyhole, Mail,
  FileCode, Video, ChevronDown, CreditCard, Smartphone, Building2, LogOut
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

function getFileIcon(filename = '', type = '') {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || type.startsWith('video/')) {
    return <Video className="w-4 h-4 text-purple-400 animate-pulse" />
  }
  if (['zip', 'rar', '7z', 'tar'].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-amber-400" />
  }
  if (['js', 'ts', 'py', 'json', 'html', 'css', 'cpp'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-emerald-400" />
  }
  return <FileText className="w-4 h-4 text-blue-400" />
}

function InteractiveSparkline({ title, amount, subtitle, data, color, badge, cardId, activePoint, onPointHover }) {
  const width = 280
  const height = 55
  const hasData = data.some(d => d.value > 0)
  const maxVal = hasData ? Math.max(...data.map(d => d.value)) : 100
  const minVal = 0
  const range = maxVal - minVal || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 24) + 12
    const y = hasData 
      ? height - ((d.value - minVal) / range) * (height - 20) - 10
      : height - 15
    return { x, y, ...d }
  })

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
  }, '')

  const fillD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
  const strokeColor = color === 'emerald' ? '#10B981' : '#3B82F6'
  const gradId = `spark-fill-${cardId}`

  return (
    <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-700 hover:scale-[1.01] backdrop-blur-xl group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
      
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">{title}</span>
        {badge && (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono transition-transform duration-300 group-hover:scale-105 ${
            color === 'emerald' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
            'bg-blue-950/60 text-blue-400 border border-blue-500/30'
          }`}>
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2">
        <div className="text-2xl font-black text-white font-mono tracking-tight">{amount}</div>
        <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="relative mt-3">
        {activePoint && activePoint.cardId === cardId && (
          <div 
            className="absolute z-20 px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-mono shadow-2xl -translate-x-1/2 -top-8 pointer-events-none border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
            style={{ left: `${activePoint.x}px` }}
          >
            {activePoint.label}: {activePoint.formatted || activePoint.value}
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12 overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={fillD} fill={`url(#${gradId})`} className="transition-all duration-500" />
          <path d={pathD} fill="none" stroke={hasData ? strokeColor : '#475569'} strokeWidth="2.5" strokeDasharray={hasData ? 'none' : '4 4'} strokeLinecap="round" />
          {hasData && points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={activePoint?.cardId === cardId && activePoint?.index === i ? "5" : "3"}
              className="cursor-pointer transition-all duration-200 hover:scale-125"
              fill={activePoint?.cardId === cardId && activePoint?.index === i ? strokeColor : "#0F172A"}
              stroke={strokeColor}
              strokeWidth="2.5"
              onMouseEnter={() => onPointHover({ ...p, cardId, index: i })}
              onMouseLeave={() => onPointHover(null)}
              onClick={() => onPointHover({ ...p, cardId, index: i })}
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
  const [authLoading, setAuthLoading] = useState(false)
  const [deliveries, setDeliveries] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [currentView, setCurrentView] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [activeChartPoint, setActiveChartPoint] = useState(null)

  // Custom Gateway Modal State
  const [payDropGatewayModal, setPayDropGatewayModal] = useState(null)
  const [selectedPayMethod, setSelectedPayMethod] = useState('upi')
  const [processingPayment, setProcessingPayment] = useState(false)

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1)
  const [creating, setCreating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [expirySelection, setExpirySelection] = useState('7')
  const [watermarkText, setWatermarkText] = useState('PAYDROP • PREVIEW COPY')
  
  const [fileList, setFileList] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [deployStepIndex, setDeployStepIndex] = useState(0)

  const [activeThreadDelivery, setActiveThreadDelivery] = useState(null)
  const [threadReplyText, setThreadReplyText] = useState('')
  
  // Auth Form State
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
      if (currentUser) {
        const q = query(collection(db, 'deliveries'), where('userId', '==', currentUser.uid))
        unsubFirestore = onSnapshot(q, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setDeliveries(docs)
          setLoading(false)
        })
      } else {
        setDeliveries([])
        setLoading(false)
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
        setAuthError("Email registered already. Try logging in.")
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
      setAuthError("Google Sign-In blocked by WebView. Please use Email/Password login.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setProfileDropdownOpen(false)
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
            const isImg = file.type.startsWith('image/')
            const previewUrl = isImg 
              ? rawUrl.replace('/upload/', `/upload/l_text:Arial_26_bold:${encodeURIComponent(watermarkText)},o_40,a_-30/`)
              : rawUrl

            resolve({
              name: file.name,
              size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
              type: file.type || 'application/octet-stream',
              rawUrl: rawUrl,
              previewUrl: previewUrl
            })
          } else {
            reject(new Error(res?.error?.message || "Storage upload error"))
          }
        } catch {
          reject(new Error("Upload response parsing error"))
        }
      }
      xhr.onerror = () => reject(new Error("Network connection interrupted"))
      xhr.send(formData)
    })
  }

  const handleDeployVault = async () => {
    if (!title || !amount || !fileList.length || !user) {
      showToast("Please provide Title, Amount, and Assets", "error")
      return
    }

    setCreating(true)
    setUploading(true)
    setDeployStepIndex(1)

    try {
      const manifest = []
      for (let i = 0; i < fileList.length; i++) {
        setUploadProgress(Math.round(((i) / fileList.length) * 100))
        const res = await uploadFileToCloudinary(fileList[i])
        manifest.push(res)
      }
      
      setDeployStepIndex(2)
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
        watermarkText: watermarkText || 'PAYDROP • PREVIEW COPY',
        status: 'Awaiting Payment',
        files: manifest,
        expiresAt: expiresAt.toISOString(),
        messages: [],
        createdAt: serverTimestamp()
      })

      showToast("Delivery Vault protected & deployed!", "success")
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
      setDeployStepIndex(0)
    }
  }

  const triggerPayDropCustomPayment = async (deliveryId) => {
    setProcessingPayment(true)
    setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'deliveries', deliveryId), {
          status: 'Paid',
          paidAt: new Date().toISOString(),
          paymentRef: `PAYDROP_CUSTOM_${Math.floor(100000 + Math.random() * 900000)}`
        })
        setProcessingPayment(false)
        setPayDropGatewayModal(null)
        showToast("Payment Successful! Master files decrypted.", "success")
      } catch {
        setProcessingPayment(false)
        showToast("Payment simulation failed", "error")
      }
    }, 1200)
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently remove this deliverable?")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      showToast("Vault removed", "success")
    } catch {
      showToast("Failed to delete", "error")
    }
  }

  const handleDeleteAll = async () => {
    if (!deliveries.length) return
    if (!confirm(`Permanently remove all ${deliveries.length} deliverables?`)) return
    try {
      const batch = writeBatch(db)
      deliveries.forEach(d => batch.delete(doc(db, 'deliveries', d.id)))
      await batch.commit()
      showToast("All vaults deleted", "success")
    } catch {
      showToast("Batch action failed", "error")
    }
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    showToast("Client Portal link copied!", "success")
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

  const pendingTrendData = [
    { label: 'Mon', value: pendingAmount > 0 ? Math.round(pendingAmount * 0.4) : 0 },
    { label: 'Tue', value: pendingAmount > 0 ? Math.round(pendingAmount * 0.7) : 0 },
    { label: 'Wed', value: pendingAmount > 0 ? Math.round(pendingAmount * 0.5) : 0 },
    { label: 'Thu', value: pendingAmount > 0 ? Math.round(pendingAmount * 0.85) : 0 },
    { label: 'Today', value: pendingAmount, formatted: formatINR(pendingAmount) }
  ]

  const clearedTrendData = [
    { label: 'Mon', value: totalRevenue > 0 ? Math.round(totalRevenue * 0.2) : 0 },
    { label: 'Tue', value: totalRevenue > 0 ? Math.round(totalRevenue * 0.35) : 0 },
    { label: 'Wed', value: totalRevenue > 0 ? Math.round(totalRevenue * 0.6) : 0 },
    { label: 'Thu', value: totalRevenue > 0 ? Math.round(totalRevenue * 0.75) : 0 },
    { label: 'Today', value: totalRevenue, formatted: formatINR(totalRevenue) }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center text-xs text-slate-400 gap-3 font-mono">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-500/50" />
        <span className="tracking-widest uppercase text-[10px] text-blue-400 animate-pulse">INITIALIZING STUDIO PRO...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 blur-[160px] rounded-full pointer-events-none animate-pulse" />

        <div className="w-full max-w-md relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-500/40 hover:scale-105 transition-transform duration-300">
              <Zap className="w-8 h-8 fill-white animate-bounce" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">PayDrop Studio</h1>
            <p className="text-xs text-slate-400">Next-gen payment-locked delivery vault for elite creators.</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-7 shadow-2xl backdrop-blur-2xl space-y-4">
            {authError && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="creator@studio.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Password</label>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/30 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'login' ? 'Sign In to Studio' : 'Create Pro Account'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>{authMode === 'login' ? "Don't have an account?" : "Already have an account?"}</span>
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                className="text-blue-400 font-bold hover:underline"
              >
                {authMode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </div>

            <div className="relative flex items-center my-3">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="shrink-0 px-2 text-[10px] text-slate-500 font-mono">OR SECURE AUTH</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full py-3 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-bold text-xs rounded-2xl border border-slate-700 transition-all duration-300 flex items-center justify-center gap-2.5 shadow-md hover:scale-[1.01]"
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
    <div className="min-h-screen bg-[#070A11] text-slate-100 font-sans flex antialiased pb-28 lg:pb-0 relative selection:bg-blue-600 selection:text-white">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl bg-slate-900/90 text-white text-xs font-semibold border border-slate-700 backdrop-blur-xl animate-bounce">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* CUSTOM PAYDROP GATEWAY MODAL */}
      {payDropGatewayModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setPayDropGatewayModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Zap className="w-4 h-4 fill-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-white tracking-wider">PayDrop Gateway</h3>
                <span className="text-[10px] text-slate-400">Internal Dummy Direct Unlock</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <div className="text-[11px] text-slate-400">Vault Item:</div>
              <div className="text-xs font-bold text-white truncate">{payDropGatewayModal.title}</div>
              <div className="text-2xl font-black font-mono text-emerald-400 pt-1">{formatINR(payDropGatewayModal.grossAmount)}</div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Choose Dummy Method</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <button
                  onClick={() => setSelectedPayMethod('upi')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                    selectedPayMethod === 'upi' ? 'bg-blue-600/20 border-blue-500 text-blue-400 scale-105 shadow-lg shadow-blue-500/20' : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-[10px]">UPI / QR</span>
                </button>

                <button
                  onClick={() => setSelectedPayMethod('card')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                    selectedPayMethod === 'card' ? 'bg-blue-600/20 border-blue-500 text-blue-400 scale-105 shadow-lg shadow-blue-500/20' : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[10px]">Cards</span>
                </button>

                <button
                  onClick={() => setSelectedPayMethod('netbank')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                    selectedPayMethod === 'netbank' ? 'bg-blue-600/20 border-blue-500 text-blue-400 scale-105 shadow-lg shadow-blue-500/20' : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="text-[10px]">Banking</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => triggerPayDropCustomPayment(payDropGatewayModal.id)}
              disabled={processingPayment}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-emerald-600/30 transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
            >
              {processingPayment ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Simulate Instant Unlock</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-68 bg-slate-900/60 border-r border-slate-800/80 flex-col justify-between p-5 sticky top-0 h-screen z-30 select-none backdrop-blur-2xl">
        <div className="space-y-5">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
              <Zap className="w-5 h-5 fill-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-white uppercase">PayDrop</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold">PRO STUDIO</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Encrypted Handover</span>
            </div>
          </div>

          <button
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl shadow-xl shadow-blue-600/30 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            <span>Create Protected Drop</span>
          </button>

          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 block mb-1 font-mono">Workspace</span>
            
            <button
              onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                currentView === 'overview' ? 'bg-gradient-to-r from-slate-800 to-slate-800/90 text-white font-bold border border-slate-700/80 shadow-lg' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Deliveries Vaults</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {deliveries.length}
              </span>
            </button>

            <button
              onClick={() => { setCurrentView('inbox'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                currentView === 'inbox' || currentView === 'chat-thread' ? 'bg-gradient-to-r from-slate-800 to-slate-800/90 text-white font-bold border border-slate-700/80 shadow-lg' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Revisions Inbox</span>
              </div>
              {activeRevisionsCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                  {activeRevisionsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="p-3.5 bg-slate-800/40 border border-slate-800/80 rounded-2xl space-y-1 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" /> Pending Payouts
            </span>
            <div className="text-base font-black text-amber-400 font-mono tracking-tight">{formatINR(pendingAmount)}</div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-18 bg-slate-900/40 border-b border-slate-800/80 sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-xl transition">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 font-mono">
              <span>Studio</span>
              <span>/</span>
              <span className="text-white font-bold capitalize">{currentView.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setCurrentView('create'); setWizardStep(1); }}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300 active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Drop</span>
            </button>

            {/* TOP RIGHT PROFILE CORNER */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 rounded-2xl transition-all duration-200 active:scale-95 shadow-md"
              >
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-black flex items-center justify-center uppercase shadow-md">
                  {user.email ? user.email.slice(0, 2) : 'PD'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">{user.email?.split('@')[0]}</div>
                  <div className="text-[9px] text-emerald-400 font-mono">● Pro Account</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2.5 border-b border-slate-800 mb-2">
                    <p className="text-xs font-bold text-white truncate">{user.email}</p>
                    <span className="text-[10px] text-emerald-400 font-mono">● Secure Vault Session Active</span>
                  </div>

                  <div className="space-y-1">
                    <div className="px-2.5 py-2 text-xs text-slate-400 flex justify-between font-mono bg-slate-950/40 rounded-xl">
                      <span>Cleared Revenue</span>
                      <span className="text-emerald-400 font-bold">{formatINR(totalRevenue)}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 my-2"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out Studio</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">

          {/* VIEW: OVERVIEW */}
          {currentView === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Active Deliverables Vault</h1>
                  <p className="text-xs text-slate-400 mt-0.5">Manage protected client handovers and secure previews.</p>
                </div>
              </div>

              {/* Sparkline Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InteractiveSparkline
                  cardId="pending"
                  title="Awaiting Settlement"
                  amount={formatINR(pendingAmount)}
                  subtitle="Pending client approval and payment"
                  data={pendingTrendData}
                  color="blue"
                  badge="Pending"
                  activePoint={activeChartPoint}
                  onPointHover={setActiveChartPoint}
                />
                <InteractiveSparkline
                  cardId="cleared"
                  title="Settled Earnings"
                  amount={formatINR(totalRevenue)}
                  subtitle="Completed project payments"
                  data={clearedTrendData}
                  color="emerald"
                  badge="Cleared"
                  activePoint={activeChartPoint}
                  onPointHover={setActiveChartPoint}
                />
              </div>

              {/* Table List */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
                <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">Vaults ({deliveries.length})</h3>
                    {deliveries.length > 0 && (
                      <button onClick={handleDeleteAll} className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition">
                        Delete All
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search drops..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl text-xs font-semibold border border-slate-800">
                      {['all', 'pending', 'paid'].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setFilterStatus(tab)}
                          className={`px-3 py-1 rounded-lg transition-all capitalize ${
                            filterStatus === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredDeliveries.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-500">
                    No deliverables found. Tap "New Drop" to lock your first project.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {filteredDeliveries.map(item => (
                      <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-all duration-200">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                            {getFileIcon(item.files?.[0]?.name, item.files?.[0]?.type)}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                            <p className="text-[11px] text-slate-400">
                              Client: <span className="text-slate-200 font-medium">{item.clientName}</span> • {item.files?.length || 1} asset(s)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                          <span className="font-mono font-black text-xs text-white">
                            {formatINR(item.grossAmount)}
                          </span>

                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono ${
                            item.status === 'Paid' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                          }`}>
                            {item.status === 'Paid' ? 'Unlocked' : 'Locked'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {item.status !== 'Paid' && (
                              <button
                                onClick={() => setPayDropGatewayModal(item)}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-300 border border-blue-500/40 text-[10px] font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Zap className="w-3 h-3 fill-blue-300 animate-pulse" /> Pay
                              </button>
                            )}
                            <button
                              onClick={() => copyLink(item.id)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-xl transition-all"
                            >
                              {copiedId === item.id ? 'Copied' : 'Copy Link'}
                            </button>
                            <Link href={`/d/${item.id}`} target="_blank" className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-950/30 rounded-xl transition">
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

          {/* VIEW: REVISIONS INBOX */}
          {currentView === 'inbox' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">Client Revisions Inbox</h1>
                <p className="text-xs text-slate-400 mt-0.5">Pre-payment inquiries and client adjustment threads.</p>
              </div>

              <div className="space-y-3">
                {deliveries.length === 0 ? (
                  <div className="p-16 text-center text-xs text-slate-500 bg-slate-900/80 rounded-3xl border border-slate-800">
                    No client feedback conversations yet.
                  </div>
                ) : (
                  deliveries.map(d => {
                    const hasMessages = d.messages && d.messages.length > 0
                    const lastMsg = hasMessages ? d.messages[d.messages.length - 1] : null
                    const isRevisionActive = hasMessages && d.status !== 'Paid'

                    return (
                      <div
                        key={d.id}
                        className={`p-5 rounded-3xl bg-slate-900/80 border transition-all duration-300 backdrop-blur-xl ${
                          isRevisionActive ? 'border-amber-500/50 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/20' : 'border-slate-800/80 shadow-xl'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-md ${
                              isRevisionActive ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                            }`}>
                              <MessageSquare className="w-4 h-4" />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">{d.clientName}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs text-slate-400">{d.title}</span>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed">
                                <strong className="text-slate-200 font-semibold">{lastMsg ? `${lastMsg.sender === 'creator' ? 'You' : d.clientName}: ` : 'Status: '}</strong>
                                {lastMsg ? lastMsg.text : (d.status === 'Paid' ? 'Settlement received. Master files unlocked.' : 'Vault sent. Awaiting feedback.')}
                              </p>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
                                <span>{lastMsg ? new Date(lastMsg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                                <span>•</span>
                                <span className="font-bold text-white">{formatINR(d.grossAmount)}</span>
                                {isRevisionActive && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold animate-pulse">
                                    Change Requested
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => { setActiveThreadDelivery(d); setCurrentView('chat-thread'); }}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl transition-all duration-200 flex items-center gap-2 shadow-md self-start sm:self-center"
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
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-300 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setCurrentView('inbox')} className="text-xs text-slate-400 hover:text-white font-bold transition">
                    ← Back to Inbox
                  </button>
                  <span className="text-slate-700">|</span>
                  <div>
                    <h3 className="text-xs font-bold text-white">{activeThreadDelivery.clientName}</h3>
                    <span className="text-[10px] text-slate-400">{activeThreadDelivery.title}</span>
                  </div>
                </div>

                <Link href={`/d/${activeThreadDelivery.id}`} target="_blank" className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1">
                  <span>Portal View</span> <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="h-96 overflow-y-auto p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3.5">
                {(activeThreadDelivery.messages || []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    No messages yet. Send a note to the client.
                  </div>
                ) : (
                  activeThreadDelivery.messages.map((m, idx) => {
                    const isCreator = m.sender === 'creator'
                    return (
                      <div key={idx} className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3.5 rounded-2xl text-xs max-w-sm shadow-md ${
                          isCreator ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none'
                        }`}>
                          <p className="leading-relaxed">{m.text}</p>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 font-mono">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                  className="flex-1 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition shadow-inner"
                />
                <button
                  onClick={() => handleSendThreadReply(activeThreadDelivery.id)}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  Send Reply
                </button>
              </div>
            </div>
          )}

          {/* VIEW: 4-STEP DEPLOY WIZARD */}
          {currentView === 'create' && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">Deploy Protected Delivery Vault</h2>
                  <p className="text-xs text-slate-400">Attach deliverables, set price, and seal client preview.</p>
                </div>
                <button onClick={() => setCurrentView('overview')} className="text-xs font-semibold text-slate-400 hover:text-white transition">Cancel</button>
              </div>

              {/* Step indicator */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between text-xs font-semibold shadow-xl backdrop-blur-xl">
                <span className={wizardStep === 1 ? 'text-blue-400 font-bold' : 'text-slate-500'}>1. Assets</span>
                <span className="text-slate-700">→</span>
                <span className={wizardStep === 2 ? 'text-blue-400 font-bold' : 'text-slate-500'}>2. Details</span>
                <span className="text-slate-700">→</span>
                <span className={wizardStep === 3 ? 'text-blue-400 font-bold' : 'text-slate-500'}>3. Watermark</span>
                <span className="text-slate-700">→</span>
                <span className={wizardStep === 4 ? 'text-blue-400 font-bold' : 'text-slate-500'}>4. Deploy</span>
              </div>

              {/* STEP 1 */}
              {wizardStep === 1 && (
                <div className="p-7 bg-slate-900/90 border border-slate-800/80 rounded-3xl space-y-5 shadow-2xl backdrop-blur-xl">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files); }}
                    className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 ${
                      isDragging ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    <UploadCloud className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-bounce" />
                    <span className="text-sm font-bold text-white block">Drop Videos, ZIPs, or Code Archives</span>
                    <span className="text-xs text-slate-500 mt-1 block">MP4, MOV, ZIP, JS, PY, PDF (Up to 1GB)</span>
                    <label className="mt-5 inline-block px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-blue-600/20 transition-all active:scale-95">
                      Browse Files
                      <input type="file" multiple onChange={e => handleFilesAdd(e.target.files)} className="hidden" />
                    </label>
                  </div>

                  {fileList.length > 0 && (
                    <div className="space-y-2 border border-slate-800 rounded-2xl p-4 bg-slate-950/80 shadow-inner">
                      {fileList.map((f, i) => (
                        <div key={i} className="flex justify-between text-xs items-center">
                          <div className="flex items-center gap-2.5 truncate">
                            {getFileIcon(f.name, f.type)}
                            <span className="truncate max-w-[260px] font-medium text-slate-200">{f.name}</span>
                          </div>
                          <button onClick={() => removeFile(i)} className="text-slate-500 hover:text-rose-400 font-bold transition">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    disabled={!fileList.length}
                    onClick={() => setWizardStep(2)}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                  >
                    Next: Project Details →
                  </button>
                </div>
              )}

              {/* STEP 2 */}
              {wizardStep === 2 && (
                <div className="p-7 bg-slate-900/90 border border-slate-800/80 rounded-3xl space-y-4 shadow-2xl backdrop-blur-xl">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Deliverable Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. YouTube Video Edit (v1.0)"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Client Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Tech Vision Co."
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Due Amount (₹ INR) *</label>
                      <input
                        type="number"
                        placeholder="5000"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Handover Message for Client</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Final production cut. Full uncompressed assets unlock post-payment."
                      value={clientMessage}
                      onChange={e => setClientMessage(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition shadow-inner"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setWizardStep(1)} className="w-1/3 py-3.5 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-2xl transition">Back</button>
                    <button
                      disabled={!title || !amount}
                      onClick={() => setWizardStep(3)}
                      className="w-2/3 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                    >
                      Next: Watermark Settings →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {wizardStep === 3 && (
                <div className="p-7 bg-slate-900/90 border border-slate-800/80 rounded-3xl space-y-4 shadow-2xl backdrop-blur-xl">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Watermark Overlay Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={e => setWatermarkText(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-white focus:outline-none focus:border-blue-500 transition shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Link Expiry Duration</label>
                    <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                      {['7', '14', '30', 'never'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setExpirySelection(opt)}
                          className={`py-2.5 rounded-2xl border transition-all ${
                            expirySelection === opt ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold shadow-md' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'
                          }`}
                        >
                          {opt === 'never' ? 'Never' : `${opt} Days`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setWizardStep(2)} className="w-1/3 py-3.5 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-2xl transition">Back</button>
                    <button
                      onClick={() => setWizardStep(4)}
                      className="w-2/3 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                    >
                      Review & Deploy →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {wizardStep === 4 && (
                <div className="p-7 bg-slate-900/90 border border-slate-800/80 rounded-3xl space-y-5 shadow-2xl backdrop-blur-xl">
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-white border-b border-slate-800 pb-2">
                      <span>{title}</span>
                      <span className="font-mono text-emerald-400">{formatINR(amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Client: <strong className="text-slate-200">{clientName}</strong></span>
                      <span>{fileList.length} files attached</span>
                    </div>
                    <div className="text-slate-400 font-mono">
                      Link Expiry: {expirySelection === 'never' ? 'Never' : `${expirySelection} Days`}
                    </div>
                  </div>

                  {uploading ? (
                    <div className="p-6 bg-slate-950 text-white rounded-3xl border border-slate-800 space-y-4 shadow-2xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                          <span className="text-xs font-bold">Publishing Protected Vault...</span>
                        </div>
                        <span className="text-xs font-mono text-slate-300">{uploadProgress}%</span>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-400 font-mono">
                        <div className={deployStepIndex >= 1 ? "text-emerald-400 font-bold flex items-center gap-1.5" : "flex items-center gap-1.5"}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Uploading encrypted master files
                        </div>
                        <div className={deployStepIndex >= 2 ? "text-emerald-400 font-bold flex items-center gap-1.5" : "flex items-center gap-1.5 opacity-50"}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Generating watermarked previews & gateway seal
                        </div>
                      </div>

                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setWizardStep(3)} className="w-1/3 py-3.5 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-2xl transition">Back</button>
                      <button
                        onClick={handleDeployVault}
                        className="w-2/3 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Deploy Protected Vault</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="fixed bottom-3 left-4 right-4 z-40 lg:hidden flex justify-center">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center justify-around w-full max-w-sm">
          <button
            onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
            className={`flex flex-col items-center gap-1 transition ${
              currentView === 'overview' ? 'text-blue-400 font-bold scale-105' : 'text-slate-400'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[10px]">Drops</span>
          </button>

          <button
            onClick={() => { setCurrentView('inbox'); setWizardStep(1); }}
            className={`flex flex-col items-center gap-1 transition relative ${
              currentView === 'inbox' || currentView === 'chat-thread' ? 'text-blue-400 font-bold scale-105' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4" />
              {activeRevisionsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-1 animate-ping" />
              )}
            </div>
            <span className="text-[10px]">Revisions</span>
          </button>

          <button
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="flex flex-col items-center gap-1 text-blue-400 font-bold"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 -mt-3 hover:scale-110 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-blue-400">New Drop</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px]">Menu</span>
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex lg:hidden animate-in fade-in duration-200">
          <div className="w-72 bg-slate-900 border-r border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <span className="font-black text-sm text-white uppercase">PayDrop</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                <button 
                  onClick={() => { setCurrentView('overview'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold ${
                    currentView === 'overview' ? 'bg-slate-800 text-white font-bold' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Layers className="w-4 h-4 text-blue-400" /> Deliveries Vaults
                </button>

                <button 
                  onClick={() => { setCurrentView('inbox'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold ${
                    currentView === 'inbox' ? 'bg-slate-800 text-white font-bold' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-amber-400" /> Revisions Inbox
                </button>

                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold text-blue-400 bg-blue-600/10 border border-blue-500/20"
                >
                  <Plus className="w-4 h-4" /> Create Drop
                </button>
              </nav>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="text-xs font-bold text-white truncate">{user.email}</div>
              <button onClick={handleLogout} className="w-full py-2.5 bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition">
                Sign Out Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
