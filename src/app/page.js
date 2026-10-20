
'use client'

import React, { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  LockKeyhole,
  FileArchive,
  Video,
  Image as ImageIcon,
  Code2,
  Check,
  ChevronDown,
  Menu,
  X,
  Zap,
  Globe2,
  Wallet,
  Fingerprint,
  Play,
  Sparkles,
  CircleHelp,
  BadgeCheck,
  Clock3,
  Layers3,
  Shield,
  TrendingUp,
  Eye,
  FileCheck2,
  CircleDollarSign,
  MoveUpRight,
  ScanEye,
  MousePointer2,
} from 'lucide-react'

const features = [
  {
    icon: LockKeyhole,
    title: 'Payment-first workflow',
    text: 'Set project terms and payment expectations before handing over your final deliverables.',
    color: 'bg-lime-100 text-emerald-950',
    number: '01',
  },
  {
    icon: Fingerprint,
    title: 'Controlled file access',
    text: 'Build your delivery workflow around previews, permissions and the right release process.',
    color: 'bg-emerald-100 text-emerald-800',
    number: '02',
  },
  {
    icon: Video,
    title: 'Made for creators',
    text: 'Bring videos, designs, PDFs, source code and project archives into one organized workflow.',
    color: 'bg-sky-100 text-sky-800',
    number: '03',
  },
  {
    icon: Zap,
    title: 'Less payment chasing',
    text: 'Keep project amounts, client communication and delivery milestones easy to follow.',
    color: 'bg-amber-100 text-amber-800',
    number: '04',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create your project',
    text: 'Add the project name, deliverables, pricing and handover details in your workspace.',
    icon: Layers3,
  },
  {
    number: '02',
    title: 'Share a client link',
    text: 'Give your client a dedicated project page to review the details and available previews.',
    icon: Globe2,
  },
  {
    number: '03',
    title: 'Review and deliver',
    text: 'Track progress, coordinate revisions and follow the agreed payment and release workflow.',
    icon: FileCheck2,
  },
]

const faqs = [
  {
    q: 'What is PayDrop?',
    a: 'PayDrop is a digital project delivery platform designed to help freelancers organize client projects, payment progress, revisions and deliverables in one workflow.',
  },
  {
    q: 'What files can I work with?',
    a: 'PayDrop is designed for digital projects involving video exports, images, design assets, PDFs, archives and software deliverables. Actual upload limits and supported preview formats depend on the implementation.',
  },
  {
    q: 'Does PayDrop charge a subscription?',
    a: 'This landing page includes an illustrative 5% platform-fee calculator. It is not a confirmation of the final fee policy or a live payment quote.',
  },
  {
    q: 'Are payments held in escrow?',
    a: 'The current demo experience does not itself establish a regulated escrow service or confirm receipt of real funds. Payment protection depends on the eventual payment provider, applicable arrangements and verified backend implementation.',
  },
  {
    q: 'Can clients preview files before delivery?',
    a: 'The intended workflow supports client previews before final delivery. Preview availability and watermark protection depend on how each file type and its storage permissions are implemented.',
  },
  {
    q: 'Do I need to create a new account?',
    a: 'Creators can use the existing PayDrop login and signup page. Public client links are intended to provide access to the relevant project without requiring a creator account.',
  },
]

function Brand({ light = false }) {
  return (
    <Link
      href="/"
      aria-label="PayDrop home"
      className="group flex shrink-0 items-center gap-2.5"
    >
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[15px] bg-lime-300 text-xl font-black text-emerald-950 shadow-lg shadow-lime-300/20 transition duration-300 group-hover:rotate-[-5deg] group-hover:scale-105 sm:h-11 sm:w-11">
        P
        <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-white/30 blur-md" />
      </span>

      <span
        className={`text-[22px] font-black tracking-[-0.07em] ${
          light ? 'text-white' : 'text-emerald-950'
        }`}
      >
        paydrop<span className="text-lime-500">.</span>
      </span>
    </Link>
  )
}

