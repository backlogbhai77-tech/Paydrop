'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Zap, Lock, Unlock, ShieldCheck, ArrowRight, 
  CheckCircle2, UploadCloud, Eye, Download, 
  ChevronRight, HelpCircle, Layers,
  CreditCard, Sparkles, Smartphone, Shield, FileArchive,
  RefreshCw, Check, ArrowUpRight, Calculator, Sliders
} from 'lucide-react'

export default function LandingPage() {
  const [sandboxTab, setSandboxTab] = useState('creator')
  const [sandboxPaid, setSandboxPaid] = useState(false)
  const [sandboxAmount, setSandboxAmount] = useState('15,000')
  const [sandboxTitle, setSandboxTitle] = useState('4K Brand Commercial Cut (Final)')
  const [sandboxProcessing, setSandboxProcessing] = useState(false)

  // Interactive Fee Calculator State
  const [calcAmount, setCalcAmount] = useState(25000)
  const fee = Math.max(Math.round(calcAmount * 0.05), 50)
  const creatorTakes = calcAmount - fee

  const handleSimulatePayment = () => {
    setSandboxProcessing(true)
    setTimeout(() => {
      setSandboxPaid(true)
      setSandboxProcessing(false)
    }, 1100)
  }

  return (
    <div className="min-h-screen w-full bg-[#090D16] text-slate-100 font-sans selection:bg-blue-600 selection:text-white antialiased">
      
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-radial from-blue-600/15 via-transparent to-transparent pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#090D16]/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-black text-sm tracking-tight text-white uppercase font-mono">PayDrop</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#sandbox" className="hover:text-white transition">Interactive Demo</a>
            <a href="#calculator" className="hover:text-white transition">Fee Calculator</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition active:scale-95 flex items-center gap-1.5"
            >
              <span>Open Studio</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-20 pb-20 px-4 sm:px-8 max-w-5xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Zero Client Ghosting • Automated File Decryption</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Never deliver final files without <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">getting paid first.</span>
        </h1>

        <p className="mt-6 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          The payment-locked escrow vault for video editors, thumbnail artists, and creative pros. Clients inspect full watermarked previews in their browser with zero login; original raw master files decrypt only after payment clears.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <span>Create Your Protected Drop</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#sandbox"
            className="w-full sm:w-auto px-7 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-xs uppercase tracking-wider rounded-xl border border-slate-800 transition"
          >
            Try In-Browser Demo
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero client account friction
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> UPI, GPay, PhonePe, Cards
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Burned-in watermark protection
          </span>
        </div>
      </section>

      {/* INTERACTIVE PLAYGROUND / SANDBOX */}
      <section id="sandbox" className="py-16 px-4 sm:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400 font-mono">Interactive Demo</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">See How PayDrop Locks Deliverables</h2>
          <p className="text-xs text-slate-400 mt-1">
            Test both creator setup and client inspection modes right inside your browser.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {/* Tab Switcher */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-950 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold border border-slate-800">
              <button
                onClick={() => setSandboxTab('creator')}
                className={`px-4 py-2 rounded-lg transition ${
                  sandboxTab === 'creator' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Creator Setup
              </button>
              <button
                onClick={() => setSandboxTab('client')}
                className={`px-4 py-2 rounded-lg transition ${
                  sandboxTab === 'client' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Client Inspection & Pay
              </button>
            </div>
          </div>

          {/* Sandbox: Creator View */}
          {sandboxTab === 'creator' && (
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Deliverable Title</label>
                <input
                  type="text"
                  value={sandboxTitle}
                  onChange={(e) => setSandboxTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Settlement Due (₹ INR)</label>
                <input
                  type="text"
                  value={sandboxAmount}
                  onChange={(e) => setSandboxAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="p-4 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/60 text-center">
                <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-1" />
                <span className="text-xs font-semibold text-slate-200 block">Commercial_Master_Cut_ProRes.mov</span>
                <span className="text-[10px] text-slate-400 font-mono">2.4 GB • Uncompressed Master Asset</span>
              </div>

              <button
                onClick={() => setSandboxTab('client')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Generate Client Inspection View</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sandbox: Client View */}
          {sandboxTab === 'client' && (
            <div className="max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">SECURE ESCROW VAULT</span>
                  <h3 className="text-xs font-bold text-white truncate max-w-[200px] mt-0.5">{sandboxTitle}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Amount Due</span>
                  <span className="text-base font-bold text-white font-mono">₹{sandboxAmount}</span>
                </div>
              </div>

              {/* Watermarked Inspection Sandbox */}
              <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-800">
                <div className="absolute inset-0 select-none pointer-events-none flex flex-col justify-around opacity-25 text-white font-mono text-[10px] font-black uppercase rotate-[-12deg]">
                  <div className="flex justify-around"><span>PAYDROP PREVIEW</span><span>UNLICENSED COPY</span></div>
                  <div className="flex justify-around"><span>SETTLEMENT REQUIRED</span><span>WATERMARKED</span></div>
                </div>

                <div className="text-center p-3 z-10">
                  {sandboxPaid ? (
                    <div className="text-emerald-400 space-y-1">
                      <Unlock className="w-8 h-8 mx-auto" />
                      <span className="text-xs font-bold text-white block">Files Decrypted & Unlocked</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Lock className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
                      <span className="text-xs font-bold text-white block">Watermarked Preview Stream</span>
                      <p className="text-[10px] text-slate-400 font-mono">Clean raw files release after payment</p>
                    </div>
                  )}
                </div>
              </div>

              {!sandboxPaid ? (
                <button
                  onClick={handleSimulatePayment}
                  disabled={sandboxProcessing}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {sandboxProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Sandbox Settlement...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Authorize & Clear ₹{sandboxAmount} (Test Mode)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-center space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Payment Authenticated
                  </div>
                  <button
                    onClick={() => setSandboxPaid(false)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow-md"
                  >
                    Download Master Archive (.ZIP)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* DYNAMIC FEE CALCULATOR */}
      <section id="calculator" className="py-16 px-4 sm:px-8 max-w-4xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">Transparent Settlement</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Earnings Calculator</h2>
          <p className="text-xs text-slate-400 mt-1">Simple 5% escrow split on successful handovers. Zero monthly fees.</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">Project Invoice Value</span>
              <span className="text-lg font-black font-mono text-white">₹{calcAmount.toLocaleString('en-IN')}</span>
            </div>
            <input 
              type="range" 
              min="1000" 
              max="150000" 
              step="1000"
              value={calcAmount}
              onChange={(e) => setCalcAmount(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Platform Escrow Fee (5%)</span>
              <div className="text-xl font-black text-rose-400 font-mono mt-1">₹{fee.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 uppercase font-mono block">Your Direct Payout</span>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">₹{creatorTakes.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16 px-4 sm:px-8 max-w-5xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400 font-mono">Process</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Four Steps to Absolute Payment Security</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { step: '01', title: 'Upload Master Files', desc: 'Attach high-res MP4, MOV, PNG, or complete source ZIP packages.' },
            { step: '02', title: 'Set Price & Duration', desc: 'Specify your handover amount in ₹ INR and link expiry period.' },
            { step: '03', title: 'Send Client Link', desc: 'Clients review watermarked drafts instantly in the browser without signing up.' },
            { step: '04', title: 'Instant Decryption', desc: 'Razorpay UPI/Card clearance releases clean, uncompressed master downloads.' }
          ].map((item, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/90 space-y-2">
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">{item.step}</span>
              <h3 className="text-sm font-bold text-white mt-2">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-4 sm:px-8 max-w-3xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400 font-mono">FAQ</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Frequently Answered Questions</h2>
        </div>

        <div className="space-y-3">
          {[
            { q: "Does the client need an account to inspect or pay?", a: "No. The inspection link works instantly on mobile and desktop without requiring client registration or downloads." },
            { q: "What formats can I safely deliver?", a: "Full uncompressed support for MP4, MOV, ProRes, PDF, JPG, PNG, and multi-gigabyte ZIP archive packages." },
            { q: "Can tech-savvy clients steal drafts via DevTools?", a: "No. Preview URLs utilize burned-in watermark layers on the asset itself, and master download keys remain inaccessible until payment verification completes." },
            { q: "What if the client needs adjustments?", a: "The client inspection portal includes a two-way revision box allowing direct communication without leaving the page." }
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1">
              <h3 className="text-xs font-bold text-white">{item.q}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 border-t border-slate-800/80 text-center text-xs text-slate-500 font-mono">
        <p>© 2026 PayDrop Studio. Engineered for creative professionals.</p>
      </footer>

    </div>
  )
}
