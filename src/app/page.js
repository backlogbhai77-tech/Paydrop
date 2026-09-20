'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Zap, Lock, Unlock, ShieldCheck, ArrowRight, 
  CheckCircle2, UploadCloud, Eye, Download, 
  FileCheck2, ChevronRight, HelpCircle, Layers,
  CreditCard, Sparkles, Smartphone, Shield, FileArchive,
  RefreshCw, Check
} from 'lucide-react'

export default function LandingPage() {
  // 100% Pure Local Sandbox State - ZERO FIRESTORE WRITES
  const [sandboxTab, setSandboxTab] = useState('creator') // 'creator' | 'client'
  const [sandboxPaid, setSandboxPaid] = useState(false)
  const [sandboxAmount, setSandboxAmount] = useState('12,500')
  const [sandboxTitle, setSandboxTitle] = useState('Nike Commercial Master Cut (4K)')
  const [sandboxProcessing, setSandboxProcessing] = useState(false)

  const handleSimulatePayment = () => {
    setSandboxProcessing(true)
    setTimeout(() => {
      setSandboxPaid(true)
      setSandboxProcessing(false)
    }, 1200)
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased">
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900 uppercase">ReleaseDrop</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-blue-600 transition">How It Works</a>
            <a href="#sandbox" className="hover:text-blue-600 transition">Interactive Sandbox</a>
            <a href="#features" className="hover:text-blue-600 transition">Features</a>
            <a href="#faq" className="hover:text-blue-600 transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
            >
              Open Studio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-8 max-w-4xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Zero Client Ghosting • Instant Settlement</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.15]">
          Get paid before you hand over the <span className="text-blue-600">final files.</span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Upload final deliverables, set your price, and send a secured handoff link. Clients inspect watermarked previews with zero login, and raw master files unlock automatically when payment clears.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <span>Create Your First Drop</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#sandbox"
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 transition"
          >
            Try Live Sandbox
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Free to get started
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> No client login required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Instant UPI & Cards
          </span>
        </div>
      </section>

      {/* ISOLATED LIVE SANDBOX (ZERO DATABASE POLLUTION) */}
      <section id="sandbox" className="py-12 px-4 sm:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-mono">Interactive Playground</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Experience The Payment Handoff Flow</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Test both sides of the platform. This demo runs locally in your browser and does not affect live databases.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Tab Switcher */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
              <button
                onClick={() => setSandboxTab('creator')}
                className={`px-4 py-2 rounded-lg transition ${
                  sandboxTab === 'creator' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Creator Setup
              </button>
              <button
                onClick={() => setSandboxTab('client')}
                className={`px-4 py-2 rounded-lg transition ${
                  sandboxTab === 'client' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Client Pay & Unlock
              </button>
            </div>
          </div>

          {/* Sandbox: Creator View */}
          {sandboxTab === 'creator' && (
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Project Name</label>
                <input
                  type="text"
                  value={sandboxTitle}
                  onChange={(e) => setSandboxTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Settlement Price (₹ INR)</label>
                <input
                  type="text"
                  value={sandboxAmount}
                  onChange={(e) => setSandboxAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-1" />
                <span className="text-xs font-semibold text-slate-800 block">Nike_Commercial_Master_4K.zip</span>
                <span className="text-[10px] text-slate-400 font-mono">1.8 GB • Encrypted Sandbox Asset</span>
              </div>

              <button
                onClick={() => setSandboxTab('client')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <span>View Client Portal Preview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sandbox: Client View */}
          {sandboxTab === 'client' && (
            <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">CLIENT ESCROW PORTAL</span>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{sandboxTitle}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Amount Due</span>
                  <span className="text-base font-bold text-slate-900 font-mono">₹{sandboxAmount}</span>
                </div>
              </div>

              {/* Watermarked Inspection Sandbox */}
              <div className="relative aspect-video rounded-xl bg-black overflow-hidden flex items-center justify-center border border-slate-800">
                <div className="absolute inset-0 select-none pointer-events-none flex flex-col justify-around opacity-30 text-white font-mono text-[10px] font-black uppercase rotate-[-12deg]">
                  <div className="flex justify-around"><span>PREVIEW ONLY</span><span>UNPAID ASSET</span></div>
                  <div className="flex justify-around"><span>RELEASEDROP ESCROW</span><span>PROTECTED</span></div>
                </div>

                <div className="text-center p-3 z-10">
                  {sandboxPaid ? (
                    <div className="text-emerald-400 space-y-1">
                      <Unlock className="w-8 h-8 mx-auto" />
                      <span className="text-xs font-bold text-white block">Raw Master Decrypted</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Lock className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
                      <span className="text-xs font-bold text-white block">Watermarked Inspection Draft</span>
                      <p className="text-[10px] text-slate-400">Master files unlock post-settlement</p>
                    </div>
                  )}
                </div>
              </div>

              {!sandboxPaid ? (
                <button
                  onClick={handleSimulatePayment}
                  disabled={sandboxProcessing}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {sandboxProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Settlement...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Approve & Pay ₹{sandboxAmount} (Test Simulator)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <div className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Payment Authenticated
                  </div>
                  <button
                    onClick={() => setSandboxPaid(false)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                  >
                    Download Master Assets (.ZIP)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* How It Works Flow */}
      <section id="how-it-works" className="py-16 px-4 sm:px-8 max-w-5xl mx-auto border-t border-slate-200">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-mono">Process</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">One Link. Payment First. Files After.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Upload Deliverables', desc: 'Drop MP4s, multi-file ZIPs, PDFs, or design assets into encrypted cloud storage.' },
            { step: '02', title: 'Set Price & Expiry', desc: 'Specify INR amount and set link duration (7 days, 14 days, or unlimited).' },
            { step: '03', title: 'Share Clean Link', desc: 'Client inspects watermarked drafts directly in the browser with zero account login.' },
            { step: '04', title: 'Automated Release', desc: 'Instant UPI/Card verification triggers decryption and unlocks clean unwatermarked files.' }
          ].map((item, idx) => (
            <div key={idx} className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{item.step}</span>
              <h3 className="text-sm font-bold text-slate-900 mt-2">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 px-4 sm:px-8 max-w-5xl mx-auto border-t border-slate-200">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-mono">Capabilities</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Built to Eliminate Creative Payment Anxiety</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Drifting Anti-Screenshot Watermarks</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Subtle dynamic overlays prevent screen recording and screenshot theft while allowing clients to review sync and color grades.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Instant UPI Settlement</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Accept UPI, PhonePe, Google Pay, and Cards with immediate release of master files once clearance is detected.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Universal Multi-Format Support</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Inspect video, high-resolution imagery, and multi-page PDFs directly in the browser sandbox.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-4 sm:px-8 max-w-3xl mx-auto border-t border-slate-200">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-mono">FAQ</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Frequently Answered Questions</h2>
        </div>

        <div className="space-y-3 text-left">
          {[
            { q: "Does the client need an account to download?", a: "No. Clients access a zero-login inspection portal where they can preview drafts, communicate revisions, and pay to unlock the original files." },
            { q: "What formats can I safely deliver?", a: "Videos (MP4, MOV), Images (PNG, JPG), Documents (PDF), and bundled ZIP archives containing source packages or project files." },
            { q: "How are file links protected?", a: "Master unwatermarked files remain inaccessible until the payment status is authenticated. Once paid, the client receives direct decrypted download streams." },
            { q: "What if the client needs revisions before paying?", a: "The client portal includes an integrated revision request box so clients can submit notes directly to your dashboard before approving settlement." }
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
              <h3 className="text-xs font-bold text-slate-900">{item.q}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>© 2026 ReleaseDrop Platform. Built for creative professionals.</p>
      </footer>

    </div>
  )
}