function SectionLabel({ children, dark = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.17em] ${
        dark
          ? 'border-white/15 bg-white/[0.07] text-lime-200'
          : 'border-emerald-900/10 bg-white/80 text-emerald-900 shadow-sm shadow-emerald-950/[0.03]'
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-500 opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-500" />
      </span>
      {children}
    </span>
  )
}

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Demo
    </span>
  )
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[550px]">
      <div className="absolute -inset-5 rounded-[42px] bg-gradient-to-br from-lime-300/35 via-emerald-200/20 to-teal-300/30 blur-3xl" />

      <div className="absolute -right-2 top-16 z-10 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-3.5 py-3 shadow-xl shadow-emerald-950/10 backdrop-blur-xl sm:flex lg:-right-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-100 text-emerald-900">
          <ShieldCheck size={18} />
        </span>
        <span>
          <span className="block text-[11px] font-extrabold text-emerald-950">
            Protected workflow
          </span>
          <span className="mt-0.5 block text-[10px] text-slate-500">
            Sample interface
          </span>
        </span>
      </div>

      <div className="absolute -bottom-5 -left-3 z-10 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-3.5 py-3 shadow-xl shadow-emerald-950/10 backdrop-blur-xl sm:flex lg:-left-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
          <FileCheck2 size={18} />
        </span>
        <span>
          <span className="block text-[11px] font-extrabold text-emerald-950">
            Delivery workspace
          </span>
          <span className="mt-0.5 block text-[10px] text-slate-500">
            Projects in one place
          </span>
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[29px] border border-white/90 bg-white/85 p-3 shadow-[0_30px_100px_-35px_rgba(6,61,42,0.28)] backdrop-blur-2xl sm:rounded-[34px] sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-emerald-950/[0.07] px-2 pb-4 sm:px-3 sm:pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-emerald-950 text-lime-300 shadow-lg shadow-emerald-950/10">
              <Layers3 size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight text-emerald-950">
                Project overview
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Your creative workspace
              </p>
            </div>
          </div>
          <DemoBadge />
        </div>

        <div className="relative mt-4 overflow-hidden rounded-[23px] bg-[#063D2A] p-5 text-white sm:mt-5 sm:rounded-[26px] sm:p-6">
          <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[26px] border-lime-300/[0.07]" />
          <div className="pointer-events-none absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-100/70">
                <CircleDollarSign size={15} />
                Illustrative project amount
              </div>
              <p className="mt-3 text-[38px] font-black tracking-[-0.065em] sm:text-[46px]">
                ₹50,000
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.08] text-lime-300">
              <Wallet size={19} />
            </span>
          </div>

          <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div>
              <p className="text-xs font-bold text-white">
                Commercial video edit
              </p>
              <p className="mt-1 text-[10px] text-emerald-100/55">
                Example project · Not a real transaction
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/20 bg-lime-300/10 px-2.5 py-1.5 text-[10px] font-bold text-lime-200">
              <Clock3 size={12} />
              In progress
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4">
          <div className="rounded-[20px] border border-emerald-950/[0.06] bg-[#F7F9F5] p-3.5 sm:p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <TrendingUp size={15} className="text-emerald-800" />
              <span className="text-[10px]">Project progress</span>
            </div>
            <p className="mt-3 text-sm font-extrabold tracking-tight text-emerald-950">
              On track
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-950/10">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-800 to-lime-400" />
            </div>
            <p className="mt-2 text-[9px] text-slate-500">Illustrative 67%</p>
          </div>

          <div className="rounded-[20px] border border-emerald-950/[0.06] bg-[#F7F9F5] p-3.5 sm:p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Shield size={15} className="text-emerald-800" />
              <span className="text-[10px]">Delivery checklist</span>
            </div>
            <p className="mt-3 text-sm font-extrabold tracking-tight text-emerald-950">
              2 of 3 complete
            </p>
            <div className="mt-3 flex gap-1.5">
              <span className="h-1.5 flex-1 rounded-full bg-emerald-800" />
              <span className="h-1.5 flex-1 rounded-full bg-emerald-800" />
              <span className="h-1.5 flex-1 rounded-full bg-emerald-950/10" />
            </div>
            <p className="mt-2 text-[9px] text-slate-500">Sample checklist</p>
          </div>
        </div>

        <div className="mt-3 rounded-[20px] border border-emerald-950/[0.07] bg-white p-3.5 sm:mt-4 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-lime-100 text-emerald-900">
                <Video size={19} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-emerald-950">
                  Final_Project_4K.mp4
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Example digital deliverable
                </p>
              </div>
            </div>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
              <BadgeCheck size={17} />
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-amber-50/80 px-3 py-2.5 text-center text-[9px] font-medium leading-4 text-amber-800">
          <CircleHelp size={13} className="shrink-0" />
          Demo data only · No payment has been processed
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [currency, setCurrency] = useState('INR')
  const [amount, setAmount] = useState(25000)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      user => {
        if (user) {
          router.replace('/dashboard')
        } else {
          setChecking(false)
        }
      },
      error => {
        console.error('PayDrop authentication check failed:', error)
        setChecking(false)
      }
    )

    return unsubscribe
  }, [router])

  useEffect(() => {
    if (!mobileMenu) return

    const closeOnEscape = event => {
      if (event.key === 'Escape') setMobileMenu(false)
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenu])

  const min = currency === 'INR' ? 2000 : 50
  const max = currency === 'INR' ? 200000 : 5000
  const step = currency === 'INR' ? 1000 : 50

  const fee = Math.round(amount * 0.05)
  const net = Math.max(0, amount - fee)

  const formatMoney = value =>
    new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)

  const changeCurrency = next => {
    setCurrency(next)
    setAmount(next === 'INR' ? 25000 : 500)
  }

  const closeMobileMenu = () => setMobileMenu(false)

  const navigation = [
    ['Features', '#features'],
    ['How it works', '#how-it-works'],
    ['Pricing', '#pricing'],
    ['FAQ', '#faq'],
  ]

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F0F5EE] px-5">
        <div className="flex flex-col items-center gap-5">
          <div className="relative grid h-[62px] w-[62px] place-items-center rounded-[21px] bg-emerald-950 text-lime-300 shadow-2xl shadow-emerald-950/20">
            <ShieldCheck size={29} />
            <span className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full border-[3px] border-[#F0F5EE] bg-lime-400" />
          </div>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-emerald-950/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-lime-500" />
          </div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-900">
            Preparing your workspace
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#F0F5EE] font-sans text-slate-900 selection:bg-lime-200 selection:text-emerald-950">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-emerald-950/[0.07] bg-[#F0F5EE]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-4 px-5 sm:h-[82px] sm:px-8 lg:px-12">
          <Brand />

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 rounded-full border border-white/80 bg-white/65 p-1.5 shadow-sm shadow-emerald-950/[0.03] md:flex"
          >
            {navigation.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-4 py-2.5 text-[12px] font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-950"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            <Link
              href="/login"
              className="rounded-xl px-4 py-3 text-[12px] font-extrabold text-emerald-950 transition hover:bg-white/80"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-5 py-3.5 text-[12px] font-extrabold text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5 hover:bg-emerald-900"
            >
              Get started
              <ArrowUpRight
                size={15}
                className="text-lime-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <button
            type="button"
            aria-label={mobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenu}
            aria-controls="paydrop-mobile-navigation"
            onClick={() => setMobileMenu(value => !value)}
            className="grid h-11 w-11 place-items-center rounded-[14px] border border-emerald-950/10 bg-white/80 text-emerald-950 shadow-sm transition hover:bg-white md:hidden"
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenu && (
          <nav
            id="paydrop-mobile-navigation"
            aria-label="Mobile navigation"
            className="border-t border-emerald-950/[0.07] bg-[#F0F5EE]/95 p-4 shadow-xl shadow-emerald-950/5 backdrop-blur-2xl md:hidden"
          >
            <div className="space-y-1">
              {navigation.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={closeMobileMenu}
                  className="block rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-white hover:text-emerald-950"
                >
                  {label}
                </a>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="rounded-xl border border-emerald-950/10 bg-white px-4 py-3.5 text-center text-sm font-extrabold text-emerald-950"
              >
                Log in
              </Link>
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="rounded-xl bg-emerald-950 px-4 py-3.5 text-center text-sm font-extrabold text-white"
              >
                Get started
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="relative isolate px-5 pb-20 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:px-12 lg:pb-32 lg:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] overflow-hidden">
          <div className="absolute -left-44 top-10 h-[420px] w-[420px] rounded-full bg-lime-300/30 blur-[110px]" />
          <div className="absolute right-[-160px] top-10 h-[470px] w-[470px] rounded-full bg-emerald-300/30 blur-[120px]" />
          <div className="absolute left-[45%] top-[330px] h-64 w-64 rounded-full bg-teal-200/20 blur-[100px]" />
        </div>

        <div className="mx-auto grid max-w-[1400px] items-center gap-14 lg:grid-cols-[1.03fr_0.97fr] lg:gap-10 xl:gap-16">
          <div className="relative z-10 max-w-[660px]">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/90 bg-white/75 px-3.5 py-2.5 text-[10px] font-extrabold text-emerald-950 shadow-sm shadow-emerald-950/[0.04] backdrop-blur-xl sm:px-4 sm:text-[11px]">
              <Sparkles size={15} className="shrink-0 text-emerald-700" />
              <span>Built for independent creators</span>
              <span className="hidden h-1 w-1 shrink-0 rounded-full bg-lime-500 sm:block" />
              <span className="hidden text-emerald-700 sm:block">Meet PayDrop</span>
            </div>

            <h1 className="mt-7 max-w-3xl text-[43px] font-black leading-[1.04] tracking-[-0.065em] text-emerald-950 sm:mt-8 sm:text-6xl lg:text-[66px] xl:text-[76px]">
              Great work deserves
              <span className="mt-1 block">a better way to</span>
              <span className="relative mt-1 inline-block text-emerald-800">
                get delivered.
                <svg
                  viewBox="0 0 320 14"
                  fill="none"
                  aria-hidden="true"
                  className="absolute -bottom-2 left-0 h-2.5 w-full text-lime-400 sm:-bottom-3 sm:h-3"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M3 9C70 2 175 2 317 7"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-7 max-w-[540px] text-[14px] leading-7 text-slate-600 sm:mt-8 sm:text-[16px] sm:leading-8">
              From project terms to protected previews, payment progress and
              final file delivery — keep your client work organized in one
              focused workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex min-h-[55px] items-center justify-center gap-3 rounded-[17px] bg-emerald-950 px-6 text-[13px] font-extrabold text-white shadow-xl shadow-emerald-950/15 transition duration-300 hover:-translate-y-1 hover:bg-emerald-900 hover:shadow-2xl hover:shadow-emerald-950/20 sm:px-7"
              >
                Create your free account
                <span className="grid h-7 w-7 place-items-center rounded-full bg-lime-300 text-emerald-950 transition group-hover:translate-x-1">
                  <ArrowRight size={15} />
                </span>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex min-h-[55px] items-center justify-center gap-3 rounded-[17px] border border-white bg-white/70 px-6 text-[13px] font-extrabold text-emerald-950 shadow-sm backdrop-blur-xl transition hover:border-emerald-900/15 hover:bg-white sm:px-7"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-900">
                  <Play size={13} fill="currentColor" />
                </span>
                Explore the workflow
              </a>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] font-semibold text-slate-500 sm:mt-8 sm:gap-x-6">
              <span className="inline-flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-lime-200/70 text-emerald-900">
                  <Check size={12} />
                </span>
                Digital project workflow
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-lime-200/70 text-emerald-900">
                  <Check size={12} />
                </span>
                Clear delivery status
              </span>
            </div>

            <div className="mt-10 flex items-center gap-3 border-t border-emerald-950/[0.08] pt-6 sm:mt-12 sm:pt-7">
              <div className="flex -space-x-2">
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#F0F5EE] bg-emerald-100 text-emerald-900">
                  <Code2 size={15} />
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#F0F5EE] bg-lime-200 text-emerald-950">
                  <ImageIcon size={15} />
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#F0F5EE] bg-sky-100 text-sky-800">
                  <Video size={15} />
                </span>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-emerald-950">
                  One workspace. Many kinds of work.
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  For developers, designers and freelancers
                </p>
              </div>
            </div>
          </div>

          <div className="relative py-3 sm:py-5 lg:py-8">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Deliverables strip */}
      <section className="border-y border-emerald-950/[0.07] bg-white/55">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-7 gap-y-5 px-5 py-7 sm:gap-x-10 sm:px-8 sm:py-8 lg:justify-between lg:px-12">
          <p className="w-full text-center text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400 lg:w-auto lg:text-left">
            One workflow for your digital work
          </p>
          {[
            [Video, 'Video & motion'],
            [ImageIcon, 'Design & graphics'],
            [FileArchive, 'Files & archives'],
            [Code2, 'Software projects'],
            [Globe2, 'Remote clients'],
          ].map(([Icon, label]) => (
            <div
              key={label}
              className="flex items-center gap-2.5 text-[11px] font-bold text-slate-600 sm:text-xs"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-emerald-950/[0.05] bg-white text-emerald-800 shadow-sm">
                <Icon size={16} />
              </span>
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
      >
        <div className="mx-auto max-w-[1400px]">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>Less friction, more focus</SectionLabel>
            <h2 className="mt-6 text-[32px] font-black leading-tight tracking-[-0.05em] text-emerald-950 sm:text-5xl lg:text-[55px]">
              The details behind every
              <span className="block text-emerald-800">
                great delivery, organized.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[13px] leading-7 text-slate-600 sm:text-[15px] sm:leading-8">
              Spend less energy managing scattered project details and more
              time doing the work your clients hired you for.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 xl:grid-cols-4">
            {features.map(({ icon: Icon, title, text, color, number }) => (
              <article
                key={title}
                className="group relative overflow-hidden rounded-[26px] border border-emerald-950/[0.07] bg-white/80 p-6 shadow-sm shadow-emerald-950/[0.02] transition duration-300 hover:-translate-y-1 hover:border-emerald-800/20 hover:bg-white hover:shadow-xl hover:shadow-emerald-950/[0.06] sm:rounded-[29px] sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-[17px] ${color} transition duration-300 group-hover:scale-105`}
                  >
                    <Icon size={22} />
                  </span>
                  <span className="text-[10px] font-extrabold tracking-[0.15em] text-slate-300">
                    {number}
                  </span>
                </div>

                <h3 className="mt-7 text-[17px] font-extrabold tracking-tight text-emerald-950">
                  {title}
                </h3>
                <p className="mt-3 text-[12px] leading-7 text-slate-600 sm:text-[13px]">
                  {text}
                </p>

                <div className="mt-6 flex items-center gap-2 text-[10px] font-extrabold text-emerald-800 opacity-70 transition group-hover:opacity-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
                  Part of your workflow
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative overflow-hidden rounded-[26px] bg-[#E5EDE1] p-6 sm:rounded-[30px] sm:p-8">
              <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full bg-lime-300/25 blur-3xl" />
              <div className="relative flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-900 shadow-sm">
                  <ScanEye size={21} />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-800">
                    Designed for digital delivery
                  </p>
                  <h3 className="mt-3 max-w-md text-xl font-black tracking-tight text-emerald-950 sm:text-2xl">
                    Keep previews and final deliverables in the right places.
                  </h3>
                  <p className="mt-3 max-w-lg text-[12px] leading-7 text-slate-600 sm:text-[13px]">
                    The intended workflow separates client-facing previews from
                    final files. Real access protection must be enforced by
                    the storage and server permissions.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-5 rounded-[26px] border border-emerald-950/[0.07] bg-white/80 p-6 sm:rounded-[30px] sm:p-8">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-100 text-emerald-950">
                <MousePointer2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-emerald-950">
                  Simple by design.
                </h3>
                <p className="mt-2 text-[12px] leading-7 text-slate-600">
                  Project details, client communication and delivery progress
                  without unnecessary complexity.
                </p>
              </div>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-[11px] font-extrabold text-emerald-800 transition hover:gap-3"
              >
                See how it works <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section
        id="how-it-works"
        className="relative isolate scroll-mt-24 overflow-hidden bg-[#063D2A] px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-12 lg:py-32"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-40 -top-48 h-[480px] w-[480px] rounded-full border border-white/[0.06]" />
          <div className="absolute -right-24 -top-32 h-[320px] w-[320px] rounded-full border border-white/[0.07]" />
          <div className="absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-emerald-400/[0.08] blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-[1250px] gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
          <div>
            <SectionLabel dark>Simple by design</SectionLabel>
            <h2 className="mt-6 text-[34px] font-black leading-[1.1] tracking-[-0.055em] sm:text-5xl lg:text-[56px]">
              From the first brief
              <span className="block text-lime-300">
                to the final file.
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-[13px] leading-7 text-emerald-100/70 sm:text-[15px] sm:leading-8">
              A clear process helps you and your client understand the project,
              know what happens next and keep delivery moving.
            </p>
            <Link
              href="/login"
              className="group mt-8 inline-flex min-h-[52px] items-center gap-3 rounded-[15px] bg-lime-300 px-5 text-[12px] font-extrabold text-emerald-950 transition hover:-translate-y-0.5 hover:bg-lime-200"
            >
              Start your workspace
              <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </Link>

            <div className="mt-9 flex items-center gap-3 border-t border-white/10 pt-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-lime-300">
                <ShieldCheck size={20} />
              </span>
              <p className="max-w-xs text-[11px] leading-5 text-emerald-100/60">
                Clear project terms and a defined delivery workflow help set
                expectations.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map(({ number, title, text, icon: Icon }) => (
              <article
                key={number}
                className="group flex gap-4 rounded-[22px] border border-white/[0.10] bg-white/[0.045] p-5 backdrop-blur-sm transition duration-300 hover:border-lime-300/20 hover:bg-white/[0.075] sm:gap-6 sm:rounded-[25px] sm:p-7"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-white/[0.10] bg-white/[0.06] text-lime-300 transition group-hover:border-lime-300/20 group-hover:bg-lime-300/10">
                  <Icon size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-black tracking-[0.15em] text-lime-300">
                      STEP {number}
                    </span>
                    <span className="h-px w-6 bg-white/15" />
                  </div>
                  <h3 className="mt-2 text-base font-extrabold tracking-tight sm:text-lg">
                    {title}
                  </h3>
                  <p className="mt-2 text-[12px] leading-7 text-emerald-100/65 sm:text-[13px]">
                    {text}
                  </p>
                </div>
                <ArrowUpRight
                  size={18}
                  className="mt-1 hidden shrink-0 text-emerald-100/35 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-lime-300 sm:block"
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing calculator */}
      <section
        id="pricing"
        className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
      >
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
          <div>
            <SectionLabel>Transparent numbers</SectionLabel>
            <h2 className="mt-6 text-[34px] font-black leading-[1.1] tracking-[-0.055em] text-emerald-950 sm:text-5xl lg:text-[54px]">
              See what a sample payout could look like.
            </h2>
            <p className="mt-5 max-w-lg text-[13px] leading-7 text-slate-600 sm:text-[15px] sm:leading-8">
              Adjust your project amount and currency to explore the
              illustrative 5% platform-fee calculation.
            </p>

            <div className="mt-7 space-y-4">
              <div className="flex items-start gap-3 rounded-[19px] border border-emerald-950/[0.07] bg-white/75 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime-100 text-emerald-900">
                  <CircleHelp size={18} />
                </span>
                <div>
                  <p className="text-[12px] font-extrabold text-emerald-950">
                    An estimate, not a payment quote
                  </p>
                  <p className="mt-1 text-[11px] leading-6 text-slate-500">
                    Final fees, taxes and payment processing costs may differ.
                    This calculator does not process transactions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-[19px] border border-emerald-950/[0.07] bg-white/75 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-900">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <p className="text-[12px] font-extrabold text-emerald-950">
                    Demo mode
                  </p>
                  <p className="mt-1 text-[11px] leading-6 text-slate-500">
                    No real payment is initiated, collected or settled by this
                    estimator.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[29px] border border-white/10 bg-[#063D2A] p-5 text-white shadow-[0_25px_80px_-30px_rgba(6,61,42,0.35)] sm:rounded-[34px] sm:p-8 lg:p-9">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[36px] border-white/[0.035]" />
            <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-emerald-400/[0.08] blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[14px] font-extrabold tracking-tight">
                  Payout estimator
                </p>
                <p className="mt-1.5 text-[11px] text-emerald-100/60">
                  Sample calculation · 5% fee
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
                <Globe2 size={14} className="text-lime-300" />
                <select
                  aria-label="Project currency"
                  value={currency}
                  onChange={event => changeCurrency(event.target.value)}
                  className="max-w-[100px] bg-transparent text-[11px] font-extrabold text-white outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
                >
                  <option className="text-emerald-950" value="INR">
                    INR ₹
                  </option>
                  <option className="text-emerald-950" value="USD">
                    USD $
                  </option>
                </select>
              </div>
            </div>

            <div className="relative mt-8 rounded-[23px] border border-white/[0.08] bg-white/[0.045] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold text-emerald-100/65">
                  Project amount
                </p>
                <span className="rounded-full bg-lime-300/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-lime-300">
                  Editable
                </span>
              </div>

              <p className="mt-3 break-words text-[36px] font-black tracking-[-0.06em] sm:text-[46px]">
                {formatMoney(amount)}
              </p>

              <input
                aria-label="Project amount"
                type="range"
                min={min}
                max={max}
                step={step}
                value={amount}
                onChange={event => setAmount(Number(event.target.value))}
                className="mt-6 w-full cursor-pointer accent-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300"
              />

              <div className="mt-2 flex justify-between gap-3 text-[10px] text-emerald-100/55">
                <span>{formatMoney(min)}</span>
                <span>{formatMoney(max)}</span>
              </div>
            </div>

            <div className="relative mt-6 space-y-4">
              <div className="flex items-center justify-between gap-4 text-[12px]">
                <span className="text-emerald-100/65">Project amount</span>
                <span className="font-bold tabular-nums">
                  {formatMoney(amount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-[12px]">
                <span className="text-emerald-100/65">
                  Illustrative fee (5%)
                </span>
                <span className="font-bold tabular-nums text-rose-300">
                  −{formatMoney(fee)}
                </span>
              </div>

              <div className="border-t border-white/10 pt-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-lime-200">
                      Estimated after fee
                    </p>
                    <p className="mt-1 text-[9px] text-emerald-100/50">
                      Before any other applicable charges
                    </p>
                  </div>
                  <p className="break-words text-right text-[27px] font-black tracking-[-0.05em] text-lime-300 sm:text-[32px]">
                    {formatMoney(net)}
                  </p>
                </div>
              </div>
            </div>

            <p className="relative mt-6 border-t border-white/[0.08] pt-4 text-[10px] leading-5 text-emerald-100/50">
              Demo only. No funds are held, transferred or released through
              this calculator.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="scroll-mt-24 border-y border-emerald-950/[0.06] bg-white/45 px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28"
      >
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.76fr_1.24fr] lg:gap-16">
          <div>
            <SectionLabel>Questions, answered</SectionLabel>
            <h2 className="mt-6 text-[34px] font-black leading-[1.1] tracking-[-0.055em] text-emerald-950 sm:text-5xl">
              Clarity matters.
              <span className="block text-emerald-800">So do your files.</span>
            </h2>
            <p className="mt-5 max-w-sm text-[13px] leading-7 text-slate-600 sm:text-[14px] sm:leading-8">
              A few essentials about the PayDrop workflow, digital delivery
              and the current demo experience.
            </p>

            <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-emerald-950/[0.07] bg-white/80 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-950 text-lime-300">
                <LockKeyhole size={19} />
              </span>
              <div>
                <p className="text-[11px] font-extrabold text-emerald-950">
                  Built around clarity
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Understand the workflow before you begin
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index
              const answerId = `paydrop-faq-answer-${index}`

              return (
                <article
                  key={faq.q}
                  className={`overflow-hidden rounded-[20px] border transition duration-200 ${
                    isOpen
                      ? 'border-emerald-900/15 bg-white shadow-md shadow-emerald-950/[0.035]'
                      : 'border-emerald-950/[0.07] bg-white/65 hover:bg-white'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="flex min-h-[64px] w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                  >
                    <span className="text-[12px] font-extrabold leading-6 text-emerald-950 sm:text-[13px]">
                      {faq.q}
                    </span>
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${
                        isOpen
                          ? 'rotate-180 bg-emerald-950 text-lime-300'
                          : 'bg-emerald-50 text-emerald-900'
                      }`}
                    >
                      <ChevronDown size={16} />
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      id={answerId}
                      className="border-t border-emerald-950/[0.06] px-5 pb-5 pt-4 sm:px-6"
                    >
                      <p className="text-[12px] leading-7 text-slate-600 sm:text-[13px]">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[29px] bg-lime-300 px-6 py-12 sm:rounded-[36px] sm:px-12 sm:py-16 lg:px-20 lg:py-20">
          <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border-[42px] border-emerald-950/[0.045]" />
          <div className="pointer-events-none absolute -bottom-36 left-[30%] h-64 w-64 rounded-full bg-white/25 blur-3xl" />
          <div className="pointer-events-none absolute right-[25%] top-8 h-3 w-3 rounded-full bg-emerald-950/15" />

          <div className="relative mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-950/10 bg-white/45 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-950">
              <Sparkles size={14} />
              Your next project starts here
            </span>

            <h2 className="mt-6 text-[34px] font-black leading-[1.08] tracking-[-0.06em] text-emerald-950 sm:text-5xl lg:text-[60px]">
              Make room for more
              <span className="block">great work.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[13px] leading-7 text-emerald-950/70 sm:text-[15px] sm:leading-8">
              Organize project details, stay on top of delivery and build a
              clearer client experience with PayDrop.
            </p>

            <Link
              href="/login"
              className="group mt-8 inline-flex min-h-[55px] items-center justify-center gap-3 rounded-[17px] bg-emerald-950 px-6 text-[12px] font-extrabold text-white shadow-xl shadow-emerald-950/15 transition duration-300 hover:-translate-y-1 hover:bg-emerald-900 sm:px-7"
            >
              Create your account
              <span className="grid h-7 w-7 place-items-center rounded-full bg-lime-300 text-emerald-950 transition group-hover:translate-x-1">
                <ArrowRight size={15} />
              </span>
            </Link>
            <p className="mt-4 text-[10px] font-semibold text-emerald-950/55">
              Already have an account?{' '}
              <Link
                href="/login"
                className="underline decoration-emerald-950/30 underline-offset-4 hover:text-emerald-950"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-950/[0.07] bg-white/65 px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Brand />
            <p className="mt-3 max-w-xs text-[11px] leading-6 text-slate-500">
              A more organized digital delivery workflow for independent
              creators.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] font-bold text-slate-500">
            <a href="#features" className="transition hover:text-emerald-900">
              Features
            </a>
            <a
              href="#how-it-works"
              className="transition hover:text-emerald-900"
            >
              How it works
            </a>
            <a href="#faq" className="transition hover:text-emerald-900">
              FAQ
            </a>
            <Link
              href="/login"
              className="transition hover:text-emerald-900"
            >
              Log in
            </Link>
          </div>

          <p className="text-[10px] font-medium text-slate-400">
            © {new Date().getFullYear()} PayDrop. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
