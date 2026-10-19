'use client'

/**
 * PayDrop dashboard — pro edition
 * Requires:  npm i framer-motion
 * Uses your existing globals: glass-mint, glass-mint-dark, font-mono-data, animate-pulse-glow
 * Theme (emerald / lime / mint glass) is unchanged.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  motion, AnimatePresence, animate, useMotionValue, MotionConfig, LayoutGroup,
} from 'framer-motion'
import { auth, db } from '../../lib/firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import {
  collection, addDoc, query, where, deleteDoc, doc, updateDoc,
  onSnapshot, serverTimestamp, arrayUnion,
} from 'firebase/firestore'
import {
  Plus, MessageSquare, UploadCloud, Lock, ExternalLink, Trash2, X, Search,
  Wallet, ShieldCheck, Eye, EyeOff, Home, Briefcase, ChevronRight, Sparkles,
  File, Film, Image as ImageIcon, Send, Bot, ArrowRight, ArrowLeft, Share2,
  TrendingUp, Command, LogOut, Vibrate, Check, AlertTriangle, CornerDownLeft,
  Clock, CheckCircle2, Copy,
} from 'lucide-react'
import Link from 'next/link'

/* ────────────────────────────────────────────────────────────────────────────
   Config
──────────────────────────────────────────────────────────────────────────── */

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'mrfujhf8'
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || 'releasedrop_vault'
const WATERMARK_TEXT = 'PAYDROP • PREVIEW COPY'
const MAX_FILE_MB = 100
const FEE_RATE = 0.05
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const spring = { type: 'spring', stiffness: 380, damping: 32 }
const softSpring = { type: 'spring', stiffness: 260, damping: 28 }
const listVariants = { show: { transition: { staggerChildren: 0.055 } } }
const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.16 } },
}

/* ────────────────────────────────────────────────────────────────────────────
   Utilities
──────────────────────────────────────────────────────────────────────────── */

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount)
  if (isNaN(num)) return currency === 'USD' ? '$0' : '₹0'
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(num)
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const initials = (s, fallback = 'AN') => (s ? s.slice(0, 2).toUpperCase() : fallback)
const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/* ── Haptics ───────────────────────────────────────────────────────────────
   Android/Chrome: navigator.vibrate patterns.
   iOS Safari 17.4+: toggling a hidden <input type="checkbox" switch> fires the
   system haptic (the only web-reachable haptic on iPhone). Must run inside a
   user gesture. Desktop: silently no-ops.                                      */

const PATTERNS = {
  selection: 6, light: 10, medium: 18, heavy: 32,
  success: [10, 45, 16], warning: [22, 55, 22], error: [36, 45, 36, 45, 56],
}
let hapticsOn = true
let iosSwitch = null

function setHapticsEnabled(v) { hapticsOn = v }

function haptic(type = 'light') {
  if (typeof window === 'undefined' || !hapticsOn) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const pattern = PATTERNS[type] ?? 10
  try {
    if (navigator.vibrate) { navigator.vibrate(pattern); return }
    if (!iosSwitch) {
      const label = document.createElement('label')
      label.setAttribute('aria-hidden', 'true')
      label.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none'
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('switch', '')
      label.appendChild(input)
      document.body.appendChild(label)
      iosSwitch = label
    }
    if (Array.isArray(pattern)) {
      pattern.forEach((ms, i) => { if (i % 2 === 0) setTimeout(() => iosSwitch.click(), pattern.slice(0, i).reduce((a, b) => a + b, 0)) })
    } else {
      iosSwitch.click()
    }
  } catch { /* haptics are best-effort */ }
}

/* ── Cloudinary upload (per-file progress) ─────────────────────────────── */

function uploadFileToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText)
        if (xhr.status === 200 && (res.secure_url || res.url)) {
          const rawUrl = res.secure_url || res.url
          const previewUrl = file.type.startsWith('image/')
            ? rawUrl.replace('/upload/', `/upload/l_text:Arial_24_bold:${encodeURIComponent(WATERMARK_TEXT)},o_35,a_-30/`)
            : rawUrl
          resolve({
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            type: file.type || 'application/octet-stream',
            rawUrl,
            previewUrl,
          })
        } else {
          reject(new Error(res?.error?.message || 'Storage error'))
        }
      } catch {
        reject(new Error('Upload parsing error'))
      }
    }
    xhr.onerror = () => reject(new Error('Network connection interrupted'))
    xhr.send(formData)
  })
}

/* ────────────────────────────────────────────────────────────────────────────
   Primitives
──────────────────────────────────────────────────────────────────────────── */

/** Button with spring press feedback + haptic. */
const Press = React.forwardRef(function Press(
  { haptic: h = 'light', onClick, className = '', children, lift = true, ...rest }, ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={rest.disabled ? undefined : { scale: 0.95 }}
      whileHover={rest.disabled || !lift ? undefined : { y: -1.5 }}
      transition={{ type: 'spring', stiffness: 520, damping: 28 }}
      onClick={(e) => { if (!rest.disabled) { haptic(h); onClick?.(e) } }}
      className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50 ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
})

/** Number that counts to its new value. */
function AnimatedNumber({ value, currency, hidden }) {
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState(formatCurrency(0, currency))
  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(formatCurrency(v, currency)),
    })
    return () => controls.stop()
  }, [value, currency, mv])
  return <span aria-label={hidden ? 'Balance hidden' : display}>{hidden ? '••••••' : display}</span>
}

function StatusBadge({ status }) {
  const paid = status === 'Paid'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
      paid ? 'bg-emerald-800 text-lime-300' : 'bg-lime-200/70 text-emerald-900 border border-lime-400/50'
    }`}>
      <span className="relative flex w-2 h-2">
        {!paid && <span className="absolute inline-flex w-full h-full rounded-full bg-lime-500 opacity-70 animate-ping" />}
        <span className={`relative inline-flex w-2 h-2 rounded-full ${paid ? 'bg-lime-400' : 'bg-lime-600'}`} />
      </span>
      {paid ? 'Released' : 'Awaiting payment'}
    </span>
  )
}

function Segmented({ options, value, onChange, id }) {
  return (
    <div className="relative inline-flex p-1 rounded-2xl bg-white/80 border border-emerald-200/70" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => { if (o.value !== value) { haptic('selection'); onChange(o.value) } }}
          className={`relative px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${value === o.value ? 'text-white' : 'text-emerald-800 hover:text-emerald-950'}`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-xl bg-emerald-800" />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

function Skeleton({ className = '' }) {
  return <div className={`glass-mint animate-pulse ${className}`} />
}

/** Right-hand drawer. Swipe right or press Esc to dismiss. */
function Drawer({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-emerald-950/40 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true"
            className="w-[88%] max-w-sm glass-mint h-full p-6 shadow-2xl flex flex-col justify-between"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={spring}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0, right: 0.5 }}
            onDragEnd={(_, info) => { if (info.offset.x > 100 || info.velocity.x > 500) { haptic('light'); onClose() } }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ToastStack({ toasts }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id} layout
            initial={{ opacity: 0, y: -24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.92 }} transition={spring}
            className="glass-mint-dark flex items-center gap-2.5 pl-3 pr-5 py-2.5 rounded-full shadow-2xl text-white text-xs font-semibold border border-lime-400/40"
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${t.type === 'error' ? 'bg-rose-500' : 'bg-lime-400'}`}>
              {t.type === 'error' ? <X className="w-3.5 h-3.5 text-white" /> : <Check className="w-3.5 h-3.5 text-emerald-950" />}
            </span>
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Revenue chart — draws itself, scrubs with haptic ticks
──────────────────────────────────────────────────────────────────────────── */

