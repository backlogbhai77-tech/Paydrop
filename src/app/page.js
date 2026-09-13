'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Zap, Shield, Lock, ArrowRight, CheckCircle2, 
  Play, Eye, Download, Check, Sparkles, Star
} from 'lucide-react'

export default function LandingPage() {
  const [demoUnlocked, setDemoUnlocked] = useState(false)

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 h-16 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-zinc-900">ReleaseDrop</span>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-3 py-2 transition"
          >
            Sign In
          </Link>
          <Link 
            href="/dashboard" 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition"
          >
            Start Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          Payment-locked file delivery
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-zinc-950 leading-[1.1]">
          Stop sending final files <br className="hidden sm:inline" />
          <span className="text-blue-600">before you're paid.</span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-600 max-w-xl mx-auto leading-relaxed">
          ReleaseDrop lets freelancers and creative studios send professional previews and automatically unlock master files only after payment is verified.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <span>Start Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a 
            href="#demo" 
            className="w-full sm:w-auto px-6 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs rounded-xl transition flex items-center justify-center"
          >
            See How It Works
          </a>
        </div>

        <p className="text-[11px] text-zinc-600 font-mono">
          No card required • Free plan includes 3 protected deliveries a month
        </p>
      </section>

      {/* Interactive Demo Showcase */}
      <section id="demo" className="max-w-md mx-auto px-4 pb-20">
        <div className="bg-[#090D16] text-white rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-5">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <span className="font-bold text-xs text-white">ReleaseDrop</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
              <Lock className="w-3 h-3 text-blue-400" />
              <span>PROTECTED DELIVERY</span>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">PROJECT</span>
              <h3 className="text-base font-bold text-white mt-0.5">Brand Campaign — Final Delivery</h3>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="h-8 w-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                AC
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Alex Creative Studio</div>
                <div className="text-[10px] text-slate-400">Sent via ReleaseDrop • Secure delivery</div>
              </div>
            </div>

            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/40 text-xs italic text-slate-300">
              "Thanks! Your final campaign files are ready."
            </div>
          </div>

          {/* Inspection Viewport Container */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
              <span>PREVIEW • WATERMARKED</span>
              <span className="text-blue-400 font-sans cursor-pointer hover:underline">
                {demoUnlocked ? 'Master Stream' : 'Low-res Preview'}
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-video bg-black border border-slate-800 flex items-center justify-center group">
              <img 
                src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80" 
                alt="Demo deliverable" 
                className={`w-full h-full object-cover ${demoUnlocked ? '' : 'brightness-75'}`}
              />

              {!demoUnlocked ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-white/40 font-mono font-black text-xs tracking-widest uppercase rotate-[-20deg] border border-white/20 px-3 py-1 rounded">
                      UNPAID PREVIEW • CONFIDENTIAL
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Watermarked Preview</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-xs flex items-center justify-center">
                  <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> MASTER UNLOCKED
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-1">
            {!demoUnlocked ? (
              <button 
                onClick={() => setDemoUnlocked(true)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Authorize ₹5,000 & Unlock Master</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="space-y-2">
                <button 
                  onClick={() => alert("Demo Master File downloaded successfully!")}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Clean Master (1.4 GB)
                </button>
                <button 
                  onClick={() => setDemoUnlocked(false)}
                  className="w-full text-center text-[10px] text-slate-500 hover:text-slate-400 pt-1"
                >
                  Reset Preview Demo
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Tiers Section */}
      <section className="bg-zinc-50 border-t border-zinc-200 py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-12 text-center">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold tracking-widest text-blue-600 uppercase">PRICING</span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-950">Start free. Upgrade when you're busy.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left max-w-2xl mx-auto">
            {/* Free Tier */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-950">Free</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Try the full payment-locked flow.</p>
                </div>
                <div className="text-4xl font-black text-zinc-950">
                  ₹0<span className="text-xs font-normal text-zinc-500">/month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-zinc-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" /> 3 active deliveries/month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Basic ReleaseDrop branding
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" /> 7-day expiration
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Basic telemetry & views
                  </li>
                </ul>
              </div>

              <Link 
                href="/dashboard"
                className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs rounded-xl text-center block transition"
              >
                Start Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="bg-[#090D16] text-white p-6 sm:p-8 rounded-3xl border border-blue-600/50 shadow-xl space-y-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-mono px-2.5 py-0.5 rounded-full font-bold">
                MOST POPULAR
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Pro Studio</h3>
                  <p className="text-xs text-slate-400 mt-0.5">For active creators & agencies.</p>
                </div>
                <div className="text-4xl font-black text-white">
                  ₹999<span className="text-xs font-normal text-slate-400">/month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" /> Unlimited deliveries
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" /> Custom branding & domain
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" /> Dynamic moving forensic watermark
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" /> Direct UPI & Escrow payouts
                  </li>
                </ul>
              </div>

              <Link 
                href="/dashboard"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl text-center block transition shadow-lg shadow-blue-500/25"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-200 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} ReleaseDrop. All rights reserved. Secure escrow delivery for creators.
      </footer>
    </div>
  )
}
