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
  Zap, Plus, Layers, MessageSquare, ShieldCheck, 
  UploadCloud, Lock, ExternalLink, FileArchive, 
  Trash2, RefreshCw, X, Menu, Search, LockKeyhole, Mail, AlertCircle
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
  const strokeColor = color === 'emerald' ? '#059669' : '#2563EB'
  const gradId = `spark-fill-${cardId}`

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300">
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {badge && (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
            color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' :
            'bg-blue-50 text-blue-700 border border-blue-200/80'
          }`}>
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2">
        <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{amount}</div>
        <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="relative mt-3">
        {activePoint && activePoint.cardId === cardId && (
          <div 
            className="absolute z-20 px-2 py-1 bg-slate-900 text-white rounded-md text-[10px] font-mono shadow-xl -translate-x-1/2 -top-8 pointer-events-none"
            style={{ left: `${activePoint.x}px` }}
          >
            {activePoint.label}: {activePoint.formatted || activePoint.value}
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12 overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={fillD} fill={`url(#${gradId})`} />
          <path d={pathD} fill="none" stroke={hasData ? strokeColor : '#CBD5E1'} strokeWidth="2" strokeDasharray={hasData ? 'none' : '4 4'} strokeLinecap="round" />
          {hasData && points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={activePoint?.cardId === cardId && activePoint?.index === i ? "4.5" : "3"}
              className="cursor-pointer transition-all duration-150"
              fill={activePoint?.cardId === cardId && activePoint?.index === i ? strokeColor : "#FFFFFF"}
              stroke={strokeColor}
              strokeWidth="2"
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
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [activeChartPoint, setActiveChartPoint] = useState(null)

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
        viewCount: 0,
        messages: [],
        createdAt: serverTimestamp()
      })

      showToast("Delivery Vault created and live!", "success")
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
    showToast("Client link copied!", "success")
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
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>LOADING SECURE STUDIO...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-500/30">
              <Zap className="w-7 h-7 fill-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">PayDrop Studio</h1>
            <p className="text-xs text-slate-400">Professional escrow delivery vault for modern freelancers.</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
            {authError && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="creator@studio.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Password</label>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>}
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>{authMode === 'login' ? "New to PayDrop?" : "Already registered?"}</span>
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                className="text-blue-400 font-bold hover:underline"
              >
                {authMode === 'login' ? 'Create an Account' : 'Sign In'}
              </button>
            </div>

            <div className="relative flex items-center my-2">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="shrink-0 px-2 text-[10px] text-slate-500 font-mono">OR</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex antialiased pb-28 lg:pb-0 relative selection:bg-blue-600 selection:text-white">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl bg-slate-900 text-white text-xs font-semibold border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* REFINED CLEAN DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/90 flex-col justify-between p-4 sticky top-0 h-screen z-30 select-none">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-slate-900 uppercase">PayDrop</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold">ESCROW</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Freelancer Dashboard</span>
            </div>
          </div>

          <button
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
            <span>Create New Vault</span>
          </button>

          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2 font-mono">Workspace</span>
            
            <button
              onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentView === 'overview' ? 'bg-slate-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Active Vaults</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${currentView === 'overview' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {deliveries.length}
              </span>
            </button>

            <button
              onClick={() => { setCurrentView('inbox'); setWizardStep(1); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentView === 'inbox' || currentView === 'chat-thread' ? 'bg-slate-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Client Revisions</span>
              </div>
              {activeRevisionsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                  {activeRevisionsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Escrow Locked
            </span>
            <div className="text-sm font-black text-slate-900 font-mono">{formatINR(pendingAmount)}</div>
          </div>

          <div className="pt-1 flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : (user.email ? user.email.slice(0, 2).toUpperCase() : 'PD')}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">{user.displayName || user.email?.split('@')[0]}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 text-xs p-1.5 rounded-lg transition" title="Sign Out">✕</button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="hidden sm:inline">Workspace</span>
              <span className="hidden sm:inline">/</span>
              <span className="text-slate-900 font-bold capitalize">{currentView.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search vaults..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600 transition"
              />
            </div>

            <button
              onClick={() => { setCurrentView('create'); setWizardStep(1); }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Drop</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">

          {/* VIEW: OVERVIEW */}
          {currentView === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Escrow Dashboard</h1>
                <p className="text-xs text-slate-500 mt-0.5">Manage secure client handovers and track fund clearances.</p>
              </div>

              {/* Sparkline Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InteractiveSparkline
                  cardId="pending"
                  title="Funds in Escrow"
                  amount={formatINR(pendingAmount)}
                  subtitle="Awaiting client approval & settlement"
                  data={pendingTrendData}
                  color="blue"
                  badge="Locked"
                  activePoint={activeChartPoint}
                  onPointHover={setActiveChartPoint}
                />
                <InteractiveSparkline
                  cardId="cleared"
                  title="Cleared Payouts"
                  amount={formatINR(totalRevenue)}
                  subtitle="Successfully settled earnings"
                  data={clearedTrendData}
                  color="emerald"
                  badge="Released"
                  activePoint={activeChartPoint}
                  onPointHover={setActiveChartPoint}
                />
              </div>

              {/* Deliveries Table List */}
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Vaults ({deliveries.length})</h3>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    {['all', 'pending', 'paid'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setFilterStatus(tab)}
                        className={`px-3 py-1 rounded-lg transition capitalize ${
                          filterStatus === tab ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredDeliveries.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    No deliverables found. Create your first secure escrow drop.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredDeliveries.map(item => (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <FileArchive className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Client: <span className="text-slate-700 font-medium">{item.clientName}</span> • {item.files?.length || 1} asset(s)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span className="font-mono font-black text-xs text-slate-900">
                            {formatINR(item.grossAmount)}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.status === 'Paid' ? 'Released' : 'In Escrow'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyLink(item.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition"
                            >
                              {copiedId === item.id ? 'Copied' : 'Copy Link'}
                            </button>
                            <Link href={`/d/${item.id}`} target="_blank" className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition">
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
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Revisions & Feedback</h1>
                <p className="text-xs text-slate-500 mt-0.5">Active change requests and project discussion threads.</p>
              </div>

              <div className="space-y-3">
                {deliveries.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
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
                        className={`p-5 rounded-2xl bg-white border transition-all ${
                          isRevisionActive ? 'border-amber-300 shadow-xs ring-1 ring-amber-200/50' : 'border-slate-200/80 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
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
                                {lastMsg ? lastMsg.text : (d.status === 'Paid' ? 'Funds released. Assets unlocked.' : 'Escrow vault active. Awaiting review.')}
                              </p>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
                                <span>{lastMsg ? new Date(lastMsg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                                <span>•</span>
                                <span className="font-bold text-slate-700">{formatINR(d.grossAmount)}</span>
                                {isRevisionActive && (
                                  <span className="px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                    Changes Requested
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setActiveThreadDelivery(d); setCurrentView('chat-thread'); }}
                              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Open Thread</span>
                            </button>
                          </div>
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
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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

                <Link href={`/d/${activeThreadDelivery.id}`} target="_blank" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                  <span>Portal View</span> <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="h-80 overflow-y-auto p-4 bg-slate-50 rounded-xl space-y-3">
                {(activeThreadDelivery.messages || []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No messages yet in this revision thread.
                  </div>
                ) : (
                  activeThreadDelivery.messages.map((m, idx) => {
                    const isCreator = m.sender === 'creator'
                    return (
                      <div key={idx} className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-2xl text-xs max-w-sm ${
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

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type revision reply..."
                  value={threadReplyText}
                  onChange={e => setThreadReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendThreadReply(activeThreadDelivery.id)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
                />
                <button
                  onClick={() => handleSendThreadReply(activeThreadDelivery.id)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* VIEW: 4-STEP WIZARD */}
          {currentView === 'create' && (
            <div className="max-w-xl mx-auto space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Create Escrow Vault</h2>
                  <p className="text-xs text-slate-500">Lock assets and secure client payment handshake.</p>
                </div>
                <button onClick={() => setCurrentView('overview')} className="text-xs font-semibold text-slate-400 hover:text-slate-700">Cancel</button>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between text-xs font-semibold shadow-xs">
                <span className={wizardStep === 1 ? 'text-blue-600 font-bold' : 'text-slate-400'}>1. Assets</span>
                <span className="text-slate-300">→</span>
                <span className={wizardStep === 2 ? 'text-blue-600 font-bold' : 'text-slate-400'}>2. Details</span>
                <span className="text-slate-300">→</span>
                <span className={wizardStep === 3 ? 'text-blue-600 font-bold' : 'text-slate-400'}>3. Preview</span>
                <span className="text-slate-300">→</span>
                <span className={wizardStep === 4 ? 'text-blue-600 font-bold' : 'text-slate-400'}>4. Deploy</span>
              </div>

              {wizardStep === 1 && (
                <div className="p-6 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-xs">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files); }}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      isDragging ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50 hover:border-blue-500'
                    }`}
                  >
                    <UploadCloud className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                    <span className="text-sm font-bold text-slate-900 block">Drop Project Files Here</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">Videos, Zips, Designs, Documents</span>
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

              {wizardStep === 2 && (
                <div className="p-6 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-xs">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Deliverable Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. YouTube Video Edit (v1.0)"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Client Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Escrow Amount (₹ INR) *</label>
                      <input
                        type="number"
                        placeholder="5000"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Note for Client</label>
                    <textarea
                      rows={2}
                      placeholder="Final draft ready for review. Full files unlock upon payment release."
                      value={clientMessage}
                      onChange={e => setClientMessage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setWizardStep(1)} className="w-1/3 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition">Back</button>
                    <button
                      disabled={!title || !amount}
                      onClick={() => setWizardStep(3)}
                      className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      Next: Watermark Settings →
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="p-6 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-xs">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Watermark Overlay Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={e => setWatermarkText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Link Expiry</label>
                    <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                      {['7', '14', '30', 'never'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setExpirySelection(opt)}
                          className={`py-2 rounded-xl border transition ${
                            expirySelection === opt ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold' : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {opt === 'never' ? 'Never' : `${opt} Days`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setWizardStep(2)} className="w-1/3 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition">Back</button>
                    <button
                      onClick={() => setWizardStep(4)}
                      className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      Review & Deploy →
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="p-6 bg-white border border-slate-200/90 rounded-2xl space-y-5 shadow-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                      <span>{title}</span>
                      <span>{formatINR(amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Client: {clientName}</span>
                      <span>{fileList.length} files attached</span>
                    </div>
                  </div>

                  {uploading ? (
                    <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                          <span className="text-xs font-semibold">Deploying Escrow Vault...</span>
                        </div>
                        <span className="text-xs font-mono text-slate-300">{uploadProgress}%</span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setWizardStep(3)} className="w-1/3 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition">Back</button>
                      <button
                        onClick={handleDeployVault}
                        className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Deploy Vault</span>
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
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl px-3 py-2 flex items-center justify-around w-full max-w-sm">
          <button
            onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
            className={`flex flex-col items-center gap-1 transition ${
              currentView === 'overview' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[10px]">Vaults</span>
          </button>

          <button
            onClick={() => { setCurrentView('inbox'); setWizardStep(1); }}
            className={`flex flex-col items-center gap-1 transition relative ${
              currentView === 'inbox' || currentView === 'chat-thread' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4" />
              {activeRevisionsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-1" />
              )}
            </div>
            <span className="text-[10px]">Revisions</span>
          </button>

          <button
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="flex flex-col items-center gap-1 text-blue-600 font-bold"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 -mt-2">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-blue-600">New Drop</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-800"
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px]">Menu</span>
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex lg:hidden animate-in fade-in duration-150">
          <div className="w-72 bg-white h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <span className="font-black text-sm text-slate-900 uppercase">PayDrop</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <button 
                  onClick={() => { setCurrentView('overview'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    currentView === 'overview' ? 'bg-slate-900 text-white font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-4 h-4" /> Active Vaults
                </button>

                <button 
                  onClick={() => { setCurrentView('inbox'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    currentView === 'inbox' ? 'bg-slate-900 text-white font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" /> Client Revisions
                </button>

                <button 
                  onClick={() => { setCurrentView('create'); setWizardStep(1); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50/60"
                >
                  <Plus className="w-4 h-4" /> Create New Vault
                </button>
              </nav>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
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
