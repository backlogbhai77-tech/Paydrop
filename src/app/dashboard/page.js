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
  onSnapshot, serverTimestamp 
} from 'firebase/firestore'
import { 
  Zap, Plus, Home, Briefcase, CreditCard, Wallet, 
  ArrowUpRight, ChevronRight, X, LockKeyhole, Mail, AlertCircle, RefreshCw, CheckCircle2, ShieldCheck
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

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [deliveries, setDeliveries] = useState([])
  
  const [currentTab, setCurrentTab] = useState('home')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toast, setToast] = useState(null)

  // New Escrow Form State
  const [clientEmail, setClientEmail] = useState('')
  const [projectName, setProjectName] = useState('')
  const [amount, setAmount] = useState('')
  const [creating, setCreating] = useState(false)

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
      setAuthError("Google Sign-In failed.")
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

  const handleCreateEscrow = async (e) => {
    e.preventDefault()
    if (!projectName || !amount || !clientEmail || !user) {
      showToast("Please fill all details", "error")
      return
    }

    setCreating(true)

    try {
      const numAmount = Number(amount) || 0
      const platformFee = Math.max(Math.round(numAmount * 0.05), 50)
      const creatorPayout = Math.max(numAmount - platformFee, 0)

      await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title: projectName.trim(),
        clientName: clientEmail.split('@')[0],
        clientEmail: clientEmail.trim(),
        grossAmount: numAmount,
        platformFee,
        creatorPayout,
        status: 'Awaiting Payment',
        files: [],
        createdAt: serverTimestamp()
      })

      showToast("Payment request sent!", "success")
      setProjectName('')
      setClientEmail('')
      setAmount('')
      setIsModalOpen(false)
    } catch (err) {
      showToast(err.message || "Failed to create escrow", "error")
    } finally {
      setCreating(false)
    }
  }

  const paidDeliveries = deliveries.filter(d => d.status === 'Paid')
  const pendingDeliveries = deliveries.filter(d => d.status === 'Awaiting Payment')
  const availableBalance = paidDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)
  const pendingAmount = pendingDeliveries.reduce((acc, c) => acc + (Number(c.creatorPayout) || Number(c.grossAmount) || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F3] flex flex-col items-center justify-center text-xs text-[#0A381F] font-mono">
        <div className="w-6 h-6 border-2 border-[#84E042] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  /* AUTH SCREEN */
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F4F6F3] text-slate-900 flex flex-col justify-center items-center p-6 relative font-sans">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#84E042] flex items-center justify-center text-[#0A381F] mx-auto shadow-sm">
              <Zap className="w-6 h-6 fill-[#0A381F]" />
            </div>
            <h1 className="text-2xl font-black text-[#0A381F] tracking-tight">paydrop</h1>
            <p className="text-xs text-slate-500">Mobile payment escrow platform</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="alex@company.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#84E042]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Password</label>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#84E042]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-[#0A381F] hover:bg-[#072916] text-[#84E042] font-bold text-xs rounded-2xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>}
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>{authMode === 'login' ? "New here?" : "Have an account?"}</span>
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                className="text-[#0A381F] font-bold hover:underline"
              >
                {authMode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F3] text-slate-900 font-sans flex flex-col justify-between pb-24 selection:bg-[#84E042] selection:text-[#0A381F]">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg bg-[#0A381F] text-[#84E042] text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="max-w-md w-full mx-auto px-5 pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#84E042] flex items-center justify-center text-[#0A381F] font-black shadow-xs text-lg">
              P
            </div>
            <span className="font-black text-xl text-[#0A381F] tracking-tight">paydrop</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="w-9 h-9 rounded-full bg-amber-100 text-[#0A381F] font-bold text-xs flex items-center justify-center hover:bg-amber-200 transition"
              title="Click to logout"
            >
              {user.email?.slice(0, 2).toUpperCase()}
            </button>
          </div>
        </div>

        {/* GREETING & BALANCE CARD */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-500">
            Wednesday, May 21
          </div>
          <h2 className="text-2xl font-black text-[#0A381F] tracking-tight">
            Good morning, {user.displayName || user.email?.split('@')[0]}
          </h2>

          {/* GREEN AVAILABLE BALANCE CARD */}
          <div className="bg-[#0A381F] text-white p-6 rounded-3xl space-y-5 shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="font-medium">Available balance</span>
              <Wallet className="w-4 h-4 text-[#84E042]" />
            </div>

            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {formatINR(availableBalance)}
            </div>

            <div className="flex gap-2 pt-1">
              <button 
                onClick={() => showToast("Withdrawal payout initialized")}
                className="px-4 py-2 bg-[#84E042] text-[#0A381F] text-xs font-extrabold rounded-2xl flex items-center gap-1 hover:bg-[#72c735] transition"
              >
                <ArrowUpRight className="w-4 h-4" /> Withdraw
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold rounded-2xl transition"
              >
                + Request money
              </button>
            </div>
          </div>
        </div>

        {/* MONTHLY ANALYTICS SUMMARY CARD */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xs font-bold text-slate-700">This month</h4>
              <p className="text-[10px] text-slate-400">May 1 – May 31</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#84E042]/20 text-[#0A381F] text-[11px] font-black">
              +18.4%
            </span>
          </div>

          {/* Bar chart mock visuals */}
          <div className="flex items-end gap-1.5 h-16 pt-2">
            {[40, 65, 30, 80, 50, 90, 70, 60, 100, 75, 55].map((height, i) => (
              <div 
                key={i} 
                className={`flex-1 rounded-full transition-all ${
                  i === 8 ? 'bg-[#84E042]' : 'bg-slate-100'
                }`} 
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          <div className="flex justify-between items-end pt-1">
            <div>
              <span className="text-[10px] text-slate-400 block">Total earned</span>
              <span className="text-lg font-black text-[#0A381F] font-mono">{formatINR(availableBalance + pendingAmount)}</span>
            </div>
            <span className="text-[11px] text-slate-400">{deliveries.length} payments</span>
          </div>
        </div>

        {/* ACTIVE PROJECTS LIST */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-[#0A381F]">Active projects</h3>
              <p className="text-[11px] text-slate-400">Payments protected in escrow</p>
            </div>
            <button className="text-xs font-bold text-[#0A381F] hover:underline">View all</button>
          </div>

          {deliveries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              No active escrow projects yet. Tap '+' to request payment.
            </div>
          ) : (
            deliveries.map(d => (
              <div key={d.id} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-2xl bg-[#84E042]/20 text-[#0A381F] font-black text-xs flex items-center justify-center">
                      {d.clientName?.slice(0, 2).toUpperCase() || 'EX'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0A381F]">{d.title}</h4>
                      <p className="text-[10px] text-slate-400">with {d.clientName}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black font-mono text-[#0A381F]">{formatINR(d.grossAmount)}</div>
                    <span className="text-[10px] text-slate-400 block">{d.status === 'Paid' ? 'Cleared' : 'In escrow'}</span>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        d.status === 'Paid' ? 'bg-[#84E042] w-full' : 'bg-[#84E042] w-2/3'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] pt-0.5">
                    <span className="text-[#0A381F] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#84E042]" />
                      {d.status === 'Paid' ? 'Funded' : 'In review'}
                    </span>
                    <Link href={`/d/${d.id}`} target="_blank" className="text-slate-400 font-semibold hover:text-[#0A381F] flex items-center gap-0.5">
                      View project <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-[#0A381F] text-[#84E042] shadow-xl flex items-center justify-center hover:scale-105 transition active:scale-95 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* NEW ESCROW PAYMENT REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">New Escrow</span>
                <h3 className="text-xl font-black text-[#0A381F]">Request a payment</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEscrow} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Client email</label>
                <input
                  type="email"
                  required
                  placeholder="client@company.com"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#84E042] focus:ring-1 focus:ring-[#84E042] rounded-2xl p-3 text-xs text-slate-900 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Project name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Website redesign"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#84E042] focus:ring-1 focus:ring-[#84E042] rounded-2xl p-3 text-xs text-slate-900 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:border-[#84E042] focus-within:ring-1 focus-within:ring-[#84E042]">
                  <span className="px-4 py-3 bg-slate-100/80 text-xs font-bold text-slate-500 border-r border-slate-200 flex items-center">INR</span>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-transparent p-3 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-[#84E042]/15 border border-[#84E042]/30 rounded-2xl flex gap-2.5 items-start">
                <ShieldCheck className="w-5 h-5 text-[#0A381F] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#0A381F] leading-snug font-medium">
                  Your client funds the escrow first. You get paid when the approved work is delivered.
                </p>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3.5 bg-[#0A381F] hover:bg-[#072916] text-white font-black text-xs rounded-2xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Create secure payment</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 py-2.5 px-6 flex justify-around items-center z-20">
        <button 
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center gap-1 transition ${currentTab === 'home' ? 'text-[#0A381F] font-bold' : 'text-slate-400'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button 
          onClick={() => setCurrentTab('projects')}
          className={`flex flex-col items-center gap-1 transition ${currentTab === 'projects' ? 'text-[#0A381F] font-bold' : 'text-slate-400'}`}
        >
          <Briefcase className="w-5 h-5" />
          <span className="text-[10px]">Projects</span>
        </button>

        <button 
          onClick={() => setCurrentTab('payments')}
          className={`flex flex-col items-center gap-1 transition ${currentTab === 'payments' ? 'text-[#0A381F] font-bold' : 'text-slate-400'}`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px]">Payments</span>
        </button>

        <button 
          onClick={() => setCurrentTab('wallet')}
          className={`flex flex-col items-center gap-1 transition ${currentTab === 'wallet' ? 'text-[#0A381F] font-bold' : 'text-slate-400'}`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px]">Wallet</span>
        </button>
      </div>

    </div>
  )
}
