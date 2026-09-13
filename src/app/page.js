'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Zap, Shield, Lock, ArrowRight, CheckCircle2, Play, 
  Sparkles, Eye, Download, ChevronRight, ShieldCheck, 
  Layers, RefreshCw, FileText, Globe, Star, Users
} from 'lucide-react'

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('locked') // 'locked' | 'unlocked'
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans selection:bg-blue-600 selection:text-white antialiased overflow-x-hidden">
      
      {/* 1. Subtle Radial Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.18),transparent_70%)] pointer-events-none -z-10" />

      {/* 2. Top Navigation */}
      <header className="border-b border-slate-800/80 sticky top-0 bg-[#060913]/90 backdrop-blur-md z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white uppercase">ReleaseDrop</span>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition"
            >
              Sign In
            </Link>
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition flex items-center gap-1.5"
            >
              Launch Vault <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 3. Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-6 animate-pulse">
          <Shield className="w-3.5 h-3.5" />
          <span>Automated Client Escrow & Anti-Theft Delivery</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
          Never release master files <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            without guaranteed payment.
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          The payment-locked media vault for creators, video editors, and agencies. 
          Clients preview with dynamic watermarks and instantly unlock high-res raw assets upon verified settlement.
        </p>

        {/* CTA Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link 
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-xl shadow-blue-600/30 active:scale-95 transition flex items-center justify-center gap-2"
          >
            Create Protected Drop <ChevronRight className="w-4 h-4" />
          </Link>
          <a 
            href="#demo"
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-slate-300" /> Interactive Demo
          </a>
        </div>

        {/* Live Trust Metrics */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-slate-800/80 pt-8 text-left">
          <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
            <div className="text-xl font-black text-white font-mono">₹0</div>
            <div className="text-[11px] text-slate-400">Unpaid asset leak risk</div>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
            <div className="text-xl font-black text-emerald-400 font-mono">100%</div>
            <div className="text-[11px] text-slate-400">Client verification</div>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
            <div className="text-xl font-black text-blue-400 font-mono">&lt; 3s</div>
            <div className="text-[11px] text-slate-400">Instant decrypt speed</div>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
            <div className="text-xl font-black text-indigo-400 font-mono">AES-256</div>
            <div className="text-[11px] text-slate-400">Escrow vault encryption</div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Live Simulator */}
      <section id="demo" className="py-12 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-white">Experience Client Inspection</h2>
          <p className="text-xs text-slate-400 mt-1">Toggle between unpaid inspection preview and unlocked master release.</p>
        </div>

        {/* Toggle Switch */}
        <div className="flex justify-center mb-6">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 inline-flex gap-1">
            <button 
              onClick={() => setActiveTab('locked')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'locked' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Client View (Locked)
            </button>
            <button 
              onClick={() => setActiveTab('unlocked')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'unlocked' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Post-Payment (Unlocked)
            </button>
          </div>
        </div>

        {/* Interactive Vault Frame */}
        <div className="rounded-2xl border border-slate-800 bg-[#0A101D] shadow-2xl p-4 sm:p-6 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="font-mono text-slate-400 text-[11px] ml-2">releasedrop.vercel.app/d/demo-reel-4k</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              activeTab === 'locked' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {activeTab === 'locked' ? 'Awaiting Settlement' : 'Settlement Cleared'}
            </span>
          </div>

          {/* Viewport Simulation */}
          <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center overflow-hidden">
            {activeTab === 'locked' ? (
              <div className="text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="text-xs font-mono text-amber-400 font-bold tracking-widest uppercase">
                  UNPAID PREVIEW • CONFIDENTIAL
                </div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  High-resolution production files are encrypted. Full master uncompressed assets decrypt automatically upon verified invoice clearance.
                </p>
                <div className="pt-2">
                  <span className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl inline-block shadow-md">
                    Pay ₹4,999 to Unlock Master
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-xs font-mono text-emerald-400 font-bold tracking-widest uppercase">
                  MASTER ASSET AUTHORIZED & DECRYPTED
                </div>
                <p className="text-[11px] text-slate-300 max-w-sm mx-auto">
                  Full production master unlocked in ProRes 422 HQ (4K DCI). License transferred directly to client.
                </p>
                <div className="pt-2">
                  <button className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20">
                    <Download className="w-3.5 h-3.5" /> Download 4K Master Asset (1.4 GB)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. 3-Step Clean Architectural Workflow */}
      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-black text-white">Effortless 3-Minute Escrow</h2>
          <p className="text-xs text-slate-400 mt-1">No complicated client onboarding. Send direct payment links that work anywhere.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-mono font-bold text-sm">
              01
            </div>
            <h3 className="text-sm font-bold text-white">Upload Deliverables</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drop videos, designs, or ZIP packages. Assets are stored in isolated encrypted buckets with automatic previews.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-mono font-bold text-sm">
              02
            </div>
            <h3 className="text-sm font-bold text-white">Dispatch Notification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              ReleaseDrop automatically sends an official invoice and watermarked preview link directly to your client's email inbox.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-mono font-bold text-sm">
              03
            </div>
            <h3 className="text-sm font-bold text-white">Instant Unlock & Payout</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Once verified payment clears, master files decrypt instantly for client download, and funds route straight to your bank account.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Production Ready Conversion Footer */}
      <footer className="border-t border-slate-800/80 py-12 px-4 text-center bg-[#04060C]">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Zap className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="font-extrabold text-sm text-white uppercase">ReleaseDrop</span>
          </div>
          <p className="text-xs text-slate-500">
            Protected media distribution for high-tier creators, filmmakers, and digital agencies.
          </p>
          <div className="pt-2">
            <Link 
              href="/dashboard"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 inline-block transition"
            >
              Start Free Creator Studio
            </Link>
          </div>
          <div className="text-[10px] text-slate-600 font-mono pt-4">
            © 2026 ReleaseDrop Platform Inc. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
