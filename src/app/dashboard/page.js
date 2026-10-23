'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { auth, db } from '../../lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query,
  serverTimestamp, updateDoc, where
} from 'firebase/firestore'
import {
  Activity, ArrowRight, ArrowUpRight,
  BriefcaseBusiness, Check, ChevronRight,
  CircleHelp, Clock3, Copy, ExternalLink, Eye, EyeOff,
  File, FileArchive, Film, Image as ImageIcon, LayoutDashboard,
  LockKeyhole, LogOut, Menu, MessageCircle, MessageSquare,
  MoreHorizontal, Plus, Search, Send, Settings2, Share2, ShieldCheck,
  Sparkles, Trash2, UploadCloud, Wallet, X
} from 'lucide-react'

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'mrfujhf8'

const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || 'releasedrop_vault'
const MAX_FILE_BYTES = 100 * 1024 * 1024

function haptic(pattern = 8) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(pattern) } catch {}
  }
}

function formatCurrency(value, currency = 'INR') {
  const amount = Number(value) || 0

  try {
    return new Intl.NumberFormat(
      currency === 'USD' ? 'en-US' : 'en-IN',
      {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'INR' ? 0 : 2,
      }
    ).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function initials(name = 'Creator') {
  return (
    name.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'CR'
  )
}

function StatusBadge({ status }) {
  const paid = status === 'Paid'
  const expired = status === 'Expired' || status === 'Cancelled'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        paid
          ? 'bg-emerald-50 text-emerald-700'
          : expired
            ? 'bg-slate-100 text-slate-500'
            : 'bg-amber-50 text-amber-700'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          paid
            ? 'bg-emerald-500'
            : expired
              ? 'bg-slate-400'
              : 'bg-amber-500'
        }`}
      />
      {status || 'Pending'}
    </span>
  )
}

function MiniStat({ icon: Icon, label, value, note, tone = 'green' }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-800',
    lime: 'bg-lime-50 text-lime-800',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
  }

  return (
    <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-[0_8px_30px_rgba(6,61,42,.045)] backdrop-blur-xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-3 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
      {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [deliveries, setDeliveries] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  const [tab, setTab] = useState('overview')
  const [currency, setCurrency] = useState('INR')
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [expiry, setExpiry] = useState('7')
  const [files, setFiles] = useState([])
  const fileInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const [activeChat, setActiveChat] = useState(null)
  const [reply, setReply] = useState('')

  const toastTimerRef = useRef(null)

  const notify = (message, type = 'success') => {
    setToast({ message, type })
    if (typeof window !== 'undefined') {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = window.setTimeout(() => setToast(null), 3800)
    }
  }

  useEffect(() => () => {
    if (toastTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  const addSelectedFiles = (fileList) => {
    const incoming = Array.from(fileList || [])
    if (!incoming.length) return

    const valid = incoming.filter(file => file.size <= MAX_FILE_BYTES)
    const oversizedCount = incoming.length - valid.length
    if (oversizedCount > 0) {
      notify(`${oversizedCount} file${oversizedCount === 1 ? '' : 's'} skipped: each file must be 100 MB or less.`, 'error')
    }

    if (!valid.length) return

    setFiles(previous => {
      const keys = new Set(previous.map(file => `${file.name}:${file.size}:${file.lastModified}`))
      const unique = valid.filter(file => {
        const key = `${file.name}:${file.size}:${file.lastModified}`
        if (keys.has(key)) return false
        keys.add(key)
        return true
      })
      return unique.length ? [...previous, ...unique] : previous
    })
  }

  const onFilePickerChange = (event) => {
    addSelectedFiles(event.currentTarget.files)
    // Reset after copying File objects so the same file can be selected again later.
    event.currentTarget.value = ''
  }

  useEffect(() => {
    let stopSnapshot = null

    const stopAuth = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)
      setAuthLoading(false)

      if (stopSnapshot) {
        stopSnapshot()
        stopSnapshot = null
      }

      if (currentUser) {
        setDataLoading(true)

        const q = query(
          collection(db, 'deliveries'),
          where('userId', '==', currentUser.uid)
        )

        stopSnapshot = onSnapshot(
          q,
          snap => {
            const items = snap.docs.map(item => ({
              id: item.id,
              ...item.data(),
            }))

            items.sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) -
                (a.createdAt?.seconds || 0)
            )

            setDeliveries(items)
            setDataLoading(false)

            setActiveChat(previous =>
              previous
                ? items.find(item => item.id === previous.id) || previous
                : null
            )
          },
          error => {
            console.error('Firestore subscription failed:', error)
            setDataLoading(false)
            notify(
              'Could not load projects. Check your connection.',
              'error'
            )
          }
        )
      } else {
        setDeliveries([])
        setDataLoading(false)
      }
    })

    return () => {
      stopAuth()
      if (stopSnapshot) stopSnapshot()
    }
  }, [])

  const paid = useMemo(
    () => deliveries.filter(item => item.status === 'Paid'),
    [deliveries]
  )

  const pending = useMemo(
    () => deliveries.filter(item => !['Paid', 'Expired', 'Cancelled'].includes(item.status)),
    [deliveries]
  )

  const unread = useMemo(
    () =>
      deliveries.filter(
        item =>
          item.messages?.length &&
          item.messages[item.messages.length - 1]?.sender === 'client'
      ),
    [deliveries]
  )

  const totalRevenue = useMemo(
    () =>
      paid
        .filter(item => (item.currency || 'INR') === currency)
        .reduce(
          (sum, item) =>
            sum +
            (Number(item.creatorPayout) || Number(item.grossAmount) || 0),
          0
        ),
    [paid, currency]
  )

  const pendingValue = useMemo(
    () =>
      pending
        .filter(item => (item.currency || 'INR') === currency)
        .reduce((sum, item) => sum + (Number(item.grossAmount) || 0), 0),
    [pending, currency]
  )

  const totalGross = useMemo(
    () =>
      deliveries
        .filter(item => (item.currency || 'INR') === currency)
        .reduce((sum, item) => sum + (Number(item.grossAmount) || 0), 0),
    [deliveries, currency]
  )

  const filtered = useMemo(
    () =>
      deliveries.filter(item =>
        `${item.title || ''} ${item.clientName || ''} ${item.clientEmail || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [deliveries, search]
  )

  const monthly = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()

    return Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(
        year,
        now.getMonth() - 5 + index,
        1
      )

      const sum = paid
        .filter(item => {
          if (
            (item.currency || 'INR') !== currency ||
            !item.createdAt?.seconds
          ) {
            return false
          }

          const date = new Date(item.createdAt.seconds * 1000)

          return (
            date.getMonth() === monthDate.getMonth() &&
            date.getFullYear() === monthDate.getFullYear()
          )
        })
        .reduce(
          (total, item) =>
            total +
            (Number(item.creatorPayout) || Number(item.grossAmount) || 0),
          0
        )

      return {
        label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        value: sum,
      }
    })
  }, [paid, currency])

  const uploadFile = (file, fileIndex = 0, fileCount = 1) =>
    new Promise((resolve, reject) => {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        reject(new Error('Upload is not configured. Add the Cloudinary cloud name and unsigned upload preset to your environment variables.'))
        return
      }

      const form = new FormData()
      form.append('file', file, file.name)
      form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const xhr = new XMLHttpRequest()
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`

      xhr.open('POST', uploadUrl, true)
      xhr.timeout = 180000

      xhr.upload.onprogress = event => {
        if (event.lengthComputable && event.total > 0) {
          const overall = ((fileIndex + event.loaded / event.total) / fileCount) * 95
          setProgress(Math.max(0, Math.min(95, Math.round(overall))))
        }
      }

      xhr.onload = () => {
        let result = null
        try {
          result = JSON.parse(xhr.responseText || '{}')
        } catch {
          reject(new Error(`Cloudinary returned an unreadable response for ${file.name} (HTTP ${xhr.status}).`))
          return
        }

        if (xhr.status >= 200 && xhr.status < 300 && result?.secure_url) {
          const rawUrl = result.secure_url
          const shouldWatermarkPreview = file.type?.startsWith('image/') || file.type?.startsWith('video/') || ['image', 'video'].includes(result.resource_type)
          const previewUrl = shouldWatermarkPreview
            ? rawUrl.replace(
                '/upload/',
                '/upload/l_text:Arial_24_bold:PAYDROP%20%E2%80%A2%20PREVIEW%20COPY,o_35,a_-30/'
              )
            : rawUrl

          resolve({
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            type: file.type || 'application/octet-stream',
            rawUrl,
            previewUrl,
            resourceType: result.resource_type || 'auto',
            format: result.format || '',
          })
          return
        }

        const serverMessage = result?.error?.message || `HTTP ${xhr.status}`
        let friendlyMessage = `Upload failed for “${file.name}”: ${serverMessage}`
        if (/upload preset|unsigned/i.test(serverMessage)) {
          friendlyMessage = `Cloudinary rejected the upload preset “${CLOUDINARY_UPLOAD_PRESET}”. In Cloudinary, confirm this preset exists and is configured for unsigned browser uploads.`
        } else if (/too large|file size|maximum.*size|size.*limit/i.test(serverMessage)) {
          friendlyMessage = `Cloudinary rejected “${file.name}” because it exceeds an upload size or account limit. Try a smaller file or adjust the Cloudinary plan/preset limit.`
        } else if (/not allowed|format|extension|resource type/i.test(serverMessage)) {
          friendlyMessage = `Cloudinary does not allow this file type (“${file.name}”). Review the allowed formats and resource-type settings in your upload preset.`
        }
        reject(new Error(friendlyMessage))
      }

      xhr.onerror = () => reject(new Error(`Network error while uploading “${file.name}”. Check your connection and try again.`))
      xhr.ontimeout = () => reject(new Error(`Upload timed out for “${file.name}”. Check your connection and retry.`))
      xhr.onabort = () => reject(new Error(`Upload was cancelled for “${file.name}”.`))
      xhr.send(form)
    })

  const deploy = async () => {
    if (
      !user ||
      !title.trim() ||
      !clientEmail.trim() ||
      !amount ||
      Number(amount) <= 0 ||
      !files.length
    ) {
      notify(
        'Add a project name, valid client email, amount and at least one file.',
        'error'
      )
      return
    }

    const oversized = files.find(file => file.size > MAX_FILE_BYTES)
    if (oversized) {
      notify(`“${oversized.name}” exceeds the 100 MB per-file limit. Remove it or choose a smaller file.`, 'error')
      haptic([30, 40, 30])
      return
    }

    setUploading(true)
    setProgress(0)
    haptic(10)

    try {
      const manifest = []

      for (let index = 0; index < files.length; index++) {
        manifest.push(await uploadFile(files[index], index, files.length))
      }

      setProgress(98)

      const gross = Number(amount)
      const fee = Math.max(Math.round(gross * 0.05), 1)
      const expiresAt = new Date()
      if (expiry !== 'never') {
        expiresAt.setDate(expiresAt.getDate() + Number(expiry))
      }

      const ref = await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email || '',
        title: title.trim(),
        clientName:
          clientName.trim() || clientEmail.split('@')[0] || 'Client',
        clientEmail: clientEmail.trim(),
        clientMessage: clientMessage.trim(),
        grossAmount: gross,
        currency,
        platformFee: fee,
        creatorPayout: Math.max(gross - fee, 0),
        watermarkText: 'PAYDROP • PREVIEW COPY',
        status: 'Awaiting Payment',
        files: manifest,
        expiresAt: expiry === 'never' ? null : expiresAt.toISOString(),
        viewCount: 0,
        messages: [],
        createdAt: serverTimestamp(),
      })

      const portalUrl = `${window.location.origin}/d/${ref.id}`

      let emailNotificationFailed = false
      if (clientEmail.trim()) {
        try {
          const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientEmail: clientEmail.trim(),
              clientName: clientName.trim() || 'Client',
              creatorName:
                user.displayName ||
                user.email?.split('@')[0] ||
                'Creator',
              projectTitle: title.trim(),
              amount: gross,
              currency,
              portalUrl,
            }),
          })
          if (!emailResponse.ok) {
            emailNotificationFailed = true
            console.error('Email dispatch failed:', emailResponse.status, await emailResponse.text())
          }
        } catch (error) {
          emailNotificationFailed = true
          console.error('Email dispatch failed:', error)
        }
      }

      setProgress(100)
      notify(
        emailNotificationFailed
          ? 'Request created, but the email notification failed. Check the email API route and SMTP settings.'
          : 'Payment request created successfully.',
        emailNotificationFailed ? 'error' : 'success'
      )
      haptic([12, 35, 12])

      setTitle('')
      setClientName('')
      setClientEmail('')
      setClientMessage('')
      setAmount('')
      setFiles([])
      setExpiry('7')
      setStep(1)
      setWizardOpen(false)
      setTab('projects')
    } catch (error) {
      console.error(error)
      notify(error.message || 'Could not create payment request.', 'error')
      haptic([30, 40, 30])
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const copyPortal = async id => {
    const url = `${window.location.origin}/d/${id}`

    try {
      await navigator.clipboard.writeText(url)
      notify('Client portal link copied.')
    } catch {
      notify(url, 'error')
    }
  }

  const shareProject = async item => {
    const url = `${window.location.origin}/d/${item.id}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: `PayDrop: ${item.title}`,
          text: `Review deliverables for ${item.title}`,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
      }

      notify(navigator.share ? 'Share sheet opened.' : 'Portal link copied.')
    } catch (error) {
      if (error?.name !== 'AbortError') copyPortal(item.id)
    }
  }

  const removeProject = async id => {
    if (
      !window.confirm(
        'Permanently delete this project? This cannot be undone.'
      )
    ) {
      return
    }

    try {
      await deleteDoc(doc(db, 'deliveries', id))
      notify('Project deleted.')
    } catch (error) {
      console.error(error)
      notify('Could not delete this project.', 'error')
    }
  }

  const sendReply = async () => {
    if (!activeChat || !reply.trim()) return

    try {
      const existing = activeChat.messages || []

      await updateDoc(doc(db, 'deliveries', activeChat.id), {
        messages: [
          ...existing,
          {
            sender: 'creator',
            text: reply.trim(),
            time: new Date().toISOString(),
          },
        ],
      })

      setReply('')
      notify('Reply sent.')
    } catch (error) {
      console.error(error)
      notify('Could not send reply.', 'error')
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error(error)
      notify('Sign out failed.', 'error')
    }
  }

  const openWizard = () => {
    haptic(8)
    setStep(1)
    setWizardOpen(true)
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'projects',
      label: 'Projects',
      icon: BriefcaseBusiness,
      count: deliveries.length,
    },
    {
      id: 'revisions',
      label: 'Client messages',
      icon: MessageSquare,
      count: unread.length,
    },
    { id: 'wallet', label: 'Wallet & payouts', icon: Wallet },
  ]

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7F2] text-sm font-semibold text-slate-500">
        <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-[#063D2A] border-t-transparent" />
        Securing your workspace…
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7F2] p-6">
        <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#94EC36] text-2xl font-black text-[#063D2A]">
            P
          </div>

          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
            Your studio is waiting
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to manage your projects, client handovers and payment requests.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#063D2A] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#09523A]"
          >
            Continue to login <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  const firstName =
    user.displayName?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    'Creator'

  const chartMax = Math.max(...monthly.map(item => item.value), 1)

  const points = monthly.map((item, index) => ({
    ...item,
    x: 12 + index * 75,
    y: 98 - (item.value / chartMax) * 70,
  }))

  const chartLine = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ')

  const chartArea = `${chartLine} L ${
    points[points.length - 1]?.x || 387
  } 112 L 12 112 Z`

  return (
    <div className="paydrop-shell min-h-screen w-full bg-[#F5F7F4] text-slate-900 antialiased selection:bg-[#A4E64B] selection:text-[#063D2A]">
      <style jsx global>{`
        :root { color-scheme: light; }
        html { scroll-behavior: auto; width: 100%; max-width: 100%; overflow-x: clip; }
        body { margin: 0; width: 100%; max-width: 100%; overflow-x: clip; background: #F5F7F4; }
        *, *::before, *::after { box-sizing: border-box; }
        .paydrop-shell { --pd-ink: #073D2B; --pd-lime: #A4E64B; width: 100%; min-height: 100dvh; overflow-x: clip; background: #F5F7F4; }
        .paydrop-shell button, .paydrop-shell a, .paydrop-shell input, .paydrop-shell select, .paydrop-shell textarea { -webkit-tap-highlight-color: transparent; }
        /* Keep controls steady: no scale-on-press, card lift, or section entrance transforms. */
        .paydrop-shell button, .paydrop-shell a { transition: background-color .16s ease, border-color .16s ease, color .16s ease, box-shadow .16s ease; }
        .paydrop-shell button:active, .paydrop-shell a:active { transform: none !important; }
        .paydrop-shell button:focus-visible, .paydrop-shell a:focus-visible, .paydrop-shell input:focus-visible, .paydrop-shell select:focus-visible, .paydrop-shell textarea:focus-visible { outline: 3px solid rgba(164,230,75,.85); outline-offset: 2px; }
        .paydrop-shell main > section, .paydrop-shell main > div { animation: none !important; }
        .paydrop-shell .rounded-3xl, .paydrop-shell .rounded-2xl { transition: box-shadow .16s ease, border-color .16s ease; }
        .paydrop-shell .border-slate-200\/80.bg-white:hover { box-shadow: 0 8px 24px rgba(6,61,42,.05); border-color: rgba(6,61,42,.14); }
        .paydrop-shell input, .paydrop-shell textarea, .paydrop-shell select { width: auto; max-width: 100%; min-width: 0; font-size: 16px; }
        .paydrop-shell input[type="text"], .paydrop-shell input[type="email"], .paydrop-shell input[type="number"], .paydrop-shell input[type="search"], .paydrop-shell textarea { width: 100%; }
        .paydrop-shell input[type="file"] { width: 100% !important; height: 100% !important; max-width: none; cursor: pointer; }
        .paydrop-shell img, .paydrop-shell svg { max-width: 100%; }
        .paydrop-shell main { min-width: 0; width: 100%; }
        .paydrop-shell main > * { min-width: 0; }
        .paydrop-shell :where(section, article, aside, header, nav, div) { min-width: 0; }
        .paydrop-shell main > section { min-width: 0; }
        .paydrop-shell h1, .paydrop-shell h2, .paydrop-shell h3 { text-wrap: balance; }
        .paydrop-shell p { overflow-wrap: anywhere; }
        .paydrop-shell .pd-glass { background: rgba(255,255,255,.88); border: 1px solid rgba(226,232,240,.8); box-shadow: 0 8px 26px rgba(6,61,42,.035); }
        @media (min-width: 1024px) { .paydrop-shell aside[aria-label="Main navigation"] { transform: translateX(0) !important; } }
        @media (max-width: 1023px) {
          .paydrop-shell { padding-bottom: env(safe-area-inset-bottom); }
          .paydrop-shell main { padding-top: 1.1rem !important; padding-left: 1rem !important; padding-right: 1rem !important; padding-bottom: 6.5rem !important; }
          .paydrop-shell main > section { margin-bottom: 0; }
          .paydrop-shell header > div { padding: .75rem 1rem !important; }
          .paydrop-shell header h1 { font-size: 1.05rem !important; line-height: 1.35; }
          .paydrop-shell .mobile-bottom-nav { min-height: 68px; }
        }
        @media (max-width: 640px) {
          /* Comfortable mobile reading size without forcing the whole page to scale. */
          .paydrop-shell .text-\[10px\] { font-size: .6875rem !important; }
          .paydrop-shell .text-\[11px\] { font-size: .75rem !important; }
          .paydrop-shell .text-xs { font-size: .8125rem !important; line-height: 1.45; }
          .paydrop-shell .rounded-\[30px\] { border-radius: 22px !important; }
          .paydrop-shell main { gap: 1rem !important; }
          .paydrop-shell main > section { gap: .75rem; }
          .paydrop-shell main .shadow-\[0_8px_30px_rgba\(6\,61\,42\,\.045\)\] { box-shadow: 0 5px 18px rgba(6,61,42,.035); }
          .paydrop-shell main section.grid { gap: .75rem !important; }
          .paydrop-shell main section > .rounded-3xl { padding: 1rem !important; }
          .paydrop-shell main section.relative.rounded-\[30px\] { padding: 1.25rem !important; }
          .paydrop-shell main section.relative.rounded-\[30px\] .text-4xl { font-size: 2.15rem; line-height: 1.12; letter-spacing: -.04em; }
          .paydrop-shell main section.relative.rounded-\[30px\] .mt-7 { margin-top: 1.25rem; }
          .paydrop-shell main section.relative.rounded-\[30px\] .h-32 { height: 6.25rem; }
          .paydrop-shell main section.grid.grid-cols-2 > div { min-width: 0; }
          .paydrop-shell main section.grid.grid-cols-2 > div p.text-2xl { font-size: 1.2rem; line-height: 1.35; }
          .paydrop-shell main section.grid.grid-cols-2 > div .h-10.w-10 { width: 2.25rem; height: 2.25rem; }
          .paydrop-shell button { min-height: 42px; }
          .paydrop-shell .mobile-bottom-nav { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: .15rem; padding-left: .35rem; padding-right: .35rem; padding-top: .45rem; }
          .paydrop-shell .mobile-bottom-nav button { min-height: 56px; gap: .28rem; border-radius: 12px; padding: .4rem .2rem; }
          .paydrop-shell .mobile-bottom-nav button svg { width: 22px; height: 22px; flex: 0 0 auto; }
          .paydrop-shell .mobile-bottom-nav button span:last-child { font-size: 12px !important; line-height: 1.2; white-space: nowrap; }
          .paydrop-shell .project-row-actions button, .paydrop-shell .project-row-actions a { min-height: 40px; }
          .paydrop-shell [class*="max-w-"] { min-width: 0; }
        }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; scroll-behavior: auto !important; transition: none !important; } }
      `}</style>
      {toast && (
        <div className="fixed left-1/2 top-4 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl ${toast.type === 'error' ? 'border-rose-200 bg-white text-rose-700' : 'border-emerald-100 bg-[#063D2A] text-white'}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${toast.type === 'error' ? 'bg-rose-50' : 'bg-white/10'}`}>
              {toast.type === 'error' ? <CircleHelp size={15}/> : <Check size={15} className="text-[#94EC36]"/>}
            </span>
            <span className="min-w-0 flex-1 break-words">{toast.message}</span>
            <button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={16}/></button>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <button aria-label="Close navigation overlay" className="fixed inset-0 z-40 touch-none bg-slate-950/30 lg:hidden" onClick={() => setMobileMenuOpen(false)}/>
      )}

      <aside aria-label="Main navigation" className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,276px)] flex-col overflow-y-auto overscroll-contain border-r border-slate-200/80 bg-white px-5 py-6 transition-transform duration-200 ease-out will-change-transform lg:translate-x-0 lg:overflow-y-auto ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-1">
          <button onClick={() => { setTab('overview'); setMobileMenuOpen(false) }} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#94EC36] text-xl font-black text-[#063D2A] shadow-sm">P</span>
            <span className="text-[25px] font-black tracking-[-1.3px] text-slate-950">paydrop<span className="text-[#80C92D]">.</span></span>
          </button>
          <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 lg:hidden" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={19}/></button>
        </div>

        <div className="mt-9 rounded-2xl border border-[#DDEBD7] bg-[#F4F8F1] p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#063D2A]">
            <ShieldCheck size={16}/><span>Creator workspace</span><span className="ml-auto h-2 w-2 rounded-full bg-emerald-500"/>
          </div>
          <p className="mt-1.5 pl-6 text-[11px] text-slate-500">Your files. Your clients. One place.</p>
        </div>

        <p className="mb-3 mt-8 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">Workspace</p>
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const selected = tab === item.id || (tab === 'chat' && item.id === 'revisions')
            return (
              <button
                key={item.id}
                onClick={() => { haptic(6); setTab(item.id); setMobileMenuOpen(false); setActiveChat(null) }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[13px] font-semibold transition ${selected ? 'bg-[#063D2A] text-white shadow-lg shadow-[#063D2A]/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <Icon size={18} className={selected ? 'text-[#94EC36]' : 'text-slate-400'}/>
                <span className="flex-1">{item.label}</span>
                {item.count > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{item.count}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">Quick actions</p>
          <button onClick={() => { openWizard(); setMobileMenuOpen(false) }} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-3.5 py-3 text-left text-[13px] font-semibold text-slate-700 transition hover:border-[#94EC36] hover:bg-lime-50">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#94EC36] text-[#063D2A]"><Plus size={17}/></span>
            <span>New payment request</span>
          </button>
          <button onClick={() => { setAssistantOpen(true); setMobileMenuOpen(false) }} className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[13px] font-semibold text-slate-600 transition hover:bg-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Sparkles size={16}/></span>
            <span>Studio insights</span><ChevronRight size={15} className="ml-auto text-slate-400"/>
          </button>
        </div>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <button onClick={() => setProfileOpen(true)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-slate-50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFE0B9] text-xs font-black text-[#063D2A]">{initials(user.displayName || user.email)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-slate-900">{user.displayName || firstName}</span>
              <span className="mt-0.5 block truncate text-[10px] text-slate-400">{user.email}</span>
            </span>
            <MoreHorizontal size={18} className="text-slate-400"/>
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[276px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#F4F7F2]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-4 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => { haptic(6); setMobileMenuOpen(true) }} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 lg:hidden" aria-label="Open navigation"><Menu size={19}/></button>
              <div className="min-w-0">
                <div className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400 sm:flex">
                  <span>PayDrop Studio</span><ChevronRight size={12}/><span className="text-slate-500">{navItems.find(item => item.id === tab)?.label || (tab === 'chat' ? 'Client messages' : 'Overview')}</span>
                </div>
                <h1 className="mt-0.5 truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                  {tab === 'overview' ? `Welcome back, ${firstName}` : tab === 'projects' ? 'Your projects' : tab === 'revisions' || tab === 'chat' ? 'Client messages' : 'Wallet & payouts'}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> Workspace active
              </span>
              <button onClick={() => setAssistantOpen(true)} aria-label="Open studio insights" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-lime-300 hover:text-[#063D2A]"><Sparkles size={17}/></button>
              <button onClick={() => setProfileOpen(true)} aria-label="Open profile" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFE0B9] text-xs font-black text-[#063D2A] ring-2 ring-white">{initials(user.displayName || user.email)}</button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] space-y-5 px-4 pb-28 pt-5 sm:px-7 sm:pt-7 lg:px-9 lg:pb-10">
          {tab === 'overview' && (
            <>
              <section className="relative overflow-hidden rounded-[30px] bg-[#063D2A] p-6 text-white shadow-xl shadow-[#063D2A]/10 sm:rounded-[34px] sm:p-8 lg:p-9">
                <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-[#1D6748]/60 blur-3xl"/>
                <div className="pointer-events-none absolute bottom-[-120px] right-[22%] h-64 w-64 rounded-full bg-[#94EC36]/10 blur-3xl"/>
                <div className="relative grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100">
                      <Activity size={13} className="text-[#94EC36]"/> Your creator business, at a glance
                    </div>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <p className="text-sm font-medium text-emerald-100/80">Settled earnings</p>
                      <button onClick={() => setBalanceVisible(!balanceVisible)} className="rounded-lg p-1.5 text-emerald-100 transition hover:bg-white/10" aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}>
                        {balanceVisible ? <Eye size={16}/> : <EyeOff size={16}/>}
                      </button>
                      <select value={currency} onChange={event => setCurrency(event.target.value)} className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white outline-none [&>option]:text-slate-900">
                        <option value="INR">INR ₹</option>
                        <option value="USD">USD $</option>
                      </select>
                    </div>
                    <p className="mt-1 text-4xl font-black tracking-[-1.8px] sm:text-5xl lg:text-6xl">
                      {balanceVisible ? formatCurrency(totalRevenue, currency) : '••••••••'}
                    </p>
                    <p className="mt-3 max-w-md text-xs leading-5 text-emerald-100/65">
                      Creator payouts from projects currently marked as paid in your workspace.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                      <button onClick={openWizard} className="inline-flex items-center gap-2 rounded-2xl bg-[#94EC36] px-5 py-3 text-xs font-extrabold text-[#063D2A] shadow-lg shadow-black/10 transition hover:bg-[#A8F35C]">
                        <Plus size={16}/> Request payment
                      </button>
                      <button onClick={() => setTab('projects')} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/15">
                        View projects <ArrowUpRight size={15}/>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[.07] p-5 backdrop-blur-sm sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-emerald-100/75">Revenue activity</p>
                        <p className="mt-1 text-sm font-bold">Last 6 months</p>
                      </div>
                      <span className="rounded-xl bg-[#94EC36]/15 p-2 text-[#94EC36]"><Activity size={18}/></span>
                    </div>
                    <div className="mt-5 h-32 w-full">
                      <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                        <defs>
                          <linearGradient id="paydropRevenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#94EC36" stopOpacity=".32"/>
                            <stop offset="100%" stopColor="#94EC36" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        {[25,55,85].map(y => <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="white" strokeOpacity=".12" strokeDasharray="4 6"/>)}
                        <path d={chartArea} fill="url(#paydropRevenueFill)"/>
                        <path d={chartLine} fill="none" stroke="#94EC36" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        {points.map((point, index) => <circle key={point.label + index} cx={point.x} cy={point.y} r="3.5" fill="#063D2A" stroke="#94EC36" strokeWidth="2"/>)}
                      </svg>
                    </div>
                    <div className="mt-3 flex justify-between text-[10px] font-semibold text-emerald-100/55">
                      {monthly.map(item => <span key={item.label}>{item.label}</span>)}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="text-[11px] text-emerald-100/70">Total project value</span>
                      <span className="text-sm font-extrabold">{balanceVisible ? formatCurrency(totalGross, currency) : '••••••'}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <MiniStat icon={Wallet} label="Settled earnings" value={formatCurrency(totalRevenue, currency)} note={`${paid.length} project${paid.length === 1 ? '' : 's'} marked paid`} tone="green"/>
                <MiniStat icon={Clock3} label="Awaiting payment" value={formatCurrency(pendingValue, currency)} note={`${pending.length} request${pending.length === 1 ? '' : 's'} not marked paid`} tone="amber"/>
                <MiniStat icon={BriefcaseBusiness} label="Total projects" value={deliveries.length.toLocaleString()} note="Across your workspace" tone="blue"/>
                <MiniStat icon={MessageCircle} label="Client replies" value={unread.length.toLocaleString()} note={unread.length ? 'Needs your attention' : 'You are all caught up'} tone="lime"/>
              </section>

              <section className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_8px_30px_rgba(6,61,42,.045)] backdrop-blur-xl lg:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-slate-950">Recent deliverables</h2>
                      <p className="mt-0.5 text-xs text-slate-500">Quick view of your recent payment requests</p>
                    </div>
                    <button onClick={() => setTab('projects')} className="text-xs font-bold text-[#063D2A] hover:underline">View all</button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {deliveries.slice(0, 4).map(item => (
                      <ProjectRow key={item.id} item={item} currency={currency} onCopy={copyPortal} onShare={shareProject} onDelete={removeProject} compact />
                    ))}
                    {deliveries.length === 0 && (dataLoading ? (
                      <div role="status" className="flex items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm font-medium text-slate-500">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#073D2B]/25 border-t-[#073D2B]" />
                        Loading your projects…
                      </div>
                    ) : (
                      <EmptyState title="No projects yet" body="Create your first request to share files and manage client handovers." action="Create request" onAction={openWizard} />
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_8px_30px_rgba(6,61,42,.045)] backdrop-blur-xl">
                    <h2 className="text-base font-black text-slate-950">Project status</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Breakdown of active requests</p>
                    <div className="mt-5 space-y-4">
                      <ProgressRow label="Paid" value={paid.length} total={deliveries.length} color="bg-emerald-500"/>
                      <ProgressRow label="Awaiting payment" value={pending.length} total={deliveries.length} color="bg-amber-500"/>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'projects' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects or clients..." className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#063D2A] focus:ring-1 focus:ring-[#063D2A]" />
                </div>
                <button onClick={openWizard} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#063D2A] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#09523A]">
                  <Plus size={16}/> New payment request
                </button>
              </div>

              <div className="space-y-3">
                {filtered.map(item => (
                  <ProjectRow key={item.id} item={item} currency={currency} onCopy={copyPortal} onShare={shareProject} onDelete={removeProject} />
                ))}
                {filtered.length === 0 && (dataLoading ? (
                  <div role="status" className="flex items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-8 text-sm font-medium text-slate-500">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#073D2B]/25 border-t-[#073D2B]" />
                    Loading your projects…
                  </div>
                ) : (
                  <EmptyState title={search ? 'No matching projects' : 'No projects yet'} body={search ? 'Try adjusting your search terms.' : 'Create your first payment request to share files with a client.'} action="New request" onAction={openWizard} />
                ))}
              </div>
            </div>
          )}

          {(tab === 'revisions' || tab === 'chat') && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-[0_8px_30px_rgba(6,61,42,.045)] backdrop-blur-xl">
                <h2 className="text-base font-black text-slate-950">Client conversations</h2>
                <p className="mt-0.5 text-xs text-slate-500">Messages sent via client portals</p>
                <div className="mt-4 space-y-2">
                  {deliveries.filter(d => d.messages?.length > 0).map(item => (
                    <button key={item.id} onClick={() => { setActiveChat(item); setTab('chat') }} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${activeChat?.id === item.id ? 'bg-[#F4F8F1] border border-[#94EC36]' : 'border border-slate-100 hover:bg-slate-50'}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E5] text-xs font-black text-[#063D2A]">{initials(item.clientName)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{item.messages[item.messages.length - 1]?.text}</p>
                      </div>
                    </button>
                  ))}
                  {deliveries.filter(d => d.messages?.length > 0).length === 0 && (
                    <p className="p-4 text-center text-xs text-slate-400">No client messages yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_8px_30px_rgba(6,61,42,.045)] backdrop-blur-xl lg:col-span-2">
                {activeChat ? (
                  <div className="flex h-[500px] flex-col">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-sm font-black text-slate-900">{activeChat.title}</h3>
                      <p className="text-xs text-slate-500">{activeChat.clientName} ({activeChat.clientEmail})</p>
                    </div>
                    <div className="flex-1 overflow-y-auto py-4 space-y-3">
                      {activeChat.messages?.map((msg, i) => (
                        <div key={i} className={`flex ${msg.sender === 'creator' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-5 ${msg.sender === 'creator' ? 'bg-[#063D2A] text-white' : 'bg-slate-100 text-slate-800'}`}>
                            <p>{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 border-t border-slate-100 pt-4">
                      <input type="text" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Write a client reply…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#063D2A]" />
                      <button onClick={sendReply} className="rounded-xl bg-[#063D2A] px-4 py-2.5 text-xs font-bold text-white"><Send size={15}/></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center p-8">
                    <MessageSquare size={32} className="text-slate-300"/>
                    <p className="mt-3 text-sm font-bold text-slate-700">Select a conversation</p>
                    <p className="mt-1 text-xs text-slate-400">Choose a project from the left to view messages.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'wallet' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_8px_30px_rgba(6,61,42,.045)] backdrop-blur-xl">
                <h2 className="text-base font-black text-slate-950">Payout Settings</h2>
                <p className="mt-1 text-xs text-slate-500">Payment and payout connections are not enabled in this version.</p>
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-[#F8FAF6] p-6 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm"><Wallet size={23}/></span>
                  <p className="mt-4 text-sm font-bold text-slate-800">Payment gateway not connected</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">PayDrop is currently tracking requests and their manually recorded status. No real funds, escrow balance or bank transfers are processed in this version.</p>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"><span className="h-1.5 w-1.5 rounded-full bg-amber-500"/> Demo mode</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile quick navigation */}
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        {navItems.map(item => {
          const Icon = item.icon
          const selected = tab === item.id || (tab === 'chat' && item.id === 'revisions')

          return (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); setActiveChat(null) }}
              className={`relative flex flex-col items-center gap-1 rounded-xl py-1.5 ${selected ? 'text-[#063D2A]' : 'text-slate-400'}`}
            >
              <span className="relative">
                <Icon size={22}/>
                {item.id === 'revisions' && unread.length > 0 && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"/>
                )}
              </span>
              <span className={`text-[11px] ${selected ? 'font-extrabold' : 'font-semibold'}`}>
                {item.id === 'overview' ? 'Home' : item.id === 'projects' ? 'Projects' : item.id === 'revisions' ? 'Messages' : 'Wallet'}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Payment request wizard */}
      {wizardOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] border border-white/70 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-[32px]">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-7">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">
                  Payment request · Step {step} of 4
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                  Create a client handover
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Add deliverables, client details and pricing.
                </p>
              </div>
              <button
                onClick={() => !uploading && setWizardOpen(false)}
                disabled={uploading}
                className="rounded-xl bg-[#F4F7F2] p-2.5 text-slate-600 disabled:opacity-40"
                aria-label="Close wizard"
              >
                <X size={18}/>
              </button>
            </div>

            <div className="h-1.5 bg-slate-100">
              <div
                className="h-full bg-[#94EC36] transition-all duration-300"
                style={{ width: `${step * 25}%` }}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold">Upload your deliverables</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Add the files you intend to share with your client. Only upload files you have permission to share.
                    </p>
                  </div>

                  <div
                    onDragOver={event => { event.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={event => {
                      event.preventDefault()
                      setDragging(false)
                      addSelectedFiles(event.dataTransfer.files)
                    }}
                    className={`rounded-3xl border-2 border-dashed p-7 text-center transition sm:p-10 ${dragging ? 'border-[#063D2A] bg-lime-50' : 'border-slate-200 bg-[#F8FAF6]'}`}
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F3E1] text-[#063D2A]">
                      <UploadCloud size={23}/>
                    </div>
                    <p className="mt-4 text-sm font-extrabold">Drop your files here</p>
                    <p className="mt-1 text-xs text-slate-500">Images, video, audio, ZIP, PDFs, source files and more</p>
                    <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                      <label className="relative inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#073D2B] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0A5139] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lime-500">
                        <UploadCloud size={18} aria-hidden="true" />
                        <span>Choose files</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          aria-label="Choose deliverable files to upload"
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          onChange={onFilePickerChange}
                        />
                      </label>
                      <span className="text-xs font-medium text-slate-500">{files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected` : 'Any file type · up to 100 MB each'}</span>
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                            {file.type.startsWith('image/') ? <ImageIcon size={17}/> : file.type.startsWith('video/') ? <Film size={17}/> : file.name.toLowerCase().endsWith('.zip') ? <FileArchive size={17}/> : <File size={17}/>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold">{file.name}</span>
                            <span className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          </span>
                          <button
                            onClick={() => setFiles(previous => previous.filter((_, i) => i !== index))}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X size={15}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] leading-5 text-slate-400">
                    Files upload directly from your browser to Cloudinary. If an upload is rejected, the error will explain whether the preset, file type, size limit or connection needs attention.
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-700">Client email *</label>
                    <input
                      type="email"
                      required
                      value={clientEmail}
                      onChange={event => setClientEmail(event.target.value)}
                      placeholder="client@company.com"
                      className="w-full rounded-2xl border border-slate-200 bg-[#F8FAF6] px-4 py-3.5 text-sm outline-none focus:border-[#94EC36] focus:ring-2 focus:ring-lime-100"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-700">Client name</label>
                    <input
                      value={clientName}
                      onChange={event => setClientName(event.target.value)}
                      placeholder="Their name (optional)"
                      className="w-full rounded-2xl border border-slate-200 bg-[#F8FAF6] px-4 py-3.5 text-sm outline-none focus:border-[#94EC36] focus:ring-2 focus:ring-lime-100"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-700">Project name *</label>
                    <input
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      placeholder="Website redesign & source code"
                      className="w-full rounded-2xl border border-slate-200 bg-[#F8FAF6] px-4 py-3.5 text-sm outline-none focus:border-[#94EC36] focus:ring-2 focus:ring-lime-100"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-700">Handover message</label>
                    <textarea
                      rows={3}
                      value={clientMessage}
                      onChange={event => setClientMessage(event.target.value)}
                      placeholder="Add a note for your client…"
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-[#F8FAF6] px-4 py-3.5 text-sm outline-none focus:border-[#94EC36] focus:ring-2 focus:ring-lime-100"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-700">Payment request amount *</label>
                    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-[#F8FAF6] focus-within:border-[#94EC36]">
                      <select
                        value={currency}
                        onChange={event => setCurrency(event.target.value)}
                        className="border-r border-slate-200 bg-transparent px-4 text-sm font-bold outline-none"
                      >
                        <option value="INR">INR ₹</option>
                        <option value="USD">USD $</option>
                      </select>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={amount}
                        onChange={event => setAmount(event.target.value)}
                        placeholder="0.00"
                        className="min-w-0 flex-1 bg-transparent px-4 py-4 text-lg font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-700">Client portal expiry</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['7', '14', '30', 'never'].map(option => (
                        <button
                          key={option}
                          onClick={() => setExpiry(option)}
                          className={`rounded-2xl border px-2 py-3 text-xs font-bold transition ${expiry === option ? 'border-[#063D2A] bg-[#EAF3E5] text-[#063D2A]' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                        >
                          {option === 'never' ? 'No expiry' : `${option} days`}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] leading-5 text-slate-400">
                      Portal expiry is only enforced if the client portal validates this field. Verify that check before using this with real client files.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F4F7F2] p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Platform fee estimate (5%)</span>
                      <span className="font-bold">{formatCurrency(Math.max(Math.round((Number(amount) || 0) * .05), 1), currency)}</span>
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-slate-400">
                      Illustrative estimate based on the dashboard logic, not a payment processor quote.
                    </p>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-[#F8FAF6] p-5">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Project</p>
                        <h3 className="mt-1 break-words text-base font-black">{title}</h3>
                        <p className="mt-1 break-all text-xs text-slate-500">{clientEmail}</p>
                      </div>
                      <div className="shrink-0 text-right text-lg font-black">{formatCurrency(amount, currency)}</div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Files attached</span>
                      <span className="font-bold">{files.length}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Link expiry</span>
                      <span className="font-bold">{expiry === 'never' ? 'No expiry' : `${expiry} days`}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-lime-200 bg-lime-50 p-4">
                    <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#063D2A]"/>
                    <p className="text-xs leading-5 text-[#315A43]">
                      Review the details before creating the request. This creates a project record and portal link; it does not itself collect or escrow money.
                    </p>
                  </div>

                  {uploading && (
                    <div className="rounded-2xl bg-[#063D2A] p-4 text-white">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Uploading files…</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full rounded-full bg-[#94EC36] transition-all" style={{ width: `${progress}%` }}/>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-white p-5 sm:p-7">
              {step > 1 && (
                <button
                  disabled={uploading}
                  onClick={() => setStep(previous => previous - 1)}
                  className="rounded-2xl border border-slate-200 px-5 py-3.5 text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  Back
                </button>
              )}

              {step < 4 ? (
                <button
                  onClick={() => {
                    if (step === 1 && !files.length) {
                      return notify('Attach at least one file to continue.', 'error')
                    }
                    if (step === 2 && (!title.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim()))) {
                      return notify('Enter a project name and valid client email.', 'error')
                    }
                    if (step === 3 && (!amount || Number(amount) <= 0)) {
                      return notify('Enter an amount greater than zero.', 'error')
                    }
                    setStep(previous => previous + 1)
                  }}
                  className="ml-auto inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#063D2A] px-5 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#09523A] sm:flex-none"
                >
                  Continue <ArrowRight size={15} className="text-[#94EC36]"/>
                </button>
              ) : (
                <button
                  disabled={uploading}
                  onClick={deploy}
                  className="ml-auto inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#063D2A] px-5 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#09523A] disabled:opacity-50 sm:flex-none"
                >
                  {uploading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"/>
                      Uploading…
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={15} className="text-[#94EC36]"/>
                      Create request
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Studio insights drawer */}
      {assistantOpen && (
        <Drawer onClose={() => setAssistantOpen(false)} title="Studio insights" icon={Sparkles}>
          <div className="rounded-2xl bg-[#F4F7F2] p-4">
            <p className="text-xs font-extrabold text-[#063D2A]">Workspace summary</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              You have <strong>{deliveries.length}</strong> projects, <strong>{paid.length}</strong> marked paid and <strong>{unread.length}</strong> client message{unread.length === 1 ? '' : 's'} awaiting a response.
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Settled earnings', value: formatCurrency(totalRevenue, currency), icon: Wallet },
              { label: 'Awaiting payment', value: formatCurrency(pendingValue, currency), icon: Clock3 },
              { label: 'Client messages', value: String(unread.length), icon: MessageSquare },
            ].map(row => {
              const Icon = row.icon
              return (
                <div key={row.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <span className="rounded-xl bg-slate-50 p-2 text-slate-600"><Icon size={16}/></span>
                  <span className="flex-1 text-xs font-semibold text-slate-600">{row.label}</span>
                  <span className="text-sm font-black">{row.value}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-[11px] leading-5 text-slate-400">
            Insights are calculated from project records in your workspace. They are not bank balances or verified payment-provider data.
          </p>
        </Drawer>
      )}

      {/* Profile drawer */}
      {profileOpen && (
        <Drawer onClose={() => setProfileOpen(false)} title="Account settings" icon={Settings2}>
          <div className="flex items-center gap-3 rounded-2xl bg-[#F4F7F2] p-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE0B9] text-sm font-black text-[#063D2A]">
              {initials(user.displayName || user.email)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{user.displayName || firstName}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
              <p className="mt-1 text-[10px] text-slate-400">Firebase account</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-extrabold">Workspace preferences</p>
            <label className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
              <span>Default reporting currency</span>
              <select
                value={currency}
                onChange={event => setCurrency(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
              </select>
            </label>
          </div>

          <button
            onClick={async () => { setProfileOpen(false); await logout() }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3.5 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100"
          >
            <LogOut size={16}/> Sign out
          </button>

          <p className="mt-4 text-[10px] leading-5 text-slate-400">
            Bank and payout setup is not connected in this dashboard yet. Add a secure provider-backed flow before collecting financial details.
          </p>
        </Drawer>
      )}
    </div>
  )
}

function ProjectRow({ item, currency, onCopy, onShare, onDelete, compact = false }) {
  return (
    <div className={`rounded-2xl border border-slate-100 transition hover:border-slate-200 hover:bg-slate-50/60 ${compact ? 'p-3' : 'p-4 sm:p-5'}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF3E5] text-xs font-black text-[#063D2A]">
          {initials(item.clientName || item.title)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="max-w-full truncate text-sm font-extrabold text-slate-900">
              {item.title || 'Untitled project'}
            </h3>
            <StatusBadge status={item.status}/>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">
            {item.clientName || 'Client'}{item.clientEmail ? ` · ${item.clientEmail}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-400">
            <span className="inline-flex items-center gap-1">
              <File size={12}/>{item.files?.length || 0} file{item.files?.length === 1 ? '' : 's'}
            </span>
            <span>·</span>
            <span>{item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Recently created'}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-black tracking-tight text-slate-950">
            {formatCurrency(item.grossAmount, item.currency || currency)}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            {item.status === 'Paid' ? 'Marked paid' : 'Request amount'}
          </p>
        </div>
      </div>

      <div className="project-row-actions mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onCopy(item.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#F0F6EC] px-3 py-2 text-[10px] font-bold text-[#063D2A] transition hover:bg-lime-100">
            <Copy size={12}/> Copy portal link
          </button>
          <button onClick={() => onShare(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-white">
            <Share2 size={12}/> Share
          </button>
          <Link href={`/d/${item.id}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-white">
            Open portal <ExternalLink size={12}/>
          </Link>
        </div>
        <button onClick={() => onDelete(item.id)} className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${item.title || 'project'}`} title="Delete project">
          <Trash2 size={15}/>
        </button>
      </div>
    </div>
  )
}

function ProgressRow({ label, value, total, color }) {
  const percentage = total ? Math.round((value / total) * 100) : 0

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="font-extrabold text-slate-900">
          {value} <span className="font-medium text-slate-400">/ {total}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percentage}%` }}/>
      </div>
    </div>
  )
}

function EmptyState({ title, body, action, onAction }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF3E5] text-[#063D2A]">
        <BriefcaseBusiness size={21}/>
      </div>
      <h3 className="mt-4 text-sm font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">{body}</p>
      {action && onAction && (
        <button onClick={onAction} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#063D2A] px-4 py-2.5 text-xs font-bold text-white">
          {action}<ArrowRight size={14}/>
        </button>
      )}
    </div>
  )
}

function Drawer({ onClose, title, icon: Icon, children }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-slate-950/35 backdrop-blur-sm"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <aside className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF3E5] text-[#063D2A]">
              <Icon size={18}/>
            </span>
            <h2 className="text-sm font-black">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Close drawer">
            <X size={18}/>
          </button>
        </div>
        <div className="flex-1 py-5">{children}</div>
        <div className="border-t border-slate-100 pt-4">
          <p className="text-center text-[10px] font-semibold text-slate-400">PayDrop · Creator workspace</p>
        </div>
      </aside>
    </div>
  )
}
