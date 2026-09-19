'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Zap, Lock, Unlock, ShieldCheck, ArrowRight, 
  CheckCircle2, UploadCloud, Eye, Download, 
  FileCheck2, ChevronRight, HelpCircle, Layers,
  CreditCard, Sparkles, Smartphone, Shield
} from 'lucide-react'

export default function LandingPage() {
  const [demoActiveTab, setDemoActiveTab] = useState('creator') // 'creator' | 'client'
  const [demoPaid, setDemoPaid] = useState(false)
  const [demoAmount, setDemoAmount] = useState('8,500')
  const [demoTitle, setDemoTitle] = useState('Brand Campaign — 4K Final Cut')

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased">
      
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-black text-lg tracking-tight text-slate-900 uppercase">ReleaseDrop</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-blue-600 transition">How It Works</a>
            <a href="#demo" className="hover:text-blue-600 transition">Interactive Demo</a>
            <a href="#features" className="hover:text-blue-600 transition">Features</a>
            <a href="#faq" className="hover:text-blue-600 transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-95"
            >
              Open Studio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-8 max-w-5xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Zero Client Ghosting • Instant Settlement</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.15]">
          Get paid before you hand over the <span className="text-blue-600">final files.</span>
        </h1>

        <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Upload final deliverables, set your price, and send a secured link. Clients inspect watermarked previews, and master files unlock automatically the instant payment settles.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <span>Create Your First Drop</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#demo"
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition shadow-sm"
          >
            Try Live Sandbox
          </a>
        </div>

        <div className="mt-6 flex items-center justify-center gap-5 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Free to get started
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> No client sign-up needed
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Instant UPI & Cards
          </span>
        </div>
      </section>

      {/* Interactive Live Sandbox Demo Section */}
      <section id="demo" className="py-12 px-4 sm:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Interactive Sandbox</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">See How ReleaseDrop Operates</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Switch between Creator setup and Client payout views.</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl">
          {/* Tab Switcher */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
              <button
                onClick={() => setDemoActiveTab('creator')}
                className={`px-4 py-2 rounded-lg transition ${
                  demoActiveTab === 'creator' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Creator: Lock Assets
              </button>
              <button
                onClick={() => setDemoActiveTab('client')}
                className={`px-4 py-2 rounded-lg transition ${
                  demoActiveTab === 'client' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Client: Review & Pay
              </button>
            </div>
          </div>

          {/* Sandbox: Creator View */}
          {demoActiveTab === 'creator' && (
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Deliverable Title</label>
                <input
                  type="text"
                  value={demoTitle}
                  onChange={(e) => setDemoTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Settlement Amount (INR ₹)</label>
                <input
                  type="text"
                  value={demoAmount}
                  onChange={(e) => setDemoAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/60 text-center">
                <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-800 block">Commercial_Master_4K.zip</span>
                <span className="text-[10px] text-slate-400">1.4 GB • Held in Escrow Storage</span>
              </div>

              <button
                onClick={() => setDemoActiveTab('client')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <span>Generate Client PayLink</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sandbox: Client View */}
          {demoActiveTab === 'client' && (
            <div className="max-w-md mx-auto bg-slate-50 border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase font-mono">CLIENT PORTAL</span>
                  <h3 className="text-base font-black text-slate-900 truncate max-w-[220px]">{demoTitle}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Due</span>
                  <span className="text-base font-black text-slate-900 font-mono">₹{demoAmount}</span>
                </div>
              </div>

              {/* Watermarked Frame */}
              <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800">
                <div className="absolute inset-0 select-none pointer-events-none flex flex-col justify-around opacity-30 text-white font-mono text-[10px] font-black uppercase rotate-[-12deg]">
                  <div className="flex justify-around"><span>PREVIEW ONLY</span><span>UNPAID ASSET</span></div>
                  <div className="flex justify-around"><span>RELEASEDROP ESCROW</span><span>PROTECTED</span></div>
                </div>

                <div className="text-center p-3 z-10">
                  {demoPaid ? (
                    <div className="text-emerald-400">
                      <Unlock className="w-8 h-8 mx-auto mb-1" />
                      <span className="text-xs font-bold text-white">Full 4K Decrypted</span>
                    </div>
                  ) : (
                    <div>
                      <Lock className="w-8 h-8 text-amber-400 mx-auto mb-1 animate-pulse" />
                      <span className="text-xs font-bold text-white">Watermarked Draft</span>
                      <p className="text-[10px] text-slate-400">Unlocks post-settlement</p>
                    </div>
                  )}
                </div>
              </div>

              {!demoPaid ? (
                <button
                  onClick={() => setDemoPaid(true)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Approve & Pay ₹{demoAmount} (Simulate)</span>
                </button>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <div className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Payment Verified
                  </div>
                  <button
                    onClick={() => setDemoPaid(false)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-sm"
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
      <section id="how-it-works" className="py-16 px-4 sm:px-8 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Simple 4-Step Process</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">One Link. Payment First. Files After.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Upload Deliverables', desc: 'Drop final MP4s, ZIP bundles, PSDs, or Figma exports into encrypted storage.' },
            { step: '02', title: 'Set Your Price', desc: 'Enter settlement fee in INR. Choose expiration and custom watermark protection.' },
            { step: '03', title: 'Share Direct Link', desc: 'Send one secure portal link. Client reviews full watermarked preview with zero login.' },
            { step: '04', title: 'Automated Release', desc: 'Instant UPI/Card verification triggers file decryption and unlocks high-res download.' }
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
              <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{item.step}</span>
              <h3 className="text-base font-bold text-slate-900 mt-2">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-16 px-4 sm:px-8 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Built For Creatives</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Everything Freelancers Need to Get Paid</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Anti-Scrape Watermarking</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Subtle diagonal and email overlays discourage screen recording while allowing clients to confirm edit quality and audio sync.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Instant UPI Settlement</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Clients pay via Google Pay, PhonePe, Paytm or Card. Real-time verification decrypts master files in under 2 seconds.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Multi-File Packages</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Deliver complete project packages: video cut, source ZIP, project files, and exported assets grouped in one handoff page.
            </p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="py-16 px-4 sm:px-8 max-w-3xl mx-auto border-t border-slate-200/80">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Got Questions?</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4 text-left">
          {[
            { q: "Does the client need an account to pay and download?", a: "No. The client gets a clean, zero-login link where they can preview the watermarked assets, approve the deliverable, pay, and download immediately." },
            { q: "What formats can I deliver?", a: "Any digital asset: MP4, MOV, PNG, JPG, PDF, ZIP, Figma exports, PSDs, code repositories, or audio packages." },
            { q: "How long do delivery links remain active?", a: "You configure expiration during upload: 7 days, 14 days, 30 days, or Never." },
            { q: "What if the client asks for revisions?", a: "The client portal includes a direct feedback box so the client can request adjustments or revisions before approving and releasing final payment." }
          ].map((item, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">{item.q}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Call To Action */}
      <section className="py-20 px-4 sm:px-8 max-w-4xl mx-auto text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white shadow-2xl relative overflow-hidden">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Stop sending final work without getting paid.</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-3 max-w-md mx-auto leading-relaxed">
            Create your protected vault link in under 60 seconds and deliver your creative projects with 100% confidence.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 mt-7 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95"
          >
            <span>Launch Free Studio</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="py-8 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>© 2026 ReleaseDrop Platform. Built for independent creators and creative agencies.</p>
      </footer>

    </div>
  )
}
