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
  UploadCloud, CheckCircle2, Lock, ArrowRight, 
  Copy, Check, Trash2, ExternalLink, FileArchive, Clock,
  AlertCircle, RefreshCw, X, MessageSquare, Send, Bell,
  Menu, Search, Layers, FileText, ChevronRight,
  TrendingUp, IndianRupee, Shield, Sparkles, LockKeyhole, Mail,
  FileCode, Video, ChevronDown, CreditCard, Smartphone, Building2, LogOut, Sun, Moon,
  Eye, Activity, BarChart3, Settings, ShieldAlert, History, Terminal
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
    return <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />
  }
  if (['zip', 'rar', '7z', 'tar'].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
  }
  if (['js', 'ts', 'py', 'json', 'html', 'css', 'cpp'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
  }
  return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
  const [isDarkMode, setIsDarkMode] = useState(false)

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
  const [watermarkText, setWatermarkText] = useState('PAYDROP • CONFIDENTIAL PREVIEW')
  
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
    setTimeout(() => setToast(null), 3500)
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
        showToast("Welcome back to PayDrop Studio!", "success")
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
      showToast("Signed in with Google successfully", "success")
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
      showToast("Signed out successfully", "success")
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

      showToast("Delivery Vault protected & deployed successfully!", "success")
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
    if (!confirm("Permanently remove this deliverable vault?")) return
    try {
      await deleteDoc(doc(db, 'deliveries', id))
      showToast("Vault removed successfully", "success")
    } catch {
      showToast("Failed to delete", "error")
    }
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    showToast("Client Portal secure link copied to clipboard!", "success")
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
      showToast("Revision note sent to client", "success")
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
      <div className="min-h-screen bg-slate-50 dark:bg-[#070A11] flex flex-col items-center justify-center text-xs text-slate-500 font-mono gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shadow-md" />
        <span className="tracking-widest uppercase text-[10px] text-blue-600 font-bold animate-pulse">LOADING PAYDROP STUDIO...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
        <div className="w-full max-w-md relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/25">
              <Zap className="w-7 h-7 fill-white animate-bounce" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">PayDrop Studio</h1>
            <p className="text-xs text-slate-500">Payment-locked delivery vault for elite creators & agencies.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            {authError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="creator@studio.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Password</label>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition active:scale-95 flex items-center justify-center gap-2"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>{authMode === 'login' ? 'Sign In to Studio' : 'Create Pro Account'}</span>}
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>{authMode === 'login' ? "Don't have an account?" : "Already have an account?"}</span>
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                className="text-blue-600 font-bold hover:underline"
              >
                {authMode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </div>

            <div className="relative flex items-center my-2">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="shrink-0 px-2 text-[10px] text-slate-400 font-mono">OR</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-2"
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#070A11] text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans flex antialiased pb-28 lg:pb-0 relative selection:bg-blue-600 selection:text-white transition-colors duration-300`}>
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl bg-slate-900 text-white text-xs font-semibold border border-slate-800">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* CUSTOM GATEWAY MODAL */}
      {payDropGatewayModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`${isDarkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200'} border w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl relative`}>
            <button onClick={() => setPayDropGatewayModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">PayDrop Gateway</h3>
                <span className="text-[10px] text-slate-400">Internal Dummy Direct Unlock</span>
              </div>
            </div>

            <div className={`p-4 ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-2xl space-y-1`}>
              <div className="text-[11px] text-slate-500">Vault Item:</div>
              <div className="text-xs font-bold truncate">{payDropGatewayModal.title}</div>
              <div className="text-2xl font-black font-mono text-emerald-500 pt-1">{formatINR(payDropGatewayModal.grossAmount)}</div>
            </div>

            <button
              onClick={() => triggerPayDropCustomPayment(payDropGatewayModal.id)}
              disabled={processingPayment}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              {processingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Confirm Test Payment</span>}
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR WITH SETTLEMENT LOGS */}
      <aside className={`hidden lg:flex w-72 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} border-r flex-col justify-between p-4 sticky top-0 h-screen z-30 select-none backdrop-blur-xl`}>
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight uppercase">PayDrop</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[9px] font-bold">PRO</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Protected Delivery</span>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <button
              onClick={() => setCurrentView('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'overview' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Vaults & Assets</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-200 dark:bg-slate-800">{deliveries.length}</span>
            </button>

            <button
              onClick={() => setCurrentView('inbox')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'inbox' || currentView === 'chat-thread' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Revisions Inbox</span>
              </div>
              {activeRevisionsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                  {activeRevisionsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SETTLEMENT LOGS & AUDIT HISTORY SECTION IN SIDEBAR */}
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className={`p-3.5 ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-2xl space-y-2`}>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase font-mono">
              <span className="flex items-center gap-1"><History className="w-3 h-3 text-blue-500" /> Settlement Logs</span>
              <span>Live</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {paidDeliveries.length === 0 ? (
                <div className="text-[10px] text-slate-400 italic py-2 text-center">No settlements recorded yet.</div>
              ) : (
                paidDeliveries.slice(0, 4).map(item => (
                  <div key={item.id} className="p-2 rounded-xl bg-slate-900/40 border border-slate-800/60 text-[10px] space-y-0.5">
                    <div className="flex justify-between font-bold text-white truncate">
                      <span className="truncate">{item.title}</span>
                      <span className="text-emerald-400 font-mono">+{formatINR(item.grossAmount)}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono truncate">Client: {item.clientName}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`h-16 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-slate-200'} border-b sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between backdrop-blur-md`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Studio / <span className="text-slate-900 dark:text-white capitalize">{currentView}</span></span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:scale-105 active:scale-95"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* New Drop Button */}
            <button
              onClick={() => { setCurrentView('create'); setWizardStep(1); }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Drop</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition hover:border-blue-500"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white text-[10px] font-black flex items-center justify-center uppercase">
                  {user.email ? user.email.slice(0, 2) : 'PD'}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className={`absolute right-0 mt-2 w-48 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in duration-200`}>
                  <div className="p-2 border-b border-slate-200 dark:border-slate-800 mb-1">
                    <p className="text-xs font-bold truncate">{user.email}</p>
                    <span className="text-[10px] text-emerald-500 font-mono">● Pro Studio Active</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-5 rounded-3xl ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border space-y-1 backdrop-blur-xl`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-mono uppercase">Awaiting Settlement</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-500 font-mono">{formatINR(pendingAmount)}</div>
                  <p className="text-[11px] text-slate-400">{pendingDeliveries.length} locked vaults pending payment</p>
                </div>

                <div className={`p-5 rounded-3xl ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border space-y-1 backdrop-blur-xl`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-mono uppercase">Cleared Revenue</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-500 font-mono">{formatINR(totalRevenue)}</div>
                  <p className="text-[11px] text-slate-400">{paidDeliveries.length} completed transactions</p>
                </div>
              </div>

              {/* VAULT LIST */}
              <div className={`rounded-3xl ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border overflow-hidden backdrop-blur-xl`}>
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider">Deliverable Vaults ({deliveries.length})</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search drops..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {filteredDeliveries.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">No deliverables found. Tap "New Drop" to deploy your first secure vault.</div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredDeliveries.map(item => (
                      <div key={item.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                            {getFileIcon(item.files?.[0]?.name, item.files?.[0]?.type)}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold truncate">{item.title}</h4>
                              {item.status === 'Paid' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-slate-400">Client: <span className="font-medium text-slate-700 dark:text-slate-300">{item.clientName}</span> • {item.files?.length || 1} asset(s)</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                          <span className="font-mono font-black text-xs">{formatINR(item.grossAmount)}</span>
                          
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                            item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {item.status === 'Paid' ? 'Unlocked' : 'Locked'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {item.status !== 'Paid' && (
                              <button
                                onClick={() => setPayDropGatewayModal(item)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold rounded-xl transition"
                              >
                                Test Pay
                              </button>
                            )}
                            <button onClick={() => copyLink(item.id)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1">
                              <Copy className="w-3 h-3" />
                              <span>{copiedId === item.id ? 'Copied' : 'Link'}</span>
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition">
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
            <div className="space-y-4 animate-in fade-in duration-300">
              <h1 className="text-xl font-bold tracking-tight">Client Revisions Inbox</h1>
              <div className="space-y-3">
                {deliveries.map(d => (
                  <div key={d.id} className={`p-4 rounded-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border flex items-center justify-between`}>
                    <div>
                      <div className="font-bold text-xs">{d.clientName} - {d.title}</div>
                      <p className="text-xs text-slate-400 mt-0.5">Status: {d.status} • Messages: {d.messages?.length || 0}</p>
                    </div>
                    <button
                      onClick={() => { setActiveThreadDelivery(d); setCurrentView('chat-thread'); }}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md"
                    >
                      Open Thread
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: CHAT THREAD */}
          {currentView === 'chat-thread' && activeThreadDelivery && (
            <div className={`p-6 rounded-3xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border space-y-4 animate-in fade-in duration-300`}>
              <button onClick={() => setCurrentView('inbox')} className="text-xs text-blue-600 font-bold hover:underline">← Back to Inbox</button>
              <h3 className="text-sm font-bold">{activeThreadDelivery.clientName} - {activeThreadDelivery.title}</h3>
              <div className="h-72 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 text-xs">
                {(activeThreadDelivery.messages || []).map((m, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl max-w-sm ${m.sender === 'creator' ? 'bg-blue-600 text-white ml-auto shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'}`}>
                    <p className="leading-relaxed">{m.text}</p>
                    <span className="text-[9px] opacity-70 block mt-1 font-mono">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type feedback or reply..."
                  value={threadReplyText}
                  onChange={e => setThreadReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                />
                <button onClick={() => handleSendThreadReply(activeThreadDelivery.id)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW: CREATE WIZARD */}
          {currentView === 'create' && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Deploy Protected Delivery Vault</h2>
                <button onClick={() => setCurrentView('overview')} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
              </div>

              {wizardStep === 1 && (
                <div className={`p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-3xl space-y-5`}>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files); }}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center transition ${isDragging ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20' : 'border-slate-300 dark:border-slate-700'}`}
                  >
                    <UploadCloud className="w-12 h-12 text-blue-600 mx-auto mb-3 animate-bounce" />
                    <span className="text-sm font-bold block mb-1">Drag & Drop Master Deliverables</span>
                    <p className="text-xs text-slate-400 mb-4">Supports 4K Videos, ZIP archives, Design files, & Source code</p>
                    <label className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition active:scale-95">
                      Browse Files
                      <input type="file" multiple onChange={e => handleFilesAdd(e.target.files)} className="hidden" />
                    </label>
                  </div>

                  {fileList.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold font-mono text-slate-400 uppercase">Selected Assets ({fileList.length}):</span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {fileList.map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                            <span className="truncate">{f.name}</span>
                            <button onClick={() => removeFile(i)} className="text-rose-500 hover:text-rose-700"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    disabled={!fileList.length}
                    onClick={() => setWizardStep(2)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition"
                  >
                    Next: Project Details →
                  </button>
                </div>
              )}

              {wizardStep === 2 && (
                <div className={`p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-3xl space-y-4`}>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Deliverable Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Brand Identity & 4K Commercial Reel"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Client Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Alex Johnson"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Settlement Amount (₹ INR)</label>
                      <input
                        type="number"
                        placeholder="15000"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold font-mono focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Anti-Piracy Watermark Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={e => setWatermarkText(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setWizardStep(1)} className="w-1/3 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition hover:bg-slate-100 dark:hover:bg-slate-800">Back</button>
                    <button
                      disabled={!title || !amount || uploading}
                      onClick={handleDeployVault}
                      className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Encrypting ({uploadProgress}%)</span>
                        </>
                      ) : (
                        <span>Deploy Secure Vault</span>
                      )}
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
