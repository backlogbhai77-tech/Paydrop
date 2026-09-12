import Link from 'next/link'
import { ArrowRight, ShieldCheck, Lock, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 antialiased font-sans flex flex-col selection:bg-emerald-500 selection:text-black">
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-sm">
            R
          </div>
          <span className="font-bold text-lg tracking-tight">ReleaseDrop</span>
        </div>

        <Link
          href="/dashboard"
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-emerald-500/10"
        >
          Open Workspace
        </Link>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 text-center flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5" /> Zero Ghosting • Instant Settlement
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-2xl leading-tight">
          Get paid before your client gets the files.
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base mt-4 max-w-lg">
          Lock high-res deliverables behind an automated payment portal. Send watermarked inspection links and decrypt assets instantly upon settlement.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            Launch Free Portal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left w-full">
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <Lock className="w-5 h-5 text-emerald-400 mb-2" />
            <div className="text-sm font-bold text-white">Smart Asset Lock</div>
            <div className="text-xs text-zinc-400 mt-1">Files remain securely held until verified payment completion.</div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
            <div className="text-sm font-bold text-white">Dynamic Watermarking</div>
            <div className="text-xs text-zinc-400 mt-1">Client can preview draft quality with anti-piracy inspection layers.</div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <Zap className="w-5 h-5 text-emerald-400 mb-2" />
            <div className="text-sm font-bold text-white">Direct Settlement</div>
            <div className="text-xs text-zinc-400 mt-1">Instant delivery release straight to high-speed ZIP downloads.</div>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-zinc-900 text-center text-xs text-zinc-600">
        ReleaseDrop MVP Platform
      </footer>
    </div>
  )
              }
              
