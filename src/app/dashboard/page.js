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
  Send, ArrowRight, ArrowLeft, Share2, Shield, CheckCircle, Clock
} from 'lucide-react'
import Link from 'next/link'

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount)
  if (isNaN(num)) return currency === 'USD' ? '$0.00' : '₹0'
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
}

export default function ProfessionalDashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTab, setCurrentTab] = useState('home')
  const [toast, setToast] = useState(null)
  const [balanceVisible, setBalanceVisible] = useState(true)

  // Drawer & Wizard States
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [expirySelection, setExpirySelection] = useState('7')
  
  const [fileList, setFileList] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  // Thread Chat
  const [activeThreadDelivery, setActiveThreadDelivery] = useState(null)
  const [threadReplyText, setThreadReplyText] = useState('')
  const chatBottomRef = useRef(null)

  const showToast = (message) => {
    setToast(message)
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
      }
    })
    return () => {
      unsubAuth()
      if (unsubFirestore) unsubFirestore()
    }
  }, [])

  const handleFilesAdd = (files) => {
    setFileList(prev => [...prev, ...Array.from(files)])
  }

  const handleDeployVault = async () => {
    if (!title || !amount || !fileList.length || !user) return
    setUploading(true)

    try {
      // Mock upload for manifest
      const manifest = fileList.map(f => ({
        name: f.name,
        size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: f.type,
        rawUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        previewUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
      }))

      const numAmount = Number(amount) || 0
      const newDocRef = await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title: title.trim(),
        clientName: clientName.trim() || clientEmail.split('@')[0],
        clientEmail: clientEmail.trim(),
        clientMessage: clientMessage.trim(),
        grossAmount: numAmount,
        currency,
        status: 'Awaiting Payment',
        files: manifest,
        createdAt: serverTimestamp()
      })

      // Send dispatch API
      await fetch('/api/send-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: clientEmail.trim(),
          clientName: clientName.trim(),
          creatorName: user.displayName || user.email?.split('@')[0],
          projectTitle: title.trim(),
          amount: numAmount,
          deliveryUrl: `${window.location.origin}/d/${newDocRef.id}`
        })
      })

      showToast("Escrow Vault deployed successfully")
      setTitle(''); setClientEmail(''); setAmount(''); setFileList([])
      setRequestModalOpen(false)
    } catch {
      showToast("Error creating vault")
    } finally {
      setUploading(false)
    }
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const totalRevenueINR = paidDeliveries.filter(d => (d.currency || 'INR') === 'INR').reduce((acc, c) => acc + (Number(c.grossAmount) || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-mono text-xs">
        [INITIALIZING VAULT ENGINE...]
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col lg:flex-row antialiased">
      
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#072217] text-white text-xs font-semibold px-4 py-2.5 rounded-lg border border-emerald-800 shadow-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* DEVELOPER SIDEBAR NAVIGATION */}
      <aside className="w-full lg:w-64 bg-white border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#072217] text-emerald-400 font-black text-sm rounded-md flex items-center justify-center">
                P
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900">PayDrop Studio</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">v1.4</span>
          </div>

          <button
            onClick={() => { setWizardStep(1); setRequestModalOpen(true); }}
            className="w-full py-2.5 bg-[#072217] hover:bg-[#0b3827] text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Create Escrow Vault</span>
          </button>

          <nav className="space-y-1">
            {[
              { id: 'home', label: 'Dashboard', icon: Home },
              { id: 'projects', label: 'Deliverables', icon: Briefcase, count: deliveries.length },
              { id: 'revisions', label: 'Revisions & Chat', icon: MessageSquare },
              { id: 'wallet', label: 'Financial Settlement', icon: Wallet }
            ].map(item => {
              const Icon = item.icon
              const active = currentTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                    active ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-[#072217]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className="text-[10px] font-mono bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded">
                      {item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 truncate">{user?.displayName || 'Ankit Studio'}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</div>
          </div>
          <button onClick={() => signOut(auth)} className="text-xs text-slate-400 hover:text-rose-600 font-medium">Exit</button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl mx-auto p-6 lg:p-10 space-y-8 min-w-0">
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Escrow Operations</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage protected client deliverables and payments</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Gateway Operational
            </span>
          </div>
        </div>

        {/* FINANCIAL SUMMARY CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Clearing Balance</span>
              <Wallet className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono-data text-slate-900">
              {formatCurrency(totalRevenueINR, 'INR')}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Protected & Ready for Payout</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Active Vaults</span>
              <Shield className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono-data text-slate-900">
              {deliveries.filter(d => d.status !== 'Paid').length}
            </div>
            <div className="text-[11px] text-amber-600 font-medium">Pending Client Funding</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Settled Deliveries</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono-data text-slate-900">
              {paidDeliveries.length}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">100% Escrow Released</div>
          </div>
        </div>

        {/* DELIVERABLES TABLE STRUCTURE */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Active Deliverable Vaults</h3>
            <span className="text-xs text-slate-400 font-mono">{deliveries.length} total entries</span>
          </div>

          {deliveries.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono">
              [ NO ESCROW VAULTS DEPLOYED ]
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {deliveries.map(item => (
                <div key={item.id} className="p-5 hover:bg-slate-50/80 transition flex items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 truncate">{item.title}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                        item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.status === 'Paid' ? 'RELEASED' : 'PENDING ESCROW'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      Client: <span className="font-medium text-slate-700">{item.clientEmail}</span> • {item.files?.length || 0} file(s) attached
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-bold font-mono-data text-sm text-slate-900">{formatCurrency(item.grossAmount, item.currency)}</div>
                      <div className="text-[10px] text-slate-400">Total Value</div>
                    </div>

                    <Link 
                      href={`/d/${item.id}`} 
                      target="_blank"
                      className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition"
                      title="Open Client Portal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* CLEAN MODAL BUILDER FOR CREATING ESCROW */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl border border-slate-200 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">New Protected Delivery</h3>
              <button onClick={() => setRequestModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project / Deliverable Title *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Website Source Code & Assets" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Email Address *</label>
                <input 
                  type="email" 
                  placeholder="client@company.com" 
                  value={clientEmail} 
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Escrow Amount (INR) *</label>
                <input 
                  type="number" 
                  placeholder="2000" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attach Master Files *</label>
                <input 
                  type="file" 
                  multiple 
                  onChange={e => handleFilesAdd(e.target.files)}
                  className="w-full p-2 bg-slate-50 border border-dashed border-slate-300 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button onClick={() => setRequestModalOpen(false)} className="w-1/3 py-2.5 border border-slate-200 font-semibold text-xs rounded-lg text-slate-600">Cancel</button>
              <button onClick={handleDeployVault} className="w-2/3 py-2.5 bg-[#072217] hover:bg-[#0b3827] text-white font-semibold text-xs rounded-lg shadow-sm">
                Deploy Vault & Send Email
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
