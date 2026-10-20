'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../../lib/firebase'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  LockKeyhole,
  Sparkles,
  Check,
  LoaderCircle,
  Mail,
  Fingerprint,
  Layers3,
  CircleAlert,
} from 'lucide-react'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.04 13.22l7.98 6.19C11.93 13.72 17.48 9.5 24 9.5z" transform="translate(0 5)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.65 5.94c4.47-4.13 7.12-10.2 7.12-17.59z" transform="translate(0 0)" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.14 15.9-5.81l-7.65-5.94c-2.13 1.43-4.86 2.28-8.25 2.28-6.33 0-11.7-4.27-13.62-10.02l-7.98 6.19C6.85 42.6 14.83 48 24 48z" />
      <path fill="#FBBC05" d="M10.38 28.51A14.4 14.4 0 0 1 9.6 24c0-1.57.27-3.09.76-4.51l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.58 10.7l7.8-6.19z" transform="translate(0 0)" />
    </svg>
  )
}

function Brand({ light = false }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-xl font-black text-emerald-950 shadow-lg shadow-lime-300/20">
        P
      </span>
      <span className={`text-2xl font-black tracking-tight ${light ? 'text-white' : 'text-slate-950'}`}>
        paydrop<span className="text-lime-500">.</span>
      </span>
    </Link>
  )
}