function RevenueChart({ data, currency }) {
  const [active, setActive] = useState(null)
  const ref = useRef(null)
  const last = useRef(-1)
  const max = Math.max(...data.map((p) => p.amount), 1)
  const pts = data.map((p, i) => ({ ...p, x: (i / 11) * 300, y: 100 - (p.amount / max) * 78 }))

  const line = pts.reduce((acc, p, i, a) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = a[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
  }, '')
  const area = `${line} L 300 120 L 0 120 Z`

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect()
    const i = Math.max(0, Math.min(11, Math.round(((e.clientX - r.left) / r.width) * 11)))
    if (i !== last.current) { last.current = i; setActive(i); haptic('selection') }
  }
  const onLeave = () => { last.current = -1; setActive(null) }
  const a = active !== null ? pts[active] : null

  return (
    <div>
      <div
        ref={ref} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={onLeave}
        className="relative h-44 mt-2 touch-pan-y select-none cursor-crosshair"
      >
        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A3E635" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#A3E635" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[30, 60, 90].map((y) => (
            <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#064E3B" strokeOpacity="0.07" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
          <motion.path key={`a-${currency}`} d={area} fill="url(#chartGradient)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.7 }} />
          <motion.path
            key={`l-${currency}`} d={line} fill="none" stroke="#064E3B" strokeWidth="3" strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        <AnimatePresence>
          {a && (
            <>
              <motion.div
                key="guide" className="absolute top-0 bottom-0 w-px bg-emerald-800/30 pointer-events-none"
                style={{ left: `${(a.x / 300) * 100}%` }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              />
              <motion.div
                key="dot" className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full bg-lime-400 border-[3px] border-emerald-950 shadow-lg pointer-events-none"
                animate={{ left: `${(a.x / 300) * 100}%`, top: `${(a.y / 120) * 100}%`, opacity: 1, scale: 1 }}
                initial={{ opacity: 0, scale: 0.4 }} exit={{ opacity: 0, scale: 0.4 }} transition={{ type: 'spring', stiffness: 600, damping: 40 }}
              />
              <motion.div
                key="tip" className="absolute top-0 -translate-x-1/2 -translate-y-full px-3 py-1.5 bg-emerald-950 text-white text-[11px] font-mono rounded-xl shadow-xl pointer-events-none whitespace-nowrap"
                style={{ left: `${Math.min(88, Math.max(12, (a.x / 300) * 100))}%` }}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                {a.month}: {formatCurrency(a.amount, currency)}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between text-[10px] text-emerald-700 font-mono pt-2 mt-3 border-t border-emerald-200/50">
        {MONTHS.map((m, i) => (
          <span key={m} className={active === i ? 'text-emerald-950 font-bold' : ''}>{m}</span>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Project card
──────────────────────────────────────────────────────────────────────────── */

function ProjectCard({ item, copied, onShare, onCopy, onDelete }) {
  const paid = item.status === 'Paid'
  return (
    <motion.div
      layout variants={itemVariants} initial="hidden" animate="show" exit="exit"
      whileHover={{ y: -2 }}
      className="p-5 sm:p-6 glass-mint rounded-[32px] shadow-xs space-y-4 hover:border-emerald-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-lime-300/60 text-emerald-950 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-200">
            {initials(item.clientName, 'CL')}
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-emerald-950 tracking-tight truncate">{item.title}</h4>
            <p className="text-xs text-emerald-700 mt-0.5 truncate">
              {item.clientName}{item.clientEmail ? ` · ${item.clientEmail}` : ''} · {item.files?.length || 0} file{(item.files?.length || 0) === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-black text-base text-emerald-950 font-mono-data">{formatCurrency(item.grossAmount, item.currency || 'INR')}</div>
          <div className="mt-1"><StatusBadge status={item.status} /></div>
        </div>
      </div>

      <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${paid ? 'bg-lime-500' : 'bg-lime-400'}`}
          initial={{ width: 0 }} animate={{ width: paid ? '100%' : '40%' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </div>

      <div className="flex items-center justify-end gap-2 text-xs">
        <Press onClick={() => onShare(item)} className="p-2 bg-white/90 hover:bg-white rounded-xl text-emerald-800" title="Share escrow link" aria-label="Share escrow link">
          <Share2 className="w-4 h-4" />
        </Press>
        <Press onClick={() => onCopy(item.id)} className="px-3 py-2 bg-white/90 hover:bg-white rounded-xl text-emerald-800 font-bold flex items-center gap-1.5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={copied ? 'ok' : 'cp'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.12 }}>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </motion.span>
          </AnimatePresence>
          {copied ? 'Copied' : 'Copy link'}
        </Press>
        <Link href={`/d/${item.id}`} target="_blank" onClick={() => haptic('light')} className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl flex items-center gap-1 transition-colors">
          Open portal <ChevronRight className="w-3.5 h-3.5 text-lime-400" />
        </Link>
        {onDelete && (
          <Press haptic="warning" onClick={() => onDelete(item)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl" title="Delete project" aria-label="Delete project">
            <Trash2 className="w-4 h-4" />
          </Press>
        )}
      </div>
    </motion.div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Chat thread (revisions)
──────────────────────────────────────────────────────────────────────────── */

function ChatThread({ delivery, onBack, onSend }) {
  const [text, setText] = useState('')
  const bottom = useRef(null)
  const messages = delivery.messages || []

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const send = () => {
    if (!text.trim()) return
    onSend(delivery.id, text.trim())
    setText('')
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-emerald-950/40 backdrop-blur-md flex flex-col p-3 sm:p-8"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="max-w-4xl w-full mx-auto glass-mint rounded-[36px] flex-1 flex flex-col overflow-hidden shadow-2xl"
        initial={{ y: 40, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 40, scale: 0.97, opacity: 0 }} transition={spring}
      >
        <div className="p-5 sm:p-6 border-b border-emerald-200/50 flex items-center justify-between bg-white/70 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Press onClick={onBack} className="p-2 bg-white/90 hover:bg-white rounded-xl text-emerald-800 shrink-0" aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </Press>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm text-emerald-950 truncate">{delivery.clientName}</h3>
              <p className="text-xs text-emerald-700 truncate">{delivery.title} · {formatCurrency(delivery.grossAmount, delivery.currency || 'INR')}</p>
            </div>
          </div>
          <Link href={`/d/${delivery.id}`} target="_blank" className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-emerald-900 transition shrink-0">
            Portal <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3 bg-emerald-50/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-emerald-700">
              <MessageSquare className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-900">No revision notes yet</p>
              <p className="text-xs">Messages from {delivery.clientName} will show up here.</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const mine = m.sender === 'creator'
              return (
                <motion.div
                  key={`${m.time}-${idx}`}
                  initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ ...softSpring, delay: Math.min(idx * 0.03, 0.3) }}
                  className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                >
                  <div className={`px-4 py-3 text-sm rounded-2xl max-w-[80%] sm:max-w-md ${
                    mine ? 'bg-emerald-800 text-white rounded-br-md shadow-md' : 'bg-white text-emerald-950 rounded-bl-md border border-emerald-200 shadow-xs'
                  }`}>
                    <p className="leading-relaxed break-words">{m.text}</p>
                  </div>
                  <span className="text-[10px] text-emerald-600 mt-1 font-mono">
                    {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              )
            })
          )}
          <div ref={bottom} />
        </div>

        <div className="p-4 bg-white/80 border-t border-emerald-200/50 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs [scrollbar-width:none]">
            {['Working on this draft ✍️', 'Uploaded revised files 📁', 'Revision completed ✅'].map((pill) => (
              <Press key={pill} haptic="selection" onClick={() => setText(pill)} className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 font-semibold rounded-full shrink-0 border border-emerald-200 shadow-xs">
                {pill}
              </Press>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Reply to client…"
              className="flex-1 bg-white px-4 py-3 rounded-2xl text-sm border border-emerald-200 focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-300/30 transition"
            />
            <Press haptic="medium" disabled={!text.trim()} onClick={send} className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white text-sm font-bold rounded-2xl flex items-center gap-1.5 shrink-0">
              <Send className="w-4 h-4 text-lime-400" /> Send
            </Press>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Request-payment wizard (state lives here so a draft survives closing)
──────────────────────────────────────────────────────────────────────────── */

const slide = {
  enter: (d) => ({ x: d > 0 ? 36 : -36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d) => ({ x: d > 0 ? -36 : 36, opacity: 0 }),
}

const inputCls = 'w-full px-4 py-3.5 bg-white/90 border border-emerald-200 rounded-2xl text-sm font-medium text-emerald-950 placeholder:text-emerald-700/50 focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-300/30 transition'

function Wizard({ open, onClose, user, toast }) {
  const [step, setStep] = useState(1)
  const [dir, setDir] = useState(1)
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState({}) // index -> 0..100
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [expiry, setExpiry] = useState('7')

  const go = (n) => { setDir(n > step ? 1 : -1); setStep(n) }
  const num = Number(amount) || 0
  const fee = num > 0 ? Math.max(Math.round(num * FEE_RATE), 1) : 0
  const payout = Math.max(num - fee, 0)
  const overall = files.length
    ? Math.round(files.reduce((a, _, i) => a + (progress[i] || 0), 0) / files.length)
    : 0

  const canNext = step === 1 ? files.length > 0
    : step === 2 ? isEmail(clientEmail) && title.trim().length > 0
    : step === 3 ? num > 0 : true

  const addFiles = (list) => {
    const picked = Array.from(list || [])
    const ok = picked.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024)
    if (ok.length < picked.length) { haptic('error'); toast(`Files over ${MAX_FILE_MB} MB were skipped`, 'error') }
    if (ok.length) { haptic('medium'); setFiles((p) => [...p, ...ok]) }
  }

  const reset = () => {
    setStep(1); setDir(1); setFiles([]); setProgress({}); setTitle(''); setClientName('')
    setClientEmail(''); setClientMessage(''); setAmount(''); setExpiry('7')
  }

  const deploy = async () => {
    if (!user || !canNext) return
    setUploading(true)
    try {
      const manifest = []
      for (let i = 0; i < files.length; i++) {
        manifest.push(await uploadFileToCloudinary(files[i], (p) => setProgress((s) => ({ ...s, [i]: p }))))
        setProgress((s) => ({ ...s, [i]: 100 }))
      }
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (expiry === 'never' ? 3650 : parseInt(expiry, 10)))

      const ref = await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email,
        title: title.trim(),
        clientName: clientName.trim() || clientEmail.split('@')[0] || 'Client',
        clientEmail: clientEmail.trim(),
        clientMessage: clientMessage.trim(),
        grossAmount: num,
        currency,
        platformFee: fee,
        creatorPayout: payout,
        watermarkText: WATERMARK_TEXT,
        status: 'Awaiting Payment',
        files: manifest,
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        messages: [],
        createdAt: serverTimestamp(),
      })

      fetch('/api/send-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: clientEmail.trim(),
          clientName: clientName.trim() || 'Client',
          creatorName: user.displayName || user.email?.split('@')[0] || 'Creator',
          projectTitle: title.trim(),
          amount: num,
          deliveryUrl: `${window.location.origin}/d/${ref.id}`,
        }),
      }).catch((e) => console.error('Async email error:', e))

      haptic('success')
      toast('Escrow vault is live', 'success')
      reset()
      onClose()
    } catch (err) {
      haptic('error')
      toast(err.message || 'Could not create the vault', 'error')
    } finally {
      setUploading(false)
      setProgress({})
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-emerald-950/40 backdrop-blur-md flex flex-col p-3 sm:p-8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label="Request a payment"
            className="max-w-2xl w-full mx-auto glass-mint rounded-[40px] flex-1 p-6 sm:p-8 shadow-2xl flex flex-col justify-between overflow-y-auto"
            initial={{ y: 60, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 60, scale: 0.97, opacity: 0 }} transition={spring}
          >
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-700 font-mono">Step {step} of 4</span>
                  <h3 className="text-2xl font-black text-emerald-950 tracking-tight mt-0.5">Request a payment</h3>
                </div>
                <Press onClick={onClose} disabled={uploading} className="w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-emerald-800 disabled:opacity-40" aria-label="Close">
                  <X className="w-5 h-5" />
                </Press>
              </div>

              <div className="grid grid-cols-4 gap-2" aria-hidden>
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-1.5 rounded-full bg-emerald-200/60 overflow-hidden">
                    <motion.div className="h-full bg-emerald-800 rounded-full" initial={false} animate={{ width: step >= n ? '100%' : '0%' }} transition={{ duration: 0.35, ease: 'easeOut' }} />
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2, ease: 'easeOut' }} className="space-y-5">

                  {step === 1 && (
                    <>
                      <label className="text-sm font-bold text-emerald-900 block">Attach deliverables</label>
                      <motion.div
                        animate={{ scale: dragging ? 1.015 : 1 }} transition={spring}
                        onDragOver={(e) => { e.preventDefault(); if (!dragging) { setDragging(true); haptic('selection') } }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
                        className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-colors ${dragging ? 'border-emerald-800 bg-lime-100/70' : 'border-emerald-300/80 bg-white/60 hover:border-lime-500'}`}
                      >
                        <motion.div animate={{ y: dragging ? -6 : [0, -4, 0] }} transition={dragging ? spring : { repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}>
                          <UploadCloud className="w-10 h-10 text-emerald-800 mx-auto mb-3" />
                        </motion.div>
                        <span className="text-sm font-bold text-emerald-950 block">Drop ZIPs, videos, code or PDFs here</span>
                        <span className="text-xs text-emerald-700 block mt-1">Up to {MAX_FILE_MB} MB per file</span>
                        <label className="mt-4 inline-block px-5 py-2.5 bg-emerald-800 text-white text-xs font-bold rounded-2xl cursor-pointer shadow-md transition hover:scale-105 active:scale-95">
                          Browse files
                          <input type="file" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} className="hidden" />
                        </label>
                      </motion.div>

                      <motion.div layout className="space-y-2">
                        <AnimatePresence initial={false}>
                          {files.map((f, i) => (
                            <motion.div
                              key={`${f.name}-${f.size}-${i}`} layout
                              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24, height: 0, marginTop: 0 }} transition={softSpring}
                              className="flex items-center justify-between gap-3 bg-white/85 px-4 py-2.5 rounded-2xl border border-emerald-200/80"
                            >
                              <span className="flex items-center gap-2.5 min-w-0 text-sm font-medium text-emerald-950">
                                {f.type.startsWith('video/') ? <Film className="w-4 h-4 text-blue-600 shrink-0" />
                                  : f.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                                  : <File className="w-4 h-4 text-emerald-700 shrink-0" />}
                                <span className="truncate">{f.name}</span>
                                <span className="text-[11px] text-emerald-600 font-mono shrink-0">{(f.size / 1048576).toFixed(1)} MB</span>
                              </span>
                              <Press haptic="light" onClick={() => setFiles((p) => p.filter((_, x) => x !== i))} className="text-emerald-500 hover:text-rose-600 p-1" aria-label={`Remove ${f.name}`}>
                                <X className="w-4 h-4" />
                              </Press>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div>
                        <label className="text-sm font-bold text-emerald-900 block mb-1.5">Client email *</label>
                        <input type="email" placeholder="client@company.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputCls} />
                        {clientEmail && !isEmail(clientEmail) && <p className="text-xs text-rose-600 mt-1.5">Enter a valid email address.</p>}
                      </div>
                      <div>
                        <label className="text-sm font-bold text-emerald-900 block mb-1.5">Client name</label>
                        <input type="text" placeholder="Optional — we use the email name if blank" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-emerald-900 block mb-1.5">Project name *</label>
                        <input type="text" placeholder="e.g. Website redesign & source code" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-emerald-900 block mb-1.5">Handover message</label>
                        <textarea rows={3} placeholder="Final master draft attached. Unlocks when escrow is released." value={clientMessage} onChange={(e) => setClientMessage(e.target.value)} className={inputCls} />
                      </div>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <div>
                        <label className="text-sm font-bold text-emerald-900 block mb-1.5">Escrow amount *</label>
                        <div className="flex bg-white/90 border border-emerald-200 rounded-2xl overflow-hidden focus-within:border-lime-500 focus-within:ring-4 focus-within:ring-lime-300/30 transition">
                          <select value={currency} onChange={(e) => { haptic('selection'); setCurrency(e.target.value) }} className="px-4 py-3.5 bg-transparent text-sm font-bold text-emerald-800 focus:outline-none border-r border-emerald-200 cursor-pointer">
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                          </select>
                          <input type="number" inputMode="decimal" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3.5 bg-transparent text-lg font-bold text-emerald-950 focus:outline-none font-mono" />
                        </div>
                        <AnimatePresence>
                          {num > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <div className="mt-3 p-4 bg-white/80 border border-emerald-200/80 rounded-2xl text-xs space-y-1.5">
                                <div className="flex justify-between text-emerald-800"><span>Platform fee ({FEE_RATE * 100}%)</span><span className="font-mono">− {formatCurrency(fee, currency)}</span></div>
                                <div className="flex justify-between font-bold text-emerald-950 text-sm pt-1.5 border-t border-emerald-200/70"><span>You receive</span><span className="font-mono">{formatCurrency(payout, currency)}</span></div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-emerald-900 block mb-1.5">Link expiry</label>
                        <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                          {['7', '14', '30', 'never'].map((opt) => (
                            <Press key={opt} type="button" haptic="selection" onClick={() => setExpiry(opt)}
                              className={`py-3 rounded-2xl border transition-colors ${expiry === opt ? 'bg-lime-200/70 border-emerald-800 text-emerald-950 font-bold' : 'border-emerald-200 text-emerald-800 bg-white/50'}`}>
                              {opt === 'never' ? 'Never' : `${opt} days`}
                            </Press>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {step === 4 && (
                    <>
                      <div className="p-6 bg-white/90 rounded-3xl space-y-3 text-sm border border-emerald-200/80">
                        <div className="flex justify-between gap-3 font-extrabold text-emerald-950 border-b border-emerald-200 pb-3">
                          <span className="truncate">{title}</span>
                          <span className="font-mono shrink-0">{formatCurrency(num, currency)}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-emerald-800 text-xs"><span className="truncate">Client: {clientEmail}</span><span className="shrink-0">{files.length} file{files.length === 1 ? '' : 's'}</span></div>
                        <div className="flex justify-between text-emerald-800 text-xs"><span>You receive after fees</span><span className="font-mono font-bold">{formatCurrency(payout, currency)}</span></div>
                      </div>
                      <div className="p-4 bg-lime-100 border border-lime-300 rounded-2xl flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-900 leading-relaxed font-semibold">
                          Your client pays into escrow to unlock the original files. They see a watermarked preview until then.
                        </p>
                      </div>
                    </>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            <div className="pt-6 mt-6 border-t border-emerald-200/60">
              {uploading ? (
                <div className="p-4 bg-emerald-800 text-white rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Uploading {files.length} file{files.length === 1 ? '' : 's'}…</span>
                    <span className="font-mono">{overall}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-emerald-900 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-lime-400 rounded-full" animate={{ width: `${overall}%` }} transition={{ ease: 'easeOut', duration: 0.25 }} />
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  {step > 1 && (
                    <Press onClick={() => go(step - 1)} className="w-1/3 py-4 border border-emerald-200 bg-white/70 text-emerald-800 font-bold text-sm rounded-2xl">Back</Press>
                  )}
                  <Press
                    haptic={step === 4 ? 'heavy' : 'medium'} disabled={!canNext}
                    onClick={() => (step === 4 ? deploy() : go(step + 1))}
                    className={`${step > 1 ? 'w-2/3' : 'w-full'} py-4 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white font-bold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2`}
                  >
                    {step === 4 ? <><Lock className="w-4 h-4 text-lime-400" /> Create secure payment</>
                      : <>{['', 'Next: project details', 'Next: pricing', 'Review'][step]} <ArrowRight className="w-4 h-4 text-lime-400" /></>}
                  </Press>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Command palette  (⌘K / Ctrl+K)
──────────────────────────────────────────────────────────────────────────── */

function CommandPalette({ open, onClose, items }) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef(null)
  const results = useMemo(() => items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())), [items, q])

  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 60) } }, [open])
  useEffect(() => setIdx(0), [q])

  const run = (item) => { haptic('medium'); onClose(); item.run() }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); haptic('selection') }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); haptic('selection') }
    else if (e.key === 'Enter' && results[idx]) run(results[idx])
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] bg-emerald-950/40 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-label="Command palette"
            className="w-full max-w-lg glass-mint rounded-[28px] shadow-2xl overflow-hidden"
            initial={{ y: -16, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -10, scale: 0.97, opacity: 0 }} transition={spring}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-200/60">
              <Search className="w-4 h-4 text-emerald-700" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search projects or run a command…"
                className="flex-1 bg-transparent text-sm font-medium text-emerald-950 placeholder:text-emerald-700/50 focus:outline-none" />
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/80 text-emerald-700 border border-emerald-200">esc</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && <p className="p-6 text-center text-xs text-emerald-700">Nothing matches “{q}”.</p>}
              {results.map((r, i) => {
                const Icon = r.icon
                return (
                  <button key={r.id} onMouseEnter={() => setIdx(i)} onClick={() => run(r)}
                    className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left text-sm font-semibold text-emerald-950">
                    {i === idx && <motion.span layoutId="palette-hl" transition={{ type: 'spring', stiffness: 600, damping: 40 }} className="absolute inset-0 rounded-2xl bg-white/90 border border-emerald-200" />}
                    <span className="relative z-10 w-8 h-8 rounded-xl bg-lime-200/70 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-emerald-800" /></span>
                    <span className="relative z-10 flex-1 truncate">{r.label}</span>
                    {r.hint && <span className="relative z-10 text-[11px] text-emerald-600 font-mono">{r.hint}</span>}
                    {i === idx && <CornerDownLeft className="relative z-10 w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Dashboard
──────────────────────────────────────────────────────────────────────────── */

const NAV = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  { id: 'revisions', label: 'Revisions', icon: MessageSquare },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
]

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [deliveries, setDeliveries] = useState([])
  const [dataReady, setDataReady] = useState(false)

  const [tab, setTab] = useState('home')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [currency, setCurrency] = useState('INR')
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [copiedId, setCopiedId] = useState(null)

  const [toasts, setToasts] = useState([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [threadId, setThreadId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [hapticsEnabled, setHapticsState] = useState(true)

  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-2), { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
  }, [])

  /* haptics preference */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('paydrop:haptics')
      if (saved !== null) { const on = saved === '1'; setHapticsState(on); setHapticsEnabled(on) }
    } catch { /* ignore */ }
  }, [])
  const toggleHaptics = () => {
    const next = !hapticsEnabled
    setHapticsState(next); setHapticsEnabled(next)
    try { localStorage.setItem('paydrop:haptics', next ? '1' : '0') } catch { /* ignore */ }
    if (next) haptic('success')
  }

  /* auth + realtime data (single subscription, no resubscribe on thread change) */
  useEffect(() => {
    let unsubData = null
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u); setAuthReady(true)
      unsubData?.(); unsubData = null
      if (u) {
        const q = query(collection(db, 'deliveries'), where('userId', '==', u.uid))
        unsubData = onSnapshot(q, (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setDeliveries(docs); setDataReady(true)
        }, () => { setDataReady(true); toast('Could not load your projects', 'error') })
      } else { setDeliveries([]); setDataReady(false) }
    })
    return () => { unsubAuth(); unsubData?.() }
  }, [toast])

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); return }
      if (e.key === 'Escape') { setPaletteOpen(false); setAiOpen(false); setProfileOpen(false); setThreadId(null); setDeleteTarget(null) }
      const tag = e.target?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); setWizardOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* actions */
  const copyLink = async (id) => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/d/${id}`) } catch { toast('Copy failed', 'error'); return }
    setCopiedId(id); toast('Escrow link copied'); setTimeout(() => setCopiedId(null), 2200)
  }
  const shareProject = (item) => {
    const url = `${window.location.origin}/d/${item.id}`
    if (navigator.share) {
      navigator.share({ title: `PayDrop escrow: ${item.title}`, text: `Review protected deliverables for ${item.title}`, url }).catch(() => copyLink(item.id))
    } else copyLink(item.id)
  }
  const confirmDelete = async () => {
    const target = deleteTarget
    setDeleteTarget(null)
    try { await deleteDoc(doc(db, 'deliveries', target.id)); haptic('success'); toast('Project deleted') }
    catch { haptic('error'); toast('Could not delete the project', 'error') }
  }
  const sendReply = async (id, text) => {
    try {
      await updateDoc(doc(db, 'deliveries', id), { messages: arrayUnion({ sender: 'creator', text, time: new Date().toISOString() }) })
      haptic('success')
    } catch { haptic('error'); toast('Reply failed to send', 'error') }
  }
  const handleLogout = async () => {
    try { await signOut(auth); toast('Signed out') } catch { toast('Sign out failed', 'error') }
  }
  const switchTab = (id) => { if (id !== tab) { haptic('selection'); setTab(id) } }

  /* derived data */
  const stats = useMemo(() => {
    const inCur = deliveries.filter((d) => (d.currency || 'INR') === currency)
    const net = (d) => Number(d.creatorPayout) || Number(d.grossAmount) || 0
    const paid = inCur.filter((d) => d.status === 'Paid')
    const pending = inCur.filter((d) => d.status !== 'Paid')
    const year = new Date().getFullYear()
    const monthly = MONTHS.map((month, i) => ({
      month,
      amount: paid
        .filter((d) => {
          const dt = d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000) : new Date()
          return dt.getMonth() === i && dt.getFullYear() === year
        })
        .reduce((a, c) => a + (Number(c.grossAmount) || 0), 0),
    }))
    return {
      year, monthly,
      released: paid.reduce((a, c) => a + net(c), 0),
      gross: paid.reduce((a, c) => a + (Number(c.grossAmount) || 0), 0),
      fees: paid.reduce((a, c) => a + (Number(c.platformFee) || 0), 0),
      awaiting: pending.reduce((a, c) => a + (Number(c.grossAmount) || 0), 0),
      paidCount: paid.length, pendingCount: pending.length, paid,
      bestMonth: monthly.reduce((b, m) => (m.amount > b.amount ? m : b), { month: '', amount: 0 }),
    }
  }, [deliveries, currency])

  const unread = useMemo(() => deliveries.filter((d) => d.messages?.length && d.messages[d.messages.length - 1].sender === 'client'), [deliveries])
  const filtered = useMemo(() => deliveries.filter((d) => {
    const q = search.toLowerCase()
    const match = d.title?.toLowerCase().includes(q) || d.clientName?.toLowerCase().includes(q)
    const status = filter === 'all' || (filter === 'paid' ? d.status === 'Paid' : d.status !== 'Paid')
    return match && status
  }), [deliveries, search, filter])
  const activeThread = deliveries.find((d) => d.id === threadId)

  const paletteItems = useMemo(() => [
    { id: 'new', label: 'Request a payment', icon: Plus, hint: 'N', run: () => setWizardOpen(true) },
    ...NAV.map((n) => ({ id: `go-${n.id}`, label: `Go to ${n.label}`, icon: n.icon, run: () => setTab(n.id) })),
    { id: 'haptics', label: hapticsEnabled ? 'Turn haptics off' : 'Turn haptics on', icon: Vibrate, run: toggleHaptics },
    { id: 'ai', label: 'Open insights', icon: Sparkles, run: () => setAiOpen(true) },
    ...deliveries.slice(0, 20).map((d) => ({ id: `p-${d.id}`, label: d.title, icon: Briefcase, hint: d.clientName, run: () => window.open(`/d/${d.id}`, '_blank') })),
    { id: 'out', label: 'Sign out', icon: LogOut, run: handleLogout },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [deliveries, hapticsEnabled])

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'there'

  /* auth gates */
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div className="w-12 h-12 rounded-2xl bg-lime-400 text-emerald-950 font-black text-2xl flex items-center justify-center shadow-lg"
          animate={{ scale: [1, 1.12, 1], rotate: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>P</motion.div>
      </div>
    )
  }
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-sm text-emerald-800 font-semibold">Your session has expired. Sign in again to continue.</p>
        <Link href="/" className="px-6 py-3 bg-emerald-800 text-white text-sm font-bold rounded-2xl">Back to sign in</Link>
      </div>
    )
  }

  const NavButton = ({ n }) => {
    const active = tab === n.id
    const Icon = n.icon
    const badge = n.id === 'projects' ? deliveries.length : n.id === 'revisions' ? unread.length : 0
    return (
      <button onClick={() => switchTab(n.id)} aria-current={active ? 'page' : undefined}
        className={`relative w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-colors ${active ? 'text-white' : 'text-emerald-800 hover:text-emerald-950 hover:bg-white/50'}`}>
        {active && <motion.span layoutId="sidebar-pill" transition={spring} className="absolute inset-0 rounded-2xl bg-emerald-800 shadow-md" />}
        <span className="relative z-10 flex items-center gap-3"><Icon className={`w-4 h-4 ${active ? 'text-lime-400' : ''}`} />{n.label}</span>
        {badge > 0 && (
          <span className={`relative z-10 text-[10px] px-2 py-0.5 rounded-full font-mono font-black ${n.id === 'revisions' ? 'bg-rose-500 text-white' : active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>{badge}</span>
        )}
      </button>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen text-slate-900 font-sans flex antialiased pb-32 lg:pb-8 relative selection:bg-lime-300 selection:text-emerald-950">
        <ToastStack toasts={toasts} />

        {/* SIDEBAR */}
        <aside className="hidden lg:flex w-64 glass-mint border-r border-emerald-200/60 flex-col justify-between p-6 sticky top-0 h-screen z-30 select-none shrink-0">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={() => switchTab('home')} className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-2xl bg-lime-400 text-emerald-950 font-black text-xl flex items-center justify-center shadow-md shadow-lime-500/20 transition-transform group-hover:scale-105 group-hover:-rotate-6">P</div>
                <span className="font-black text-2xl tracking-tight text-emerald-950">paydrop</span>
              </button>
              <Press onClick={() => setAiOpen(true)} className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-xs" title="Insights" aria-label="Insights">
                <Sparkles className="w-4 h-4 text-emerald-700" />
              </Press>
            </div>

            <Press haptic="medium" onClick={() => setWizardOpen(true)} className="group w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2">
              <Plus className="w-4 h-4 text-lime-400 transition-transform duration-200 group-hover:rotate-90" /> Request payment
            </Press>

            <button onClick={() => { haptic('light'); setPaletteOpen(true) }} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/60 hover:bg-white/90 border border-emerald-200/70 text-xs text-emerald-700 transition">
              <Search className="w-3.5 h-3.5" /> <span className="flex-1 text-left">Search…</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white text-emerald-700 border border-emerald-200 flex items-center gap-0.5"><Command className="w-2.5 h-2.5" />K</kbd>
            </button>

            <LayoutGroup id="sidebar">
              <nav className="space-y-1">{NAV.map((n) => <NavButton key={n.id} n={n} />)}</nav>
            </LayoutGroup>
          </div>

          <div className="pt-4 border-t border-emerald-200/60 flex items-center justify-between">
            <button onClick={() => { haptic('light'); setProfileOpen(true) }} className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition">
              <div className="w-9 h-9 rounded-full bg-lime-200 text-emerald-950 text-xs font-bold flex items-center justify-center shrink-0 border border-white shadow-xs">{initials(user.displayName || user.email)}</div>
              <div className="truncate">
                <div className="text-xs font-bold text-emerald-950 truncate">{displayName}</div>
                <div className="text-[10px] text-emerald-700 truncate">{user.email}</div>
              </div>
            </button>
            <Press haptic="warning" onClick={handleLogout} className="text-emerald-600 hover:text-rose-600 p-1.5" title="Sign out" aria-label="Sign out"><LogOut className="w-4 h-4" /></Press>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="px-6 sm:px-10 pt-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-9 h-9 rounded-2xl bg-lime-400 text-emerald-950 font-black text-xl flex items-center justify-center shadow-sm">P</div>
              <span className="font-black text-2xl tracking-tight text-emerald-950">paydrop</span>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-2xl font-extrabold text-emerald-950 tracking-tight">{greeting()}, {displayName.split(' ')[0]}</h1>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                {unread.length > 0 ? `${unread.length} revision request${unread.length === 1 ? '' : 's'} waiting for you` : 'You’re all caught up'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Press onClick={() => setPaletteOpen(true)} className="lg:hidden w-10 h-10 rounded-full glass-mint flex items-center justify-center" aria-label="Search"><Search className="w-4 h-4 text-emerald-700" /></Press>
              <Press onClick={() => setAiOpen(true)} className="w-10 h-10 rounded-full glass-mint flex items-center justify-center" title="Insights" aria-label="Insights"><Sparkles className="w-4 h-4 text-emerald-700" /></Press>
              <Press onClick={() => setProfileOpen(true)} className="w-10 h-10 rounded-full bg-lime-200 text-emerald-950 font-bold text-xs flex items-center justify-center border border-white shadow-xs" aria-label="Account">{initials(user.displayName || user.email)}</Press>
            </div>
          </header>

          <main className="flex-1 max-w-2xl lg:max-w-4xl w-full mx-auto p-4 sm:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: 'easeOut' }} className="space-y-6">

                {/* HOME */}
                {tab === 'home' && (
                  <>
                    <div className="glass-mint-dark rounded-[36px] p-7 sm:p-8 text-white relative overflow-hidden shadow-2xl animate-pulse-glow">
                      <motion.div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-700 rounded-full blur-2xl pointer-events-none opacity-40"
                        animate={{ x: [0, -24, 0], y: [0, 18, 0] }} transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }} />
                      <motion.div className="absolute -left-10 -bottom-16 w-52 h-52 bg-lime-400 rounded-full blur-3xl pointer-events-none opacity-10"
                        animate={{ x: [0, 20, 0], y: [0, -14, 0] }} transition={{ repeat: Infinity, duration: 11, ease: 'easeInOut' }} />

                      <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium text-emerald-200/80">
                            <span>Released earnings</span>
                            <Press haptic="selection" onClick={() => setBalanceVisible((v) => !v)} className="p-1 text-lime-300 hover:text-white" aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}>
                              {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Press>
                          </div>
                          <Segmented id="hero-cur" value={currency} onChange={setCurrency} options={[{ value: 'INR', label: '₹ INR' }, { value: 'USD', label: '$ USD' }]} />
                        </div>

                        <div>
                          <div className="text-4xl sm:text-5xl font-black font-mono-data tracking-tight text-white">
                            <AnimatedNumber value={stats.released} currency={currency} hidden={!balanceVisible} />
                          </div>
                          <p className="text-xs text-emerald-200/70 mt-1">After the {FEE_RATE * 100}% platform fee</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-1">
                          {[
                            { label: 'Awaiting payment', value: balanceVisible ? formatCurrency(stats.awaiting, currency) : '••••', icon: Clock },
                            { label: 'Paid projects', value: stats.paidCount, icon: CheckCircle2 },
                            { label: 'Open revisions', value: unread.length, icon: MessageSquare },
                          ].map((s) => (
                            <div key={s.label} className="rounded-2xl bg-white/10 backdrop-blur-md px-3.5 py-3">
                              <s.icon className="w-3.5 h-3.5 text-lime-400 mb-1.5" />
                              <div className="text-sm font-bold font-mono-data truncate">{s.value}</div>
                              <div className="text-[10px] text-emerald-200/70 leading-tight mt-0.5">{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="glass-mint rounded-[36px] p-6 sm:p-7 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-800" />
                            <h3 className="text-lg font-bold text-emerald-950 tracking-tight">Revenue in {stats.year}</h3>
                          </div>
                          <span className="text-xs text-emerald-700 font-medium">Paid projects by month, drag across to inspect</span>
                        </div>
                      </div>
                      {!dataReady ? <Skeleton className="h-44 mt-4 rounded-3xl" /> : <RevenueChart data={stats.monthly} currency={currency} />}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-emerald-950 tracking-tight">Recent projects</h3>
                          <p className="text-xs text-emerald-700">Payments protected in escrow</p>
                        </div>
                        <button onClick={() => switchTab('projects')} className="text-xs font-bold text-emerald-800 hover:underline">View all</button>
                      </div>
                      {!dataReady ? (
                        <div className="space-y-3"><Skeleton className="h-40 rounded-[32px]" /><Skeleton className="h-40 rounded-[32px]" /></div>
                      ) : deliveries.length === 0 ? (
                        <EmptyState onCreate={() => setWizardOpen(true)} />
                      ) : (
                        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                          {deliveries.slice(0, 4).map((item) => (
                            <ProjectCard key={item.id} item={item} copied={copiedId === item.id} onShare={shareProject} onCopy={copyLink} />
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </>
                )}

                {/* PROJECTS */}
                {tab === 'projects' && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h1 className="text-2xl font-black text-emerald-950 tracking-tight">All projects</h1>
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700" />
                        <input type="text" placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 glass-mint rounded-2xl text-sm focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-300/30 transition" />
                      </div>
                    </div>
                    <Segmented id="proj-filter" value={filter} onChange={setFilter} options={[{ value: 'all', label: `All ${deliveries.length}` }, { value: 'awaiting', label: 'Awaiting' }, { value: 'paid', label: 'Paid' }]} />

                    {!dataReady ? (
                      <div className="space-y-3"><Skeleton className="h-40 rounded-[32px]" /><Skeleton className="h-40 rounded-[32px]" /></div>
                    ) : filtered.length === 0 ? (
                      deliveries.length === 0 ? <EmptyState onCreate={() => setWizardOpen(true)} /> : <div className="p-12 text-center text-sm text-emerald-700 glass-mint rounded-[32px]">No projects match your filters.</div>
                    ) : (
                      <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {filtered.map((item) => (
                            <ProjectCard key={item.id} item={item} copied={copiedId === item.id} onShare={shareProject} onCopy={copyLink} onDelete={setDeleteTarget} />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </>
                )}

                {/* REVISIONS */}
                {tab === 'revisions' && (
                  <>
                    <h1 className="text-2xl font-black text-emerald-950 tracking-tight">Client revisions</h1>
                    {!dataReady ? <Skeleton className="h-28 rounded-[32px]" /> : deliveries.length === 0 ? (
                      <div className="p-12 text-center text-sm text-emerald-700 glass-mint rounded-[32px]">Revision threads appear once you create a project.</div>
                    ) : (
                      <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                        {deliveries.map((d) => {
                          const last = d.messages?.length ? d.messages[d.messages.length - 1] : null
                          const isNew = last?.sender === 'client'
                          return (
                            <motion.div key={d.id} variants={itemVariants}
                              className={`p-5 sm:p-6 glass-mint rounded-[32px] flex justify-between items-center gap-4 shadow-xs hover:border-emerald-300 transition-colors relative ${isNew ? 'border-rose-300 bg-rose-50/30' : ''}`}>
                              {isNew && <span className="absolute -top-2 left-6 px-3 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-md">New request</span>}
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-emerald-950 truncate">{d.clientName}</h4>
                                  <span className="text-emerald-400">·</span>
                                  <span className="text-xs text-emerald-700 truncate">{d.title}</span>
                                </div>
                                <p className="text-sm text-emerald-800 truncate">{last ? last.text : 'No revision notes yet.'}</p>
                              </div>
                              <Press haptic="medium" onClick={() => setThreadId(d.id)} className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl shrink-0 flex items-center gap-2">
                                Open chat {isNew && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />}
                              </Press>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    )}
                  </>
                )}

                {/* WALLET */}
                {tab === 'wallet' && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <h1 className="text-2xl font-black text-emerald-950 tracking-tight">Wallet & payouts</h1>
                      <Segmented id="wallet-cur" value={currency} onChange={setCurrency} options={[{ value: 'INR', label: '₹ INR' }, { value: 'USD', label: '$ USD' }]} />
                    </div>
                    <div className="p-7 sm:p-8 glass-mint rounded-[36px] space-y-5 shadow-xs">
                      <div>
                        <div className="text-xs text-emerald-700 font-medium">Released to you</div>
                        <div className="text-4xl font-black text-emerald-950 font-mono-data mt-1"><AnimatedNumber value={stats.released} currency={currency} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        {[['Gross paid', stats.gross], ['Platform fees', stats.fees], ['Awaiting payment', stats.awaiting]].map(([l, v]) => (
                          <div key={l} className="p-3.5 bg-white/80 rounded-2xl border border-emerald-200/70">
                            <div className="text-emerald-700">{l}</div>
                            <div className="font-bold font-mono-data text-emerald-950 mt-1 text-sm">{formatCurrency(v, currency)}</div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-emerald-700 leading-relaxed">Funds sit in escrow until your client approves, then they’re released to your bank.</p>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-emerald-950 tracking-tight">Cleared payments</h3>
                      {stats.paid.length === 0 ? (
                        <div className="p-10 text-center text-sm text-emerald-700 glass-mint rounded-[32px]">Paid projects will be listed here.</div>
                      ) : (
                        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2">
                          {stats.paid.map((d) => (
                            <motion.div key={d.id} variants={itemVariants} className="px-5 py-4 glass-mint rounded-3xl flex items-center justify-between gap-3">
                              <div className="min-w-0"><div className="text-sm font-bold text-emerald-950 truncate">{d.title}</div><div className="text-xs text-emerald-700 truncate">{d.clientName}</div></div>
                              <div className="font-bold font-mono-data text-sm text-emerald-950 shrink-0">{formatCurrency(Number(d.creatorPayout) || Number(d.grossAmount) || 0, currency)}</div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </>
                )}

              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* MOBILE FAB */}
        <AnimatePresence>
          {!wizardOpen && !threadId && (
            <motion.button
              key="fab" aria-label="Request payment"
              initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={spring}
              whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.06 }}
              onClick={() => { haptic('medium'); setWizardOpen(true) }}
              className="lg:hidden fixed bottom-28 right-6 sm:bottom-10 sm:right-10 z-40 w-14 h-14 rounded-full bg-emerald-800 text-white flex items-center justify-center shadow-2xl"
            >
              <Plus className="w-7 h-7 text-lime-400" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* MOBILE NAV */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden w-[90%] max-w-md">
          <LayoutGroup id="mobile-nav">
            <div className="glass-mint-dark p-2 rounded-full shadow-2xl flex items-center justify-around border border-lime-400/30">
              {NAV.map((n) => {
                const active = tab === n.id
                const Icon = n.icon
                return (
                  <button key={n.id} onClick={() => switchTab(n.id)} aria-label={n.label} aria-current={active ? 'page' : undefined}
                    className={`relative flex flex-col items-center justify-center py-2 px-4 rounded-full transition-colors ${active ? 'text-white' : 'text-emerald-200/70'}`}>
                    {active && <motion.span layoutId="mobile-pill" transition={spring} className="absolute inset-0 rounded-full bg-white/20 shadow-lg" />}
                    <motion.span animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }} transition={spring} className="relative z-10">
                      <Icon className={`w-5 h-5 ${active ? 'text-lime-400' : 'text-emerald-200/80'}`} />
                    </motion.span>
                    <span className="relative z-10 text-[10px] font-semibold tracking-tight mt-0.5">{n.label}</span>
                    {n.id === 'revisions' && unread.length > 0 && <span className="absolute top-1 right-3 z-10 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                  </button>
                )
              })}
            </div>
          </LayoutGroup>
        </div>

        {/* OVERLAYS */}
        <Wizard open={wizardOpen} onClose={() => setWizardOpen(false)} user={user} toast={toast} />

        <AnimatePresence>
          {activeThread && <ChatThread key={activeThread.id} delivery={activeThread} onBack={() => { haptic('light'); setThreadId(null) }} onSend={sendReply} />}
        </AnimatePresence>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />

        {/* Delete confirmation */}
        <AnimatePresence>
          {deleteTarget && (
            <motion.div className="fixed inset-0 z-[60] bg-emerald-950/50 backdrop-blur-md flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)}>
              <motion.div role="alertdialog" className="w-full max-w-sm glass-mint rounded-[32px] p-6 shadow-2xl space-y-4"
                initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={spring}
                onClick={(e) => e.stopPropagation()}>
                <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-rose-600" /></div>
                <div>
                  <h3 className="text-lg font-black text-emerald-950">Delete this project?</h3>
                  <p className="text-sm text-emerald-800 mt-1 leading-relaxed">“{deleteTarget.title}” and its client portal link will stop working. This can’t be undone.</p>
                </div>
                <div className="flex gap-3">
                  <Press onClick={() => setDeleteTarget(null)} className="flex-1 py-3 border border-emerald-200 bg-white/70 text-emerald-800 font-bold text-sm rounded-2xl">Keep it</Press>
                  <Press haptic="heavy" onClick={confirmDelete} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-2xl">Delete</Press>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insights drawer */}
        <Drawer open={aiOpen} onClose={() => setAiOpen(false)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
              <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-emerald-800" /><span className="font-bold text-sm text-emerald-950">Escrow insights</span></div>
              <Press onClick={() => setAiOpen(false)} className="text-emerald-700 hover:text-emerald-950 p-1" aria-label="Close"><X className="w-4 h-4" /></Press>
            </div>
            {[
              `${stats.paidCount} paid project${stats.paidCount === 1 ? '' : 's'} in ${currency}, ${formatCurrency(stats.released, currency)} released to you.`,
              stats.pendingCount ? `${stats.pendingCount} project${stats.pendingCount === 1 ? ' is' : 's are'} still awaiting payment (${formatCurrency(stats.awaiting, currency)}).` : 'Nothing is waiting on a client payment.',
              unread.length ? `${unread.length} client revision request${unread.length === 1 ? '' : 's'} need a reply.` : 'No unanswered revision requests.',
              stats.bestMonth.amount > 0 ? `${stats.bestMonth.month} is your best month this year at ${formatCurrency(stats.bestMonth.amount, currency)}.` : null,
            ].filter(Boolean).map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ ...softSpring, delay: 0.1 + i * 0.07 }}
                className="p-4 bg-white/90 rounded-2xl text-sm text-emerald-900 leading-relaxed border border-emerald-200/60">{t}</motion.div>
            ))}
          </div>
          <Press onClick={() => setAiOpen(false)} className="w-full py-3 bg-emerald-800 text-white font-bold text-sm rounded-2xl">Close</Press>
        </Drawer>

        {/* Account drawer */}
        <Drawer open={profileOpen} onClose={() => setProfileOpen(false)}>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
              <span className="font-bold text-sm text-emerald-950">Account</span>
              <Press onClick={() => setProfileOpen(false)} className="text-emerald-700 hover:text-emerald-950 p-1" aria-label="Close"><X className="w-4 h-4" /></Press>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-lime-200 text-emerald-950 font-bold flex items-center justify-center text-sm border border-white shadow-xs">{initials(user.displayName || user.email)}</div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-emerald-950 truncate">{displayName}</div>
                <div className="text-[11px] text-emerald-700 font-mono truncate">{user.email}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm font-semibold text-emerald-900">
              <button onClick={toggleHaptics} role="switch" aria-checked={hapticsEnabled} className="w-full p-3.5 bg-white/90 rounded-2xl flex items-center justify-between border border-emerald-200/60">
                <span className="flex items-center gap-2.5"><Vibrate className="w-4 h-4 text-emerald-800" /> Haptic feedback</span>
                <span className={`w-11 h-6 rounded-full p-0.5 flex transition-colors ${hapticsEnabled ? 'bg-emerald-800 justify-end' : 'bg-emerald-200 justify-start'}`}>
                  <motion.span layout transition={spring} className="w-5 h-5 rounded-full bg-white shadow" />
                </span>
              </button>
              <button onClick={() => toast('Bank & UPI payouts are coming soon')} className="w-full text-left p-3.5 bg-white/90 rounded-2xl flex items-center gap-2.5 border border-emerald-200/60">
                <Wallet className="w-4 h-4 text-emerald-800" /> Bank & UPI details
              </button>
            </div>

            <div className="text-xs text-emerald-800 space-y-2">
              <div className="font-bold text-emerald-950">Shortcuts</div>
              {[['Command palette', '⌘ / Ctrl + K'], ['New payment request', 'N'], ['Close anything', 'Esc']].map(([l, k]) => (
                <div key={l} className="flex justify-between"><span>{l}</span><kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-emerald-200">{k}</kbd></div>
              ))}
            </div>
          </div>
          <Press haptic="warning" onClick={handleLogout} className="w-full py-3 bg-rose-50 text-rose-600 font-bold text-sm rounded-2xl flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Sign out
          </Press>
        </Drawer>
      </div>
    </MotionConfig>
  )
}

function EmptyState({ onCreate }) {
  return (
    <div className="p-10 sm:p-12 text-center glass-mint rounded-[32px] space-y-4">
      <motion.div className="w-14 h-14 mx-auto rounded-2xl bg-lime-300/60 flex items-center justify-center" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
        <Lock className="w-6 h-6 text-emerald-800" />
      </motion.div>
      <div>
        <p className="text-base font-bold text-emerald-950">No escrow vaults yet</p>
        <p className="text-xs text-emerald-700 mt-1">Upload your files, set a price, and send your client a secure payment link.</p>
      </div>
      <Press haptic="medium" onClick={onCreate} className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold rounded-2xl inline-flex items-center gap-2">
        <Plus className="w-4 h-4 text-lime-400" /> Request your first payment
      </Press>
    </div>
  )
}
