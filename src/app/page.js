'use client'

import React, { useState } from 'react'
import { Lock, Unlock, UploadCloud, ShieldCheck, FileCheck, Copy, ArrowRight } from 'lucide-react'

export default function PayDropApp() {
  const [file, setFile] = useState(null)
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [lockedLink, setLockedLink] = useState('')
  const [activeTab, setActiveTab] = useState('creator') // 'creator' ya 'client'
  const [isPaid, setIsPaid] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = (e) => {
    e.preventDefault()
    if (!file || !amount) return
    const fakeId = Math.random().toString(36).substring(2, 9)
    setLockedLink(`https://paydrop.app/pay/${fakeId}`)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(lockedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col items-center p-6 sm:p-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />

      {/* Header */}
      <header className="w-full max-w-3xl flex justify-between items-center mb-10 z-10 border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black">
            P
          </div>
          <span className="text-xl font-bold tracking-tight">PayDrop</span>
        </div>

        {/* View Switcher for Testing */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('creator')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'creator' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            Creator View
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'client' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            Client Pay View
          </button>
        </div>
      </header>

      {/* Creator Screen */}
      {activeTab === 'creator' && (
        <section className="w-full max-w-lg bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-2xl z-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Lock & Deliver Assets</h1>
            <p className="text-sm text-zinc-400 mt-1">Clients can preview watermarked assets, but download unlocks only after payment.</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Project Title</label>
              <input
                type="text"
                placeholder="e.g. YouTube Video Edit - Final Cut"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Price (INR ₹)</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select Deliverable File</label>
              <label className="mt-1.5 border border-dashed border-zinc-700 hover:border-emerald-500/80 bg-zinc-950/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition">
                <UploadCloud className="w-8 h-8 text-zinc-500 mb-2" />
                <span className="text-sm font-medium text-zinc-300">
                  {file ? file.name : "Click to select MP4, ZIP, or PNG"}
                </span>
                <span className="text-xs text-zinc-500 mt-1">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "Files stay encrypted"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl py-3 mt-2 text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <Lock className="w-4 h-4" /> Create Locked PayLink
            </button>
          </form>

          {lockedLink && (
            <div className="mt-6 p-4 rounded-xl bg-zinc-950 border border-emerald-500/30">
              <span className="text-xs text-emerald-400 font-medium">Link Ready to Share:</span>
              <div className="flex items-center gap-2 mt-2">
                <input
                  readOnly
                  value={lockedLink}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && <span className="text-[11px] text-zinc-400 mt-1 block">Copied to clipboard!</span>}
            </div>
          )}
        </section>
      )}

      {/* Client Pay & Download Screen */}
      {activeTab === 'client' && (
        <section className="w-full max-w-lg bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-2xl z-10">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Deliverable Locked</span>
              <h2 className="text-lg font-bold mt-0.5">{title || "Final Commercial Edit v2.mp4"}</h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-400 block">Total Due</span>
              <span className="text-lg font-black text-emerald-400">₹{amount || "4,999"}</span>
            </div>
          </div>

          {/* Watermark Protected Preview Box */}
          <div className="relative my-6 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-video flex items-center justify-center">
            {/* Moving dynamic watermark layer */}
            <div className="absolute inset-0 select-none pointer-events-none flex flex-wrap items-center justify-around opacity-20 text-zinc-300 font-mono text-xs rotate-[-15deg] gap-8">
              <span>CONFIDENTIAL - UNPAID DRAFT</span>
              <span>PROTECTED BY PAYDROP</span>
              <span>PAY TO REMOVE WATERMARK</span>
              <span>CONFIDENTIAL - UNPAID DRAFT</span>
            </div>

            <div className="z-10 text-center p-4">
              <Lock className="w-10 h-10 text-emerald-400/80 mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-medium text-zinc-300">Protected Preview Mode</p>
              <p className="text-xs text-zinc-500 mt-1">High-bitrate file unlocked after settlement verification</p>
            </div>
          </div>

          {/* Action Button */}
          {!isPaid ? (
            <div className="space-y-3">
              <button
                onClick={() => setIsPaid(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-lg shadow-emerald-500/10"
              >
                Pay ₹{amount || "4,999"} & Unlock High-Res File
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>End-to-end verified release • Instant unlock</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <div className="inline-flex p-2 rounded-full bg-emerald-500/20 text-emerald-400 mb-1">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-emerald-300">Payment Captured Successfully!</h3>
              <p className="text-xs text-zinc-400">Master production files are now decrypted and ready.</p>
              <button
                onClick={() => alert("File downloading started...")}
                className="w-full bg-zinc-100 hover:bg-white text-black font-bold rounded-lg py-2.5 text-xs transition"
              >
                Download Original High-Res (ZIP)
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  )
        }