function getFriendlyError(error) {
  const messages = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email. Try signing up.',
    'auth/wrong-password': 'Incorrect email or password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password. Please check your details.',
    'auth/email-already-in-use': 'An account already exists with this email. Try signing in.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled. You can try again.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Allow popups and try again.',
    'auth/cancelled-popup-request': 'A sign-in request is already in progress.',
    'auth/network-request-failed': 'Network error. Check your internet connection and retry.',
    'auth/too-many-requests': 'Too many attempts. Please wait a little and try again.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase yet.',
    'auth/account-exists-with-different-credential': 'This email is registered using another sign-in method.',
  }

  return messages[error?.code] || 'Something went wrong. Please try again.'
}

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const normalizedEmail = email.trim()

      if (isSignup) {
        if (password.length < 6) {
          setError('Password must contain at least 6 characters.')
          return
        }

        const credential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        )

        if (name.trim()) {
          await updateProfile(credential.user, {
            displayName: name.trim(),
          })
        }
      } else {
        await signInWithEmailAndPassword(auth, normalizedEmail, password)
      }

      router.replace('/dashboard')
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      await signInWithPopup(auth, googleProvider)
      router.replace('/dashboard')
    } catch (err) {
      setError(getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsSignup((current) => !current)
    setError('')
    setShowPassword(false)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F3F7F0] font-sans text-slate-900 selection:bg-lime-200">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-lime-200/40 blur-[100px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-emerald-200/40 blur-[120px]" />
      </div>

      {/* Top navigation */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Brand />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-xl transition hover:bg-white hover:text-emerald-950"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Back to home</span>
          <span className="sm:hidden">Home</span>
        </Link>
      </header>

      {/* Main authentication layout */}
      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-10 pt-5 sm:px-8 lg:min-h-[calc(100vh-100px)] lg:grid-cols-[1fr_0.85fr] lg:gap-16 lg:px-12 lg:pb-16 lg:pt-8">

        {/* Left brand panel */}
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 px-4 py-2 text-xs font-bold text-emerald-950 shadow-sm backdrop-blur-xl">
            <Sparkles size={15} className="text-emerald-700" />
            Your work. Your terms. Your PayDrop.
          </div>

          <h1 className="mt-8 max-w-xl text-6xl font-black leading-[1.05] tracking-[-0.055em] text-slate-950 xl:text-7xl">
            Great work deserves
            <span className="mt-2 block text-emerald-900">
              a better way to get paid.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">
            Your creative projects, client conversations and delivery workflow —
            organized in one thoughtfully designed workspace.
          </p>

          {/* Glass product preview */}
          <div className="relative mt-10 max-w-lg">
            <div className="absolute -inset-3 rounded-[34px] bg-gradient-to-br from-lime-300/40 via-emerald-200/20 to-emerald-400/30 blur-2xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-white/90 bg-white/75 p-5 shadow-2xl shadow-emerald-950/10 backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-emerald-950/5 pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-950 text-lime-300">
                    <Layers3 size={19} />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold">Your creative workspace</p>
                    <p className="mt-1 text-xs text-slate-500">A clearer project workflow</p>
                  </div>
                </div>
                <span className="rounded-full bg-lime-100 px-3 py-1.5 text-[10px] font-black tracking-wider text-emerald-900">
                  PAYDROP
                </span>
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-br from-emerald-950 to-[#0A5037] p-5 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-emerald-100/70">Project delivery</p>
                  <ShieldCheck size={18} className="text-lime-300" />
                </div>
                <p className="mt-3 text-xl font-black tracking-tight">
                  Built around your work
                </p>
                <p className="mt-2 text-xs leading-6 text-emerald-100/70">
                  Organize project details, client updates and digital deliverables.
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 rounded-full bg-lime-300" />
                  <span className="h-1.5 flex-1 rounded-full bg-lime-300/60" />
                  <span className="h-1.5 flex-1 rounded-full bg-white/15" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white bg-white/80 p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-100 text-emerald-900">
                    <LockKeyhole size={17} />
                  </span>
                  <p className="mt-3 text-xs font-extrabold">Controlled delivery</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">Designed for digital files</p>
                </div>
                <div className="rounded-2xl border border-white bg-white/80 p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-900">
                    <Fingerprint size={17} />
                  </span>
                  <p className="mt-3 text-xs font-extrabold">One workspace</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">Project details in one place</p>
                </div>
              </div>

              <p className="mt-4 text-center text-[10px] text-slate-400">
                Product preview · No live payment information
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Check size={15} className="text-emerald-700" />
              Built for independent creators
            </span>
            <span className="inline-flex items-center gap-2">
              <Check size={15} className="text-emerald-700" />
              Simple project workflows
            </span>
          </div>
        </div>

        {/* Authentication card */}
        <div className="mx-auto w-full max-w-md">
          <div className="mb-7 text-center lg:hidden">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-emerald-950 text-lime-300 shadow-xl shadow-emerald-950/15">
              <ShieldCheck size={27} />
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              {isSignup ? 'Your next chapter starts here.' : 'Welcome back.'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isSignup
                ? 'Create your PayDrop workspace.'
                : 'Your workspace is just one step away.'}
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-2 rounded-[38px] bg-gradient-to-br from-lime-300/30 via-white/30 to-emerald-300/30 blur-xl" />

            <div className="relative rounded-[30px] border border-white/90 bg-white/85 p-6 shadow-2xl shadow-emerald-950/[0.08] backdrop-blur-2xl sm:rounded-[34px] sm:p-9">
              <div className="mb-7">
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-[#F3F7F0] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
                    Secure workspace access
                  </span>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-950 text-lime-300">
                    <LockKeyhole size={18} />
                  </span>
                </div>

                <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-[34px]">
                  {isSignup ? 'Create your account' : 'Welcome back'}
                  <span className="text-emerald-800">.</span>
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isSignup
                    ? 'Start organizing your projects with PayDrop.'
                    : 'Sign in to continue to your PayDrop workspace.'}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
                >
                  <CircleAlert size={18} className="mt-0.5 shrink-0" />
                  <span className="leading-6">{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-900/20 hover:bg-[#FAFCF8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  or continue with email
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignup && (
                  <div>
                    <label htmlFor="name" className="mb-2 block text-xs font-bold text-slate-700">
                      Your name <span className="font-medium text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      maxLength={80}
                      placeholder="e.g. Alex Morgan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="mb-2 block text-xs font-bold text-slate-700">
                    Work email
                  </label>
                  <div className="relative">
                    <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      maxLength={254}
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                      Password
                    </label>
                    {!isSignup && (
                      <span className="text-[10px] font-medium text-slate-400">
                        Your account password
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={isSignup ? 6 : undefined}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      placeholder={isSignup ? 'At least 6 characters' : 'Enter your password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-emerald-900"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {isSignup && (
                  <p className="text-[11px] leading-5 text-slate-500">
                    By creating an account, you agree to use PayDrop in accordance with its applicable terms and policies.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-950 px-5 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-900 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={18} className="animate-spin" />
                      <span>Please wait...</span>
                    </>
                  ) : (
                    <>
                      <span>{isSignup ? 'Create your account' : 'Sign in to PayDrop'}</span>
                      <ArrowRight size={17} className="text-lime-300 transition group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[10px] font-medium text-slate-400">NEW TO PAYDROP?</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <p className="text-center text-sm text-slate-600">
                {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  disabled={loading}
                  className="font-extrabold text-emerald-900 underline decoration-emerald-900/30 underline-offset-4 transition hover:text-emerald-700 disabled:opacity-50"
                >
                  {isSignup ? 'Sign in' : 'Create one'}
                </button>
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck size={16} className="text-emerald-700" />
            <span>Your authentication is handled by Firebase.</span>
          </div>

          <p className="mt-3 text-center text-[10px] leading-5 text-slate-400">
            PayDrop is currently in development. Payment actions may be simulated;
            this page does not process real payments.
          </p>
        </div>
      </section>

      <footer className="relative z-10 px-5 pb-6 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} PayDrop. Built for people who create.
      </footer>
    </main>
  )
}
