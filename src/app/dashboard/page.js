'use client'

import React, { useState, useEffect } from 'react'
import { auth, db, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { 
  Zap, Bell, Menu, X, Plus, Home, FolderKanban, CreditCard, 
  BarChart3, Users, Settings, UploadCloud, CheckCircle2, 
  Lock, ArrowRight, ArrowLeft, Shield, Eye, Copy, Check, 
  Trash2, ExternalLink, Sparkles, FileText, ChevronRight,
  TrendingUp, AlertCircle, RefreshCw, FileCheck
} from 'lucide-react'
import Link from 'next/link'

const CLOUDINARY_CLOUD_NAME = "mrfujhf8"
const CLOUDINARY_UPLOAD_PRESET = "releasedrop_vault"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  
  const [currentView, setCurrentView] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const [wizardStep, setWizardStep] = useState(1)
  const [creating, setCreating] = useState(false)
  
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [amount, setAmount] = useState('')
  const [watermarkText, setWatermarkText] = useState('UNPAID PREVIEW • CONFIDENTIAL')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) fetchDeliveries(currentUser.uid)
    })
    return () => unsub()
  }, [])

  const fetchDeliveries = async (uid) => {
    try {
      const q = query(collection(db, 'deliveries'), where('userId', '==', uid))
      const snap = await getDocs(q)
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setDeliveries(docs)
    } catch (err) {
      console.error(err)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      await signInWithRedirect(auth, googleProvider)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setUploadError(null)
    }
  }

  const uploadFileToCloudinary = (file) => {
    setUploading(true)
    setUploadProgress(5)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 98)
          setUploadProgress(percent)
        }
      }

      xhr.onload = () => {
        setUploading(false)
        try {
          const res = JSON.parse(xhr.responseText)
          if (xhr.status === 200 && (res.secure_url || res.url)) {
            setUploadProgress(100)
            resolve(res.secure_url || res.url)
          } else {
            const errDetail = res?.error?.message || `Upload status: ${xhr.status}`
            setUploadError(errDetail)
            reject(new Error(errDetail))
          }
        } catch (e) {
          setUploadError("Response parse error from Cloudinary")
          reject(new Error("Parse error"))
        }
      }

      xhr.onerror = () => {
        setUploading(false)
        setUploadError("Network connection failed")
        reject(new Error("Network failed"))
      }

      xhr.send(formData)
    })
  }

  const handleFinalDeploy = async () => {
    if (!title || !amount || !selectedFile || !user) {
      alert("Please fill all required fields and select a file.")
      return
    }

    setCreating(true)
    try {
      const secureUrl = await uploadFileToCloudinary(selectedFile)
      const numAmount = Number(amount) || 0
      const platformFee = Math.max(Math.round(numAmount * 0.05), 50)
      const creatorPayout = Math.max(numAmount - platformFee, 0)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const newDocRef = await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title,
        clientName: clientName || 'Client',
        clientEmail: clientEmail.trim(),
        notes: notes || '',
        grossAmount: numAmount,
        platformFee,
        creatorPayout,
        watermarkText: watermarkText || 'UNPAID PREVIEW',
        status: 'Awaiting Payment',
        previewUrl: secureUrl,
        fileUrl: secureUrl,
        fileName: selectedFile.name,
        fileSize: (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB",
        fileType: selectedFile.type || 'video/mp4',
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        createdAt: serverTimestamp()
      })

      // 🔥 Explicit Email Trigger with Feedback
      if (clientEmail && clientEmail.trim().length > 0) {
        try {
          const emailResponse = await fetch('/api/send-delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientEmail: clientEmail.trim(),
              clientName: clientName || 'Client',
              creatorName: user.displayName || user.email?.split('@')[0] || 'ReleaseDrop Creator',
              projectTitle: title,
              amount: numAmount,
              deliveryUrl: `${window.location.origin}/d/${newDocRef.id}`
            })
          })
          const emailData = await emailResponse.json()
          if (!emailResponse.ok) {
            alert(`Delivery created, but Email dispatch failed: ${emailData.error || 'Server error'}`)
          } else {
            alert(`Vault Created & Email sent successfully to ${clientEmail}!`)
          }
        } catch (mailErr) {
          alert(`Email API connection failed: ${mailErr.message}`)
        }
      } else {
        alert("Delivery created successfully (No email entered).")
      }

      // Reset
      setTitle('')
      setClientName('')
      setClientEmail('')
      setNotes('')
      setAmount('')
      setSelectedFile(null)
      setWizardStep(1)
      setCurrentView('overview')
      fetchDeliveries(user.uid)
    } catch (err) {
      alert("Deployment halted: " + err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Revoke this delivery link? Client access will be permanently revoked.")) return
    await deleteDoc(doc(db, 'deliveries', id))
    setDeliveries(prev => prev.filter(d => d.id !== id))
  }

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const totalRevenue = paidDeliveries.reduce((acc, c) => acc + (c.creatorPayout || c.grossAmount || 0), 0)
  const pendingAmount = pendingDeliveries.reduce((acc, c) => acc + (c.creatorPayout || c.grossAmount || 0), 0)
  const totalViews = deliveries.reduce((acc, c) => acc + (c.viewCount || 0), 0)

  const numAmountPreview = Number(amount) || 0
  const previewFee = Math.max(Math.round(numAmountPreview * 0.05), 50)
  const previewPayout = Math.max(numAmountPreview - previewFee, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-8 h-8 border-[2.5px] border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-semibold text-slate-500 tracking-wide">Initializing Studio Session...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-blue-500/20">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">ReleaseDrop Studio</h1>
        <p className="text-slate-500 text-xs mt-2 max-w-sm">Sign in to deliver payment-locked master files.</p>
        <button 
          onClick={handleGoogleLogin} 
          className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          Sign In with Google
        </button>
      </div>
    )
  }

  const userInitial = user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex antialiased">
      
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#091124] text-slate-300 flex-col justify-between p-5 sticky top-0 h-screen z-30 border-r border-slate-800/60">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-black text-base tracking-tight text-white">ReleaseDrop</span>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => { setCurrentView('overview'); setWizardStep(1); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'overview' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" /> Overview
            </button>
            <button 
              onClick={() => { setCurrentView('deliveries'); setWizardStep(1); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'deliveries' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FolderKanban className="w-4 h-4" /> Deliveries
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {userInitial}
            </div>
            <div className="truncate max-w-[120px]">
              <div className="text-xs font-bold text-white truncate">{user.displayName || user.email}</div>
              <div className="text-[10px] text-slate-400">Pro Creator</div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="p-1.5 text-slate-400 hover:text-red-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Section */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Dashboard • <strong className="text-slate-900 font-bold">{user.displayName || user.email?.split('@')[0]}</strong>
            </span>
          </div>

          <button 
            onClick={() => { setCurrentView('create'); setWizardStep(1); }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm active:scale-95 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Delivery
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          
          {/* CREATE WIZARD */}
          {currentView === 'create' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <button onClick={() => setCurrentView('overview')} className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
              </button>

              <h1 className="text-xl font-black text-slate-900 tracking-tight">Create a new delivery</h1>

              {/* Steps Progress */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs font-semibold">
                <span className={wizardStep >= 1 ? 'text-blue-600 font-bold' : 'text-slate-400'}>1. Master File</span>
                <span className={wizardStep >= 2 ? 'text-blue-600 font-bold' : 'text-slate-400'}>2. Details & Client Email</span>
                <span className={wizardStep >= 3 ? 'text-blue-600 font-bold' : 'text-slate-400'}>3. Amount</span>
                <span className={wizardStep >= 4 ? 'text-blue-600 font-bold' : 'text-slate-400'}>4. Deploy</span>
              </div>

              {wizardStep === 1 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50">
                    <UploadCloud className="w-10 h-10 text-blue-600 mb-2" />
                    <span className="text-sm font-bold text-slate-900">Select Deliverable File</span>
                    <span className="text-[11px] text-slate-400 mt-1">MP4, MOV, PNG, JPG, ZIP</span>
                    <label className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm">
                      Browse Files
                      <input type="file" required onChange={handleFileSelect} className="hidden" />
                    </label>
                  </div>
                  {selectedFile && (
                    <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-xl flex justify-between items-center">
                      <span className="truncate">{selectedFile.name}</span>
                      <span>{(selectedFile.size / (1024*1024)).toFixed(2)} MB</span>
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <button 
                      disabled={!selectedFile}
                      onClick={() => setWizardStep(2)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md"
                    >
                      Next: Details →
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Project Title *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Commercial Reel Edit" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Client Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rahul Sharma" 
                      value={clientName} 
                      onChange={e => setClientName(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Client Email (Auto-Notification Link)</label>
                    <input 
                      type="email" 
                      placeholder="client@gmail.com" 
                      value={clientEmail} 
                      onChange={e => setClientEmail(e.target.value)} 
                      className="w-full bg-blue-50/50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold" 
                    />
                    <span className="text-[10px] text-blue-600 block mt-1">
                      ReleaseDrop will instantly email the unlock link to this address.
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(1)} className="text-xs font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={!title || !clientName}
                      onClick={() => setWizardStep(3)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md"
                    >
                      Next: Amount →
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Amount to Unlock (₹ INR) *</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 2000" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Preview Watermark Text</label>
                    <input 
                      type="text" 
                      value={watermarkText} 
                      onChange={e => setWatermarkText(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900" 
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(2)} className="text-xs font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={!amount}
                      onClick={() => setWizardStep(4)} 
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md"
                    >
                      Next: Review →
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Project:</span><span className="font-bold text-slate-900">{title}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Client:</span><span className="font-bold text-slate-900">{clientName}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Target Email:</span><span className="font-bold text-blue-600">{clientEmail || 'None'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Amount:</span><span className="font-black text-slate-900">₹{numAmountPreview}</span></div>
                  </div>

                  {uploading && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Uploading file to Cloudinary vault...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button onClick={() => setWizardStep(3)} className="text-xs font-semibold text-slate-500">← Back</button>
                    <button 
                      disabled={creating || uploading}
                      onClick={handleFinalDeploy} 
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{creating ? 'Processing Vault & Sending Email...' : 'Deploy Payment-Locked Vault'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OVERVIEW LIST */}
          {currentView === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">REVENUE</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">PENDING</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">₹{pendingAmount.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">PAID</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{paidDeliveries.length}</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">ACTIVE LINKS</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{deliveries.length}</div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-900">Recent Deliveries</h3>
                {deliveries.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No deliveries yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {deliveries.map(item => (
                      <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{item.title}</div>
                          <div className="text-[10px] text-slate-400">{item.clientName} ({item.clientEmail || 'no email'})</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 font-mono">₹{item.grossAmount}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {item.status}
                          </span>
                          <button onClick={() => copyLink(item.id)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg">
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <Link href={`/d/${item.id}`} target="_blank" className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === 'deliveries' && (
            <div className="space-y-4">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Deliveries</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliveries.map(item => (
                  <div key={item.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{item.clientName}</span>
                        <h3 className="text-sm font-extrabold text-slate-900 mt-1">{item.title}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">{item.fileName} • {item.fileSize}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                      <span className="font-extrabold text-slate-900 font-mono">₹{item.grossAmount}</span>
                      <div className="flex gap-2">
                        <button onClick={() => copyLink(item.id)} className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                          {copiedId === item.id ? 'Copied' : 'Share'}
                        </button>
                        <Link href={`/d/${item.id}`} target="_blank" className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
