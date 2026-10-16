'use client'

import React, { useState, useEffect } from 'react'
import { auth, googleProvider } from '../lib/firebase'
import { 
  signInWithPopup, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { 
  Lock, ShieldCheck, ArrowRight, Sparkles, FileArchive, Film, 
  Image as ImageIcon, AlertCircle, ChevronDown, Play
} from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  const router = useRouter()
  const [authChecking, setAuthChecking] = useState(true)

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login') // 'login' | 'signup'
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Calculator State
  const [calcAmount, setCalcAmount] = useState(25000)
  const [calcCurrency, setCalcCurrency] = useState('INR')

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        router.push('/dashboard')
      } else {
        setAuthChecking(false)
      }
    })
    return () => unsub()
  }, [router])

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
      } else {
        await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput)
      }
      router.push('/dashboard')
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
      router.push('/dashboard')
    } catch {
      setAuthError("Google Sign-In blocked. Please try Email/Password login.")
    } finally {
      setAuthLoading(false)
    }
  }

  const formatCalcCurrency = (val, curr) => {
    if (curr === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
    }
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
  }

  const platformFee = Math.max(Math.round(calcAmount * 0.05), calcCurrency === 'USD' ? 1 : 50)
  const netEarnings = Math.max(calcAmount - platformFee, 0)

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F0F5EE] flex flex-col items-center justify-center text-xs text-[#063D2A] gap-3 font-mono">
        <div className="w-6 h-6 border-2 border-[#063D2A] border-t-transparent rounded-full animate-spin" />
        <span>VERIFYING PAYDROP SESSION...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F5EE] text-slate-900 font-sans antialiased selection:bg-[#94EC36] selection:text-[#063D2A] overflow-x-hidden">

      {/* FIXED NAVBAR */}
      <header className="sticky top-0 z-40 bg-[#F0F5EE]/80 backdrop-blur-xl border-b border-slate-200/80 px-6 sm:px-12 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-[#94EC36] text-[#063D2A] font-black text-xl flex items-center justify-center shadow-md shadow-[#94EC36]/20 transition-transform group-hover:scale-105">
            P
          </div>
          <div className="flex items-center gap-1">
            <span className="font-black text-2xl tracking-tight text-slate-900">paydrop</span>
            <span className="w-2 h-2 rounded-full bg-[#94EC36] animate-pulse" />
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600">
          <a href="#features" className="hover:text-[#063D2A] transition">Features</a>
          <a href="#how-it-works" className="hover:text-[#063D2A] transition">How It Works</a>
          <a href="#calculator" className="hover:text-[#063D2A] transition">Fee Calculator</a>
          <a href="#faq" className="hover:text-[#063D2A] transition">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
            className="px-5 py-2.5 text-slate-700 hover:text-[#063D2A] text-xs font-bold transition"
          >
            Sign In
          </button>

          <button
            onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
            className="px-5 py-2.5 bg-[#063D2A] hover:bg-[#094E36] text-white text-xs font-bold rounded-2xl shadow-lg shadow-[#063D2A]/15 transition active:scale-95 flex items-center gap-2 group"
          >
            <span>Start Free</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#94EC36] transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative px-6 sm:px-12 pt-16 pb-24 max-w-6xl mx-auto text-center space-y-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full text-xs font-semibold text-[#063D2A] shadow-xs animate-in fade-in slide-in-from-top-4 duration-500">
          <Sparkles className="w-4 h-4 text-[#063D2A]" />
          <span>Automated Freelancer Escrow & Stealth Protection Vault</span>
        </div>

        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
            Get Paid First. Deliver Work <span className="text-[#063D2A] underline decoration-[#94EC36] decoration-wavy decoration-2">Without Risk.</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Protect your client payments in secured escrow before handing over master video files, ZIP archives, design assets, or code.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
            className="w-full sm:w-auto px-8 py-4 bg-[#063D2A] hover:bg-[#094E36] text-white font-bold text-sm rounded-2xl shadow-xl shadow-[#063D2A]/20 transition active:scale-95 flex items-center justify-center gap-3 group"
          >
            <Lock className="w-4 h-4 text-[#94EC36]" />
            <span>Create Secure Escrow</span>
            <ArrowRight className="w-4 h-4 text-[#94EC36] transition-transform group-hover:translate-x-1" />
          </button>

          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-4 bg-white/90 hover:bg-white text-slate-800 font-bold text-sm rounded-2xl border border-slate-200/80 shadow-xs transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 text-[#063D2A] fill-[#063D2A]" />
            <span>See How It Works</span>
          </a>
        </div>

        {/* HERO INTERACTIVE MOCKUP */}
        <div className="pt-8 max-w-3xl mx-auto relative">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-[#94EC36]/40 to-[#063D2A]/20 rounded-[42px] blur-xl opacity-75 animate-pulse" />
          
          <div className="relative bg-white/90 backdrop-blur-2xl border border-slate-200/90 rounded-[38px] p-6 sm:p-8 shadow-2xl text-left space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-slate-400 ml-2">paydrop.studio/d/escrow-vault-demo</span>
              </div>
              <span className="px-3 py-1 bg-[#94EC36]/20 text-[#063D2A] text-[10px] font-black rounded-full border border-[#94EC36]/40">
                LIVE DEMO VAULT
              </span>
            </div>

            <div className="bg-[#063D2A] rounded-[28px] p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-emerald-200/80 uppercase tracking-widest font-mono">SECURED IN ESCROW</span>
                <div className="text-3xl font-black font-mono tracking-tight text-white mt-1">₹50,000</div>
                <p className="text-xs text-emerald-200/70 mt-0.5">Project: 4K Commercial Edit • Client: Lumio Media</p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-xs font-bold text-[#94EC36]">
                <ShieldCheck className="w-4 h-4" />
                <span>Payment Funded & Verified</span>
              </div>
            </div>

            <div className="p-4 bg-[#F0F5EE] rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Film className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-bold text-slate-900">Final_Master_Render_4K.mp4</div>
                  <div className="text-[10px] text-slate-400">1.2 GB • Low-Res Proxy Stream Active</div>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 font-bold border border-amber-200 rounded-xl text-[10px]">
                Master Unlocks Upon Release
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="bg-white/80 border-y border-slate-200/80 py-10 px-6 sm:px-12 text-center">
        <div className="max-w-5xl mx-auto space-y-4">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
            Trusted by Video Editors, Designers, Animators & Software Developers
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 pt-2 text-slate-600 font-mono text-xs font-bold">
            <span className="flex items-center gap-2"><Film className="w-4 h-4 text-blue-500" /> 4K RAW Videos</span>
            <span className="flex items-center gap-2"><FileArchive className="w-4 h-4 text-purple-500" /> ZIP Code Archives</span>
            <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-emerald-500" /> High-Res Graphics</span>
            <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-[#063D2A]" /> PDF Deliverables</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-6 sm:px-12 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-[#063D2A] uppercase tracking-widest font-mono">WORKFLOW</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">How PayDrop Protects Your Income</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-8 space-y-4 hover:-translate-y-1 transition duration-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#94EC36]/30 text-[#063D2A] font-black text-xl flex items-center justify-center">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900">Upload & Set Price</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your ZIPs, videos, or design deliverables into an encrypted PayDrop escrow vault and set your payment amount.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-8 space-y-4 hover:-translate-y-1 transition duration-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#063D2A] text-[#94EC36] font-black text-xl flex items-center justify-center">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900">Client Funds Escrow</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your client reviews the low-res proxy preview and deposits funds into escrow. PayDrop verifies the payment instantly.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-8 space-y-4 hover:-translate-y-1 transition duration-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#94EC36]/30 text-[#063D2A] font-black text-xl flex items-center justify-center">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900">Instant Auto-Release</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upon approval, the master uncompressed deliverables automatically unlock for the client and funds transfer directly to your bank account.
            </p>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calculator" className="py-16 px-6 sm:px-12 bg-white/80 border-y border-slate-200/80">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold text-[#063D2A] uppercase tracking-widest font-mono">TRANSPARENT PRICING</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Calculate Your Net Payout</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              No hidden subscriptions. PayDrop charges a flat 5% platform escrow fee only when you get paid successfully.
            </p>
          </div>

          <div className="bg-[#063D2A] text-white p-8 rounded-[36px] shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-200">Project Amount</span>
              <select
                value={calcCurrency}
                onChange={e => setCalcCurrency(e.target.value)}
                className="bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 focus:outline-none cursor-pointer"
              >
                <option value="INR" className="bg-slate-900">INR (₹)</option>
                <option value="USD" className="bg-slate-900">USD ($)</option>
              </select>
            </div>

            <input
              type="range"
              min={calcCurrency === 'USD' ? 50 : 2000}
              max={calcCurrency === 'USD' ? 5000 : 200000}
              step={calcCurrency === 'USD' ? 50 : 1000}
              value={calcAmount}
              onChange={e => setCalcAmount(Number(e.target.value))}
              className="w-full accent-[#94EC36] cursor-pointer"
            />

            <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-emerald-200">
                <span>Requested Amount</span>
                <span className="font-mono font-bold text-white">{formatCalcCurrency(calcAmount, calcCurrency)}</span>
              </div>
              <div className="flex justify-between text-emerald-200">
                <span>Platform Fee (5%)</span>
                <span className="font-mono text-rose-300">-{formatCalcCurrency(platformFee, calcCurrency)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#94EC36] pt-2 border-t border-white/10">
                <span>Your Net Bank Payout</span>
                <span className="font-mono">{formatCalcCurrency(netEarnings, calcCurrency)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 sm:px-12 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#063D2A] uppercase tracking-widest font-mono">GOT QUESTIONS?</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {[
            { q: "How does PayDrop guarantee client payment?", a: "Clients deposit funds into PayDrop's secure escrow vault before they can download your uncompressed master files. Once deposited, the funds are guaranteed for payout upon delivery." },
            { q: "What file types can I upload?", a: "You can attach any file format, including MP4/MOV videos, ZIP archives, PSDs, Figma files, PDFs, and code repositories." },
            { q: "How does PayDrop protect against stealth screen recording?", a: "We serve compressed low-res proxy previews while keeping original 4K/ZIP master files locked on our CDN. Additionally, dynamic personal watermarks and tab-blur mechanisms prevent unauthorized capture." },
            { q: "Is there a monthly subscription fee?", a: "No! PayDrop is 100% free to join. We only charge a small 5% platform fee per successful escrow transaction." }
          ].map((item, idx) => (
            <div key={idx} className="bg-white/90 border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-6 py-4 text-left text-xs font-bold text-slate-900 flex items-center justify-between gap-4"
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#063D2A] transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER CTA */}
      <footer className="bg-[#063D2A] text-white py-16 px-6 sm:px-12 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Stop Chasing Client Payments.</h2>
          <p className="text-xs sm:text-sm text-emerald-200/80">Join thousands of freelancers securing their deliverables with PayDrop Studio today.</p>
          <button
            onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
            className="px-8 py-4 bg-[#94EC36] hover:bg-[#83E222] text-[#063D2A] font-extrabold text-xs rounded-2xl shadow-xl transition active:scale-95 inline-flex items-center gap-2"
          >
            <span>Create Your First Escrow Request</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* AUTH MODAL DIALOG */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-[36px] p-8 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#94EC36] text-[#063D2A] font-black text-sm flex items-center justify-center">
                  P
                </div>
                <span className="font-bold text-sm text-slate-900">{authMode === 'login' ? 'Sign In to PayDrop' : 'Create PayDrop Account'}</span>
              </div>
              <button onClick={() => setAuthModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="ankit@studio.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F0F5EE] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#94EC36] transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F0F5EE] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#94EC36] transition"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-[#063D2A] hover:bg-[#094E36] text-white font-bold text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
              >
                {authLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>{authMode === 'login' ? "Need an account?" : "Already registered?"}</span>
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                className="text-[#063D2A] font-bold hover:underline"
              >
                {authMode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </div>

            <div className="relative flex items-center my-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="shrink-0 px-3 text-[10px] text-slate-400 font-mono">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full py-3 bg-[#F0F5EE] hover:bg-slate-200/60 text-slate-800 font-bold text-xs rounded-2xl border border-slate-200 transition flex items-center justify-center gap-2"
            >
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
