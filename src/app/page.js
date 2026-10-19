'use client'

import React from 'react'
import Link from 'next/link'
import { 
  ShieldCheck, Lock, ArrowRight, CheckCircle2, 
  Sparkles, Wallet, Zap, FileText, Share2 
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
      
      {/* NAVIGATION BAR */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#0F172A] text-white font-black text-xl flex items-center justify-center shadow-md">
            P
          </div>
          <span className="font-black text-2xl tracking-tight text-slate-900">paydrop</span>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-xs font-bold text-slate-700 hover:text-slate-900 px-4 py-2.5 rounded-xl transition"
          >
            Sign In
          </Link>
          <Link 
            href="/login" 
            className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-md transition active:scale-95 flex items-center gap-2"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-full text-emerald-800 text-xs font-semibold animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Next-Gen Creator Escrow Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Get Paid Before Releasing Your Master Files
        </h1>

        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto font-normal leading-relaxed">
          PayDrop locks your source code, design assets, and videos in secure smart escrow. Clients preview watermarked drafts and unlock full deliverables upon instant payment.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-8 py-4 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </Link>

          <a 
            href="#how-it-works" 
            className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-2xl transition shadow-xs flex items-center justify-center"
          >
            See How It Works
          </a>
        </div>

        {/* TRUST BADGES */}
        <div className="pt-10 flex flex-wrap items-center justify-center gap-6 text-slate-500 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% Protected Escrow
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Automatic Watermarking
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Direct UPI & Bank Payouts
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400">Simple Workflow</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">How PayDrop Protects Your Work</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-pro p-8 rounded-[32px] space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">1. Upload Deliverables</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your ZIPs, videos, code, or design layers. PayDrop automatically applies preview protection.
            </p>
          </div>

          <div className="glass-pro p-8 rounded-[32px] space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
              <Share2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">2. Share Escrow Link</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Send a secure PayDrop portal link to your client. They can review previews and leave revision notes.
            </p>
          </div>

          <div className="glass-pro p-8 rounded-[32px] space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
              <Lock className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">3. Instant Payment Release</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upon payment completion, the vault unlocks for the client, and funds transfer directly to your bank account.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-slate-200 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} PayDrop Inc. All rights reserved. Secure Creator Escrow Infrastructure.</p>
      </footer>

    </div>
  )
}
