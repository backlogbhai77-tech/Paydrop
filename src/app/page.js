'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Zap, Shield, Lock, ArrowRight, CheckCircle2, Play, 
  Sparkles, Eye, Download, ChevronRight, ShieldCheck, 
  Layers, RefreshCw, FileText, Globe, Check, Laptop,
  ArrowUpRight, FileCheck2, Cpu, CreditCard, LockKeyhole
} from 'lucide-react'

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('locked') // 'locked' | 'unlocked'
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased overflow-x-hidden w-full relative">
      
      {/* 1. Subtle Precision Ambient Mesh (Controlled Width to Prevent Side-Sliding) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.06),transparent_70%)] pointer-events-none -z-10" />

      {/* 2. Precision Top Navigation */}
      <header className={`sticky top-0 z-40 transition-all duration-200 border-b ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-md border-slate-200/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]' 
          : 'bg-white/70 backdrop-blur-sm border-slate-100'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 group-hover:scale-[1.02] transition-transform">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900">
              ReleaseDrop
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition">How It Works</a>
            <a href="#simulator" className="hover:text-slate-900 transition">Live Vault Demo</a>
            <a href="#security" className="hover:text-slate-900 transition">Escrow Security</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 transition"
            >
              Sign In
            </Link>
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-1.5"
            >
              Launch Studio <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </header>

      {/* 3. Hero Section (Controlled Zero Horizontal Bleed) */}
      <section className="pt-16 sm:pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center relative">
        
        {/* Subtle Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 text-[11px] font-semibold mb-6 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          <span>ReleaseDrop 2.0 Escrow Core</span>
          <span className="text-slate-300">|</span>
          <span className="text-blue-600 font-bold">Zero Client Exploitation</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
          Stop sending master deliverables <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
            before payment clears.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="mt-5 text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed font-normal">
          The payment-locked escrow delivery engine for professional creators, video editors, and production studios. 
          Provide client preview inspection with dynamic anti-theft watermarks—assets decrypt instantly upon verified settlement.
        </p>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link 
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Create Your First Drop <ArrowRight className="w-4 h-4" />
          </Link>
          <a 
            href="#simulator"
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
          >
            <Laptop className="w-3.5 h-3.5 text-slate-500" /> Test Client Viewport
          </a>
        </div>

        {/* Trust Validation Grid */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-lg font-black text-slate-900 font-mono">₹0 Leakage</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Payment-locked files</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-lg font-black text-slate-900 font-mono">Direct SMTP</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Automated client inbox alert</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-lg font-black text-slate-900 font-mono">&lt; 1 Second</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Instant decryption speed</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-lg font-black text-slate-900 font-mono">100% Free</div>
            <div className="text-[11px] text-slate-500 mt-0.5">No subscription fees</div>
          </div>
        </div>
      </section>

      {/* 4. Live Interactive Escrow Simulator */}
      <section id="simulator" className="py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-[11px] font-mono font-bold text-blue-600 uppercase tracking-widest block mb-1">Interactive Sandbox</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Experience Both Sides of the Escrow</h2>
          <p className="text-xs text-slate-500 mt-1">See how clients inspect your work with watermarks, and how uncompressed files unlock post-settlement.</p>
        </div>

        {/* State Toggle Selector */}
        <div className="flex justify-center mb-6">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 inline-flex gap-1">
            <button 
              onClick={() => setActiveTab('locked')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'locked' 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LockKeyhole className="w-3.5 h-3.5 text-amber-500" />
              <span>Client Inspection (Pre-Payment)</span>
            </button>
            <button 
              onClick={() => setActiveTab('unlocked')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'unlocked' 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Asset Decrypted (Post-Payment)</span>
            </button>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 overflow-hidden transition-all">
          
          {/* Browser Topbar */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="font-mono text-slate-500 text-[11px] ml-2 hidden sm:inline">
                releasedrop.vercel.app/d/commercial-master-4k
              </span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              activeTab === 'locked' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {activeTab === 'locked' ? 'Awaiting Payment' : 'Settlement Cleared'}
            </span>
          </div>

          {/* Viewport Content */}
          <div className="p-6 sm:p-10 bg-slate-50/50">
            {activeTab === 'locked' ? (
              <div className="max-w-md mx-auto text-center space-y-4 py-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 mx-auto flex items-center justify-center shadow-inner">
                  <Lock className="w-7 h-7" />
                </div>
                
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-600 font-bold">Inspection Watermark Active</div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">Nike Summer Campaign — Master Edit</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Full uncompressed ProRes production master is encrypted in the vault. Authorize payment to unlock raw source assets.
                  </p>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-left shadow-sm">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Due Settlement</span>
                    <span className="text-lg font-black text-slate-900 font-mono">₹12,500</span>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm">
                    Pay & Decrypt Master →
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto text-center space-y-4 py-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                  <FileCheck2 className="w-7 h-7" />
                </div>
                
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 font-bold">Escrow Verified • Rights Transferred</div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">Nike Summer Campaign — 4K ProRes 422 HQ</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Settlement verified by ReleaseDrop Escrow. Watermarks stripped; raw master asset ready for production release.
                  </p>
                </div>

                <div className="p-4 bg-white border border-emerald-200 rounded-xl flex items-center justify-between text-left shadow-sm">
                  <div>
                    <span className="text-[10px] text-emerald-600 font-mono block uppercase font-bold">Master Ready</span>
                    <span className="text-xs font-mono text-slate-500">nike_master_v3_final.zip (1.8 GB)</span>
                  </div>
                  <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Precision 3-Step Escrow Architecture */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-100">
        <div className="text-center mb-14">
          <span className="text-[11px] font-mono font-bold text-blue-600 uppercase tracking-widest block mb-1">Architecture</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">How Escrow Delivery Works</h2>
          <p className="text-xs text-slate-500 mt-1">Simple, airtight transaction loop designed for professional agency workflows.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-mono font-bold text-sm">
              01
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload & Vault Lock</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Drop your raw deliverables (videos, designs, ZIP files). Assets are securely vaulted with anti-theft preview watermarks.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono font-bold text-sm">
              02
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Automated Client Delivery</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                ReleaseDrop automatically dispatches an official branded email to your client with invoice terms and an interactive inspection portal.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-mono font-bold text-sm">
              03
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Instant Release & Payout</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                As soon as the client authorizes payment, uncompressed master assets decrypt immediately and funds route directly to your balance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Security Standards Section */}
      <section id="security" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-100">
        <div className="bg-slate-50/70 border border-slate-200/90 rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-blue-600 mx-auto flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Built to Eliminate Creative Insecurity</h2>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Never again worry about sending work over Google Drive or WeTransfer only to wait weeks for payment. ReleaseDrop puts control back in creators' hands.
          </p>
          <div className="pt-2">
            <Link 
              href="/dashboard"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 inline-flex items-center gap-2 active:scale-95 transition"
            >
              Get Started for Free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Clean Minimalist Studio Footer */}
      <footer className="border-t border-slate-200/80 py-10 px-4 sm:px-6 bg-white text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Zap className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="font-bold text-slate-900">ReleaseDrop Studio</span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-[11px]">Protected Delivery Engine</span>
          </div>

          <div className="font-mono text-[11px] text-slate-400">
            © 2026 ReleaseDrop Escrow. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
