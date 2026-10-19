
'use client'

import React, { useState } from 'react'
import { auth, googleProvider } from '../../lib/firebase'
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const router = useRouter()

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      router.push('/dashboard')
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
      router.push('/dashboard')
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 antialiased">
      
      {/* BRAND HEADER */}
      <div className="mb-8 text-center space-y-2">
        <Link href="/" className="inline-block">
          <div className="w-12 h-12 rounded-2xl bg-[#0F172A] text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md">
            P
          </div>
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">paydrop</h1>
        <p className="text-xs font-medium text-slate-500 max-w-xs">Industry-standard escrow delivery & instant client payments</p>
      </div>

      {/* CLEAN AUTH CARD */}
      <div className="w-full max-w-sm bg-white border border-slate-200/80 p-6 sm:p-8 rounded-[32px] shadow-xl space-y-6">
        
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-slate-900">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="text-xs text-slate-500">
            {isSignup ? 'Start securing your creative deliverables' : 'Enter your credentials to access dashboard'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-2xl text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] text-slate-400 font-mono uppercase">or email</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Work Email</label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-slate-900 transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-slate-900 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
          >
            <span>{loading ? 'Processing...' : isSignup ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>

      <div className="mt-8 flex items-center gap-2 text-slate-400 text-xs font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>End-to-end encrypted escrow system</span>
      </div>

    </div>
  )
}
