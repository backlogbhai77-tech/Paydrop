'use client'

import React, { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight, ArrowUpRight, ShieldCheck, LockKeyhole,
  FileArchive, Video, Image as ImageIcon, Code2,
  Check, ChevronDown, Menu, X, Zap, Globe2,
  Wallet, Fingerprint, Play, Sparkles, CircleHelp,
  BadgeCheck, Clock3, Layers3, Shield, TrendingUp
} from 'lucide-react'

const features = [
  {
    icon: LockKeyhole,
    title: 'Payment-first workflow',
    text: 'Set your project terms before sharing final deliverables with your client.',
    color: 'bg-lime-100 text-green-900',
  },
  {
    icon: Fingerprint,
    title: 'Controlled file access',
    text: 'Design your delivery workflow around appropriate permissions and access controls.',
    color: 'bg-emerald-100 text-emerald-800',
  },
  {
    icon: Video,
    title: 'Made for creators',
    text: 'Organize video exports, design files, archives, and digital projects in one place.',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    icon: Zap,
    title: 'Less payment chasing',
    text: 'Keep project amounts, payment status, and delivery milestones easy to follow.',
    color: 'bg-amber-100 text-amber-800',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create your project',
    text: 'Set a project name, price, delivery details, and the terms your client will agree to.',
  },
  {
    number: '02',
    title: 'Share with your client',
    text: 'Give your client a clear project overview and the payment instructions for the job.',
  },
  {
    number: '03',
    title: 'Complete delivery',
    text: 'Track the project and follow the agreed payment and file-release process.',
  },
]

const faqs = [
  {
    q: 'What is PayDrop?',
    a: 'PayDrop is designed to help freelancers organize project payments, delivery milestones, and digital deliverables in a single workflow.',
  },
  {
    q: 'What files can I work with?',
    a: 'PayDrop is designed for digital projects involving video exports, images, design assets, PDFs, archives, and software deliverables.',
  },
  {
    q: 'Does PayDrop charge a subscription?',
    a: 'This landing page illustrates a proposed 5% platform fee.',
  },
  {
    q: 'Are payments held in escrow?',
    a: 'The actual escrow or payment-protection arrangement depends on your payment provider and backend implementation.',
  },
]

function Brand({ light = false }) {
  return (
    <Link href="/" className="flex items-center gap-3 shrink-0">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-300 text-xl font-black text-emerald-950 shadow-lg shadow-lime-300/20">
        P
      </span>
      <span className={`text-xl font-black tracking-tight ${light ? 'text-white' : 'text-slate-950'}`}>
        paydrop<span className="text-lime-500">.</span>
      </span>
    </Link>
  )
}

function SectionLabel({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-900 shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
      {children}
    </span>
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
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) router.replace('/dashboard')
      else setChecking(false)
    })
    return unsubscribe
  }, [router])

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

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F6F8F3]">
        <div className="flex flex-col items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-950 text-lime-300">
            <ShieldCheck size={28} />
          </span>
          <div className="h-1.5 w-36 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-lime-500" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-900">
            Preparing your workspace
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F8F3] font-sans text-slate-900 selection:bg-lime-200">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#F6F8F3]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Brand />

          <nav className="hidden items-center gap-8 md:flex">
            {[
              ['Features', '#features'],
              ['How it works', '#how-it-works'],
              ['Pricing', '#pricing'],
              ['FAQ', '#faq'],
            ].map(([label, href]) => (
              <a key={href} href={href} className="text-sm font-medium text-slate-600 transition hover:text-emerald-950">
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-white">
              Log in
            </Link>
            <Link href="/login" className="group inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-emerald-900">
              Get started <ArrowUpRight size={16} className="text-lime-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            type="button"
            aria-label={mobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu(v => !v)}
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white md:hidden"
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenu && (
          <nav className="space-y-1 border-t border-slate-200 bg-white p-5 md:hidden">
            {[
              ['Features', '#features'],
              ['How it works', '#how-it-works'],
              ['Pricing', '#pricing'],
              ['FAQ', '#faq'],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMobileMenu(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {label}
              </a>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-3">
              <Link href="/login" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold">Log in</Link>
              <Link href="/login" className="rounded-xl bg-emerald-950 px-4 py-3 text-center text-sm font-bold text-white">Get started</Link>
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="relative isolate px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-12 lg:pb-28 lg:pt-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[650px] overflow-hidden">
          <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-lime-200/40 blur-[100px]" />
          <div className="absolute -right-32 top-24 h-96 w-96 rounded-full bg-emerald-200/40 blur-[100px]" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1fr_0.95fr]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-4 py-2 text-xs font-semibold text-emerald-950 shadow-sm">
              <Sparkles size={14} className="text-emerald-700" />
              A smarter workflow for independent creators
              <ArrowRight size={13} />
            </div>

            <h1 className="mt-8 text-5xl font-black leading-[1.06] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[76px]">
              Your work has value.
              <span className="mt-2 block text-emerald-900">
                Your payments should too.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Manage project terms, payment progress, and digital delivery in one focused workspace built for freelancers and creative studios.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-950 px-7 text-sm font-bold text-white shadow-xl shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-900">
                Create your free account
                <ArrowRight size={17} className="text-lime-300 transition group-hover:translate-x-1" />
              </Link>
              <a href="#how-it-works" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-7 text-sm font-bold text-slate-800 transition hover:border-emerald-900/20 hover:bg-white">
                <Play size={15} className="fill-emerald-900 text-emerald-900" />
                Explore the workflow
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-2"><Check size={15} className="text-emerald-700" /> No subscription advertised</span>
              <span className="inline-flex items-center gap-2"><Check size={15} className="text-emerald-700" /> Built for digital work</span>
            </div>
          </div>

          {/* Illustrative dashboard */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-lime-300/50 via-transparent to-emerald-300/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-white bg-white p-4 shadow-2xl shadow-emerald-950/10 sm:rounded-[32px] sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-950 text-lime-300"><Layers3 size={19} /></div>
                  <div>
                    <p className="text-sm font-extrabold">Project overview</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Your workspace · Sample data</p>
                  </div>
                </div>
                <span className="rounded-full bg-lime-100 px-3 py-1.5 text-[10px] font-bold text-emerald-900">DEMO</span>
              </div>

              <div className="mt-5 rounded-2xl bg-emerald-950 p-5 text-white sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-emerald-100/75">Illustrative project amount</p>
                  <Wallet size={17} className="text-lime-300" />
                </div>
                <p className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">₹50,000</p>
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-xs text-emerald-100/70">Commercial video edit</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-lime-300"><Clock3 size={13} /> In progress</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500"><TrendingUp size={15} /><span className="text-[11px]">Project status</span></div>
                  <p className="mt-3 text-sm font-extrabold text-slate-900">On track</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-2/3 rounded-full bg-lime-500" /></div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500"><Shield size={15} /><span className="text-[11px]">Delivery checklist</span></div>
                  <p className="mt-3 text-sm font-extrabold text-slate-900">2 of 3 complete</p>
                  <div className="mt-3 flex gap-1.5"><span className="h-1.5 flex-1 rounded-full bg-emerald-800" /><span className="h-1.5 flex-1 rounded-full bg-emerald-800" /><span className="h-1.5 flex-1 rounded-full bg-slate-200" /></div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-100 text-emerald-900"><Video size={19} /></div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">Final_Project_4K.mp4</p>
                      <p className="mt-1 text-[11px] text-slate-500">Digital deliverable · Sample</p>
                    </div>
                  </div>
                  <BadgeCheck size={19} className="shrink-0 text-emerald-700" />
                </div>
              </div>

              <p className="mt-4 text-center text-[10px] leading-5 text-slate-400">
                Illustrative interface only. No real funds or payment status are shown.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported project types */}
      <section className="border-y border-slate-200/80 bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-5 px-5 py-8 sm:px-8 lg:justify-between lg:px-12">
          <p className="w-full text-center text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 lg:w-auto lg:text-left">Designed for digital deliverables</p>
          {[
            [Video, 'Video & motion'],
            [ImageIcon, 'Design & graphics'],
            [FileArchive, 'Files & archives'],
            [Code2, 'Software projects'],
            [Globe2, 'Remote clients'],
          ].map(([Icon, label]) => (
            <div key={label} className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
              <Icon size={17} className="text-emerald-800" /> {label}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Less friction, more focus</SectionLabel>
            <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Everything your project needs.
              <span className="block text-emerald-900">Nothing getting in your way.</span>
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
              Keep project details and delivery milestones organized without unnecessary complexity.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text, color }, index) => (
              <article key={title} className="group rounded-3xl border border-slate-200/80 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-emerald-900/20 hover:shadow-xl hover:shadow-emerald-950/5">
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}><Icon size={22} /></div>
                <p className="mt-7 text-[11px] font-bold tracking-[0.18em] text-slate-400">0{index + 1}</p>
                <h3 className="mt-2 text-lg font-extrabold tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="how-it-works" className="scroll-mt-24 bg-emerald-950 px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionLabel>Simple by design</SectionLabel>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">
              From first agreement to final delivery.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-emerald-100/70 sm:text-base">
              A clearer workflow helps you and your client understand what happens next at every stage.
            </p>
            <Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3.5 text-sm font-extrabold text-emerald-950 transition hover:bg-lime-200">
              Start your workspace <ArrowRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {steps.map(step => (
              <article key={step.number} className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07] sm:gap-7 sm:p-7">
                <span className="text-2xl font-black tracking-tight text-lime-300 sm:text-3xl">{step.number}</span>
                <div>
                  <h3 className="text-base font-extrabold sm:text-lg">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-emerald-100/65">{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section id="pricing" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionLabel>Transparent numbers</SectionLabel>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">Know your estimated payout before you start.</h2>
            <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
              Explore a sample 5% platform-fee calculation. Actual charges may vary depending on the final fee policy, payment processing, and taxes.
            </p>
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-900/10 bg-white p-4">
              <CircleHelp size={20} className="mt-0.5 shrink-0 text-emerald-800" />
              <p className="text-xs leading-6 text-slate-500">This calculator is an estimate, not a live payment quote.</p>
            </div>
          </div>

          <div className="rounded-[30px] bg-emerald-950 p-6 text-white shadow-2xl shadow-emerald-950/15 sm:p-9">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold">Payout estimator</p>
                <p className="mt-1 text-xs text-emerald-100/60">Adjust the project amount</p>
              </div>
              <select
                aria-label="Project currency"
                value={currency}
                onChange={e => changeCurrency(e.target.value)}
                className="rounded-xl border border-white/15 bg-emerald-900 px-3 py-2.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-lime-300"
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
              </select>
            </div>

            <p className="mt-8 text-4xl font-black tracking-tight sm:text-5xl">{formatMoney(amount)}</p>
            <input
              aria-label="Project amount"
              type="range"
              min={min}
              max={max}
              step={step}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="mt-7 w-full cursor-pointer accent-lime-300"
            />
            <div className="flex justify-between text-[11px] text-emerald-100/60"><span>{formatMoney(min)}</span><span>{formatMoney(max)}</span></div>

            <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
              <div className="flex justify-between gap-4 text-sm"><span className="text-emerald-100/70">Project amount</span><span className="font-bold">{formatMoney(amount)}</span></div>
              <div className="flex justify-between gap-4 text-sm"><span className="text-emerald-100/70">Illustrative platform fee (5%)</span><span className="font-bold text-rose-300">−{formatMoney(fee)}</span></div>
              <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-5"><span className="text-sm font-bold text-lime-200">Estimated after platform fee</span><span className="text-2xl font-black tracking-tight text-lime-300">{formatMoney(net)}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 border-t border-slate-200/80 bg-white/70 px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionLabel>Questions, answered</SectionLabel>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">Good work deserves clear terms.</h2>
            <p className="mt-5 text-sm leading-7 text-slate-600">Have a question about your workflow? Start with these essentials.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <article key={faq.q} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6">
                  <span className="text-sm font-bold leading-6">{faq.q}</span>
                  <ChevronDown size={18} className={`shrink-0 text-emerald-900 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && <p className="border-t border-slate-100 px-5 py-5 text-sm leading-7 text-slate-600 sm:px-6">{faq.a}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-lime-300 px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute -right-12 -top-28 h-72 w-72 rounded-full border-[40px] border-emerald-950/5" />
          <div className="relative mx-auto max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-900/65">Make your next project simpler</p>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-emerald-950 sm:text-5xl">Spend more time creating. Less time chasing.</h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-emerald-950/70 sm:text-base">Create your PayDrop account and organize your next client project in one place.</p>
            <Link href="/login" className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-950 px-7 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-emerald-900">
              Create your account <ArrowRight size={17} className="text-lime-300" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><Brand /><p className="mt-3 text-xs text-slate-500">A more organized workflow for independent creators.</p></div>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-slate-500">
            <Link href="/login" className="hover:text-emerald-900">Log in</Link>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} PayDrop</p>
        </div>
      </footer>
    </main>
  )
}
