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
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      navigator.vibrate(pattern)
    } catch {}
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

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }) {
  const paid = status === 'Paid'
  const expired = status === 'Expired' || status === 'Cancelled'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
        paid
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
          : expired
            ? 'bg-slate-100 text-slate-500 border border-slate-200/60'
            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          paid
            ? 'bg-emerald-500 animate-pulse'
            : expired
              ? 'bg-slate-400'
              : 'bg-amber-500 animate-ping'
        }`}
      />
      {status || 'Pending'}
    </span>
  )
}

function MiniStat({ icon: Icon, label, value, note, tone = 'green' }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    lime: 'bg-lime-50 text-lime-800 border-lime-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-5 shadow-xs transition-all duration-300 hover:shadow-lg hover:-translate-y-1 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl font-mono">
            {value}
          </p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
      {note && <p className="mt-3 text-xs font-semibold text-slate-500">{note}</p>}
    </div>
  )
}

function FileTypeIcon({ file }) {
  const type = file?.type || ''

  if (type.startsWith('image/')) return <ImageIcon size={18} className="text-emerald-600" />
  if (type.startsWith('video/')) return <Film size={18} className="text-blue-600" />
  if (
    type.includes('zip') ||
    type.includes('compressed') ||
    /\.zip$|\.rar$|\.7z$/i.test(file?.name || '')
  ) {
    return <FileArchive size={18} className="text-amber-600" />
  }

  return <File size={18} className="text-slate-600" />
}

function ProjectCard({ delivery, activeMenuId, setActiveMenuId, onShare, onCopyLink, onDelete, onViewMessages }) {
  const menuOpen = activeMenuId === delivery.id

  return (
    <article className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:shadow-xl hover:-translate-y-1 sm:p-6 relative overflow-hidden group">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#94EC36]/20 text-[#063D2A] font-bold text-sm">
          <BriefcaseBusiness size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-bold text-slate-950 tracking-tight">
            {delivery.title || 'Untitled project'}
          </h3>
          <p className="mt-0.5 break-words text-xs text-slate-500">
            {delivery.clientName || delivery.clientEmail || 'Client not specified'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic()
            setActiveMenuId(menuOpen ? null : delivery.id)
          }}
          aria-label="Project actions"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 active:scale-95"
        >
          <MoreHorizontal size={21} />
        </button>
      </div>

      {menuOpen && (
        <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-3 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => {
              haptic()
              setActiveMenuId(null)
              onShare(delivery)
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 active:scale-95 transition"
          >
            <Share2 size={14} /> Share
          </button>

          <button
            type="button"
            onClick={() => {
              haptic()
              setActiveMenuId(null)
              onCopyLink(delivery)
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 active:scale-95 transition"
          >
            <Copy size={14} /> Copy link
          </button>

          <button
            type="button"
            onClick={() => {
              haptic(15)
              setActiveMenuId(null)
              onDelete(delivery)
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-red-600 ring-1 ring-red-100 active:scale-95 transition"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={delivery.status} />
        <span className="text-lg font-black tracking-tight text-slate-950 font-mono">
          {formatCurrency(delivery.grossAmount, delivery.currency || 'INR')}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Files
          </p>
          <p className="mt-1 text-xs font-bold text-slate-700">
            {delivery.files?.length || 0} attached
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Messages
          </p>
          <p className="mt-1 text-xs font-bold text-slate-700">
            {delivery.messages?.length || 0} threads
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            haptic()
            onViewMessages(delivery)
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
        >
          <MessageCircle size={15} /> Messages
        </button>

        <button
          type="button"
          onClick={() => {
            haptic()
            onShare(delivery)
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#063D2A] px-3 text-xs font-bold text-white transition-all hover:bg-[#094E36] active:scale-95"
        >
          Open link <ExternalLink size={14} />
        </button>
      </div>
    </article>
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
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false)
  const [activeProjectMenuId, setActiveProjectMenuId] = useState(null)
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
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }

      toastTimerRef.current = window.setTimeout(
        () => setToast(null),
        3800
      )
    }
  }

  useEffect(() => () => {
    if (toastTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  const addSelectedFiles = fileList => {
    const incoming = Array.from(fileList || [])

    if (!incoming.length) return

    const valid = incoming.filter(file => file.size <= MAX_FILE_BYTES)
    const oversizedCount = incoming.length - valid.length

    if (oversizedCount > 0) {
      notify(
        `${oversizedCount} file${oversizedCount === 1 ? '' : 's'} skipped: each file must be 100 MB or less.`,
        'error'
      )
    }

    if (!valid.length) return

    setFiles(previous => {
      const keys = new Set(
        previous.map(file => `${file.name}:${file.size}:${file.lastModified}`)
      )

      const unique = valid.filter(file => {
        const key = `${file.name}:${file.size}:${file.lastModified}`

        if (keys.has(key)) return false

        keys.add(key)
        return true
      })

      return unique.length ? [...previous, ...unique] : previous
    })
  }

  const onFilePickerChange = event => {
    addSelectedFiles(event.currentTarget.files)
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

      if (stopSnapshot) {
        stopSnapshot()
      }
    }
  }, [])

  const paid = useMemo(
    () => deliveries.filter(item => item.status === 'Paid'),
    [deliveries]
  )

  const pending = useMemo(
    () =>
      deliveries.filter(
        item => !['Paid', 'Expired', 'Cancelled'].includes(item.status)
      ),
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
      const monthDate = new Date(year, now.getMonth() - 5 + index, 1)

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

  const resetWizard = () => {
    setWizardOpen(false)
    setStep(1)
    setTitle('')
    setClientName('')
    setClientEmail('')
    setClientMessage('')
    setAmount('')
    setExpiry('7')
    setFiles([])
    setProgress(0)
    setDragging(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openWizard = () => {
    haptic()
    resetWizard()
    setWizardOpen(true)
  }

  // ACCURATE 0-100% CLOUDINARY UPLOAD PIPELINE
  const uploadToCloudinary = file =>
    new Promise((resolve, reject) => {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        reject(new Error('Cloudinary config missing.'))
        return
      }

      const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', endpoint, true)

      // ACCURATE PROGRESS TRACKING (0-100%)
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          setProgress(percent)
        }
      }

      xhr.onload = () => {
        try {
          const result = JSON.parse(xhr.responseText || '{}')
          if (xhr.status === 200 && result.secure_url) {
            const isImage = file.type.startsWith('image/')
            let previewUrl = result.secure_url

            if (isImage && result.public_id) {
              const publicId = result.public_id
              const version = result.version ? `v${result.version}/` : ''
              const extension = publicId.split('.').pop()
              const withoutExtension = publicId.includes('.')
                ? publicId.slice(0, publicId.lastIndexOf('.'))
                : publicId

              previewUrl =
                `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/` +
                `l_text:Arial_28_bold:PAYDROP%20%E2%80%A2%20PREVIEW%20COPY,co_white,o_75/` +
                `${version}${withoutExtension}.${extension}`
            }

            resolve({
              name: file.name,
              size: file.size,
              sizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
              type: file.type || 'application/octet-stream',
              rawUrl: result.secure_url,
              previewUrl,
              publicId: result.public_id || null,
              resourceType: result.resource_type || 'raw',
            })
          } else {
            reject(new Error(result?.error?.message || 'Upload error'))
          }
        } catch {
          reject(new Error('Parsing error'))
        }
      }

      xhr.onerror = () => reject(new Error('Network connection error.'))
      xhr.send(formData)
    })

  const deployVault = async () => {
    if (!user) {
      notify('Please log in before creating a vault.', 'error')
      return
    }

    const cleanTitle = title.trim()
    const numericAmount = Number(amount)

    if (!cleanTitle || !Number.isFinite(numericAmount) || numericAmount <= 0 || !files.length) {
      notify('Complete all steps accurately.', 'error')
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const uploadedFiles = []

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const uploaded = await uploadToCloudinary(file)
        uploadedFiles.push(uploaded)
      }

      const platformFee = Math.max(Math.round(numericAmount * 0.05), 1)
      const creatorPayout = Math.max(0, numericAmount - platformFee)

      let expiresAt = null
      if (expiry !== 'never') {
        const days = Number(expiry)
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      }

      const deliveryRef = await addDoc(collection(db, 'deliveries'), {
        userId: user.uid,
        userEmail: user.email || '',
        title: cleanTitle,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientMessage: clientMessage.trim(),
        grossAmount: numericAmount,
        currency,
        platformFee,
        creatorPayout,
        watermarkText: 'PAYDROP • PREVIEW COPY',
        status: 'Awaiting Payment',
        files: uploadedFiles,
        expiresAt,
        viewCount: 0,
        messages: [],
        createdAt: serverTimestamp(),
      })

      // NON-BLOCKING AUTOMATED EMAIL ROUTE MATCHING /api/send-email
      const origin = window.location.origin
      const deliveryUrl = `${origin}/d/${deliveryRef.id}`

      if (clientEmail.trim()) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail: clientEmail.trim(),
            clientName: clientName.trim() || 'Client',
            creatorName: user.displayName || user.email?.split('@')[0] || 'Creator',
            projectTitle: cleanTitle,
            portalUrl: deliveryUrl
          })
        }).catch(err => console.error("Email dispatch failed:", err))
      }

      setProgress(100)
      haptic([15, 30, 15])

      resetWizard()
      setTab('projects')
      notify('Vault deployed & link generated!')
    } catch (error) {
      console.error('Vault creation failed:', error)
      notify(error?.message || 'Could not create vault.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const deleteVault = async delivery => {
    if (!user || !delivery?.id) return
    if (!window.confirm(`Delete "${delivery.title}" permanently?`)) return

    try {
      await deleteDoc(doc(db, 'deliveries', delivery.id))
      haptic()
      notify('Project deleted.')
    } catch (error) {
      notify('Could not delete project.', 'error')
    }
  }

  const getDeliveryUrl = delivery => `${window.location.origin}/d/${delivery.id}`

  const shareVault = async delivery => {
    if (!delivery?.id) return
    const url = getDeliveryUrl(delivery)

    try {
      if (navigator.share) {
        await navigator.share({
          title: delivery.title || 'PayDrop Vault',
          text: 'View deliverables preview on PayDrop',
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        notify('Delivery link copied!')
      }
    } catch {
      copyDeliveryLink(delivery)
    }
  }

  const copyDeliveryLink = async delivery => {
    const url = getDeliveryUrl(delivery)
    try {
      await navigator.clipboard.writeText(url)
      notify('Link copied to clipboard.')
    } catch {
      window.prompt('Copy delivery link:', url)
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      haptic()
      window.location.href = '/login'
    } catch (error) {
      notify('Could not log out.', 'error')
    }
  }

  const sendReply = async () => {
    if (!user || !activeChat?.id || !reply.trim()) return

    const newMessage = {
      sender: 'creator',
      text: reply.trim(),
      createdAt: new Date().toISOString(),
    }

    try {
      await updateDoc(doc(db, 'deliveries', activeChat.id), {
        messages: [...(activeChat.messages || []), newMessage],
      })
      setReply('')
      haptic()
      notify('Reply sent.')
    } catch {
      notify('Could not send reply.', 'error')
    }
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Ankit'

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8f5] p-6">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#063D2A]/20 border-t-[#063D2A]" />
          <p className="mt-4 text-xs font-mono font-bold text-slate-500">
            INITIALIZING WORKSPACE...
          </p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8f5] p-6">
        <div className="w-full max-w-md rounded-3xl border border-white bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#063D2A] text-white">
            <ShieldCheck size={27} />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
            Sign in to PayDrop
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to manage your projects, files, and client deliveries.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#063D2A] px-5 text-sm font-bold text-white transition-all hover:bg-[#094E36]"
          >
            Continue to sign in <ArrowRight size={17} className="ml-2" />
          </Link>
        </div>
      </main>
    )
  }

  const navigation = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: BriefcaseBusiness, count: deliveries.length },
    { id: 'revisions', label: 'Messages', icon: MessageSquare, count: unread.length },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
  ]

  const maxMonthlyValue = Math.max(...monthly.map(item => item.value), 1)

  const visibleProjects =
    tab === 'revisions'
      ? filtered.filter(item => item.messages?.length)
      : filtered

  const pageTitle = navigation.find(item => item.id === tab)?.label || 'Overview'

  return (
    <main className="min-h-screen overflow-x-clip bg-[#F0F5EE] text-slate-900 selection:bg-[#94EC36] selection:text-[#063D2A]">
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { max-width: 100%; overflow-x: clip; margin: 0; }
        button, input, textarea, select { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }
        
        /* SHIMMER ANIMATION FOR WAVE LOADER */
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-4 right-4 top-4 z-[100] mx-auto flex max-w-lg items-center gap-3 rounded-full border px-4 py-3 shadow-2xl animate-in fade-in slide-in-from-top duration-300 ${
            toast.type === 'error'
              ? 'border-red-200 bg-white text-red-700'
              : 'border-[#063D2A] bg-[#063D2A] text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#94EC36] animate-pulse" />
          <span className="min-w-0 flex-1 text-xs font-bold">
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,280px)] flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl transition-transform duration-300 ease-out lg:w-[260px] ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <Link
            href="/dashboard"
            onClick={() => {
              setTab('overview')
              setMobileMenuOpen(false)
            }}
            className="flex min-w-0 items-center gap-3 group"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#94EC36] text-[#063D2A] font-black text-xl shadow-md transition-transform group-hover:scale-105">
              P
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-black tracking-tight text-slate-950">
                paydrop
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <nav className="space-y-1.5" aria-label="Main navigation">
            {navigation.map(item => {
              const Icon = item.icon
              const selected = tab === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id)
                    setMobileMenuOpen(false)
                    haptic()
                  }}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-xs font-bold transition-all ${
                    selected
                      ? 'bg-[#063D2A] text-white shadow-lg'
                      : 'text-slate-600 hover:bg-[#F0F5EE] hover:text-slate-950'
                  }`}
                >
                  <Icon size={18} className={selected ? 'text-[#94EC36]' : ''} />
                  <span className="min-w-0 flex-1">{item.label}</span>

                  {item.count > 0 && (
                    <span
                      className={`min-w-6 rounded-full px-2 py-0.5 text-center text-[10px] font-mono font-bold ${
                        selected
                          ? 'bg-[#94EC36] text-[#063D2A]'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="mt-8 rounded-3xl bg-[#F0F5EE] p-5 border border-slate-200/80">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#063D2A] shadow-xs">
              <LockKeyhole size={18} />
            </div>
            <p className="mt-3 text-xs font-bold text-slate-900">
              Deliverable Escrow
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Protect master files until client releases payment.
            </p>
            <button
              type="button"
              onClick={openWizard}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#063D2A] px-3 text-xs font-bold text-white hover:bg-[#094E36] transition active:scale-95"
            >
              <Plus size={16} className="text-[#94EC36]" /> Request payment
            </button>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={logout}
            className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT */}
      <div className="min-w-0 lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Studio Dashboard
              </p>
              <h1 className="mt-0.5 truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                {pageTitle}
              </h1>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 bg-[#F0F5EE] px-3.5 focus-within:bg-white focus-within:border-[#063D2A] transition">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search projects..."
                  className="w-32 min-w-0 bg-transparent text-xs font-medium outline-none placeholder:text-slate-400 md:w-44"
                />
              </label>

              <select
                value={currency}
                onChange={event => setCurrency(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200/80 bg-[#F0F5EE] px-3.5 text-xs font-bold text-[#063D2A] cursor-pointer"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={openWizard}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#063D2A] hover:bg-[#094E36] px-4 text-xs font-bold text-white shadow-lg transition active:scale-95"
            >
              <Plus size={16} className="text-[#94EC36]" />
              <span className="hidden sm:inline">Request payment</span>
              <span className="sm:hidden">Request</span>
            </button>

            <button
              type="button"
              onClick={() => setHeaderProfileOpen(!headerProfileOpen)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFD6A5] text-xs font-bold text-[#063D2A] border border-white shadow-xs hover:opacity-90 transition"
            >
              {initials(displayName)}
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10">
          
          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <section className="space-y-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#063D2A] uppercase tracking-wider">
                    {greeting}, {displayName}
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Studio Overview
                  </h2>
                </div>
              </div>

              {/* HERO BALANCE CARD */}
              <div className="bg-[#063D2A] rounded-[36px] p-7 sm:p-8 text-white relative overflow-hidden shadow-2xl backdrop-blur-xl">
                <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#0B4C35] rounded-full blur-2xl pointer-events-none opacity-50" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-200/80">Available balance</span>
                    <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-1 text-emerald-300 hover:text-white transition">
                      {balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                  <div>
                    <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                      {balanceVisible ? formatCurrency(totalRevenue, currency) : '••••••'}
                    </div>
                    <p className="text-xs text-emerald-200/70 mt-1">Total settled earnings protected in escrow</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MiniStat icon={Wallet} label="Paid revenue" value={balanceVisible ? formatCurrency(totalRevenue, currency) : '••••••'} tone="green" />
                <MiniStat icon={Clock3} label="Awaiting payment" value={balanceVisible ? formatCurrency(pendingValue, currency) : '••••••'} note={`${pending.length} pending`} tone="amber" />
                <MiniStat icon={BriefcaseBusiness} label="Total projects" value={String(deliveries.length)} tone="blue" />
                <MiniStat icon={MessageSquare} label="Client messages" value={String(unread.length)} tone="lime" />
              </div>

              {/* ACTIVE PROJECTS LIST */}
              <section className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Active Deliveries</h3>
                  <button onClick={() => setTab('projects')} className="text-xs font-bold text-[#063D2A] hover:underline">View all</button>
                </div>

                {dataLoading ? (
                  <div className="h-32 animate-pulse rounded-3xl bg-white" />
                ) : pending.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-white/90 rounded-[32px] border border-slate-200/80">
                    No active payment requests. Click 'Request payment' to start.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {pending.map(delivery => (
                      <ProjectCard
                        key={delivery.id}
                        delivery={delivery}
                        activeMenuId={activeProjectMenuId}
                        setActiveMenuId={setActiveProjectMenuId}
                        onShare={shareVault}
                        onCopyLink={copyDeliveryLink}
                        onDelete={deleteVault}
                        onViewMessages={item => {
                          setActiveChat(item)
                          setTab('revisions')
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            </section>
          )}

          {/* PROJECTS TAB */}
          {tab === 'projects' && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black text-slate-950 tracking-tight">All Projects</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleProjects.map(delivery => (
                  <ProjectCard
                    key={delivery.id}
                    delivery={delivery}
                    activeMenuId={activeProjectMenuId}
                    setActiveMenuId={setActiveProjectMenuId}
                    onShare={shareVault}
                    onCopyLink={copyDeliveryLink}
                    onDelete={deleteVault}
                    onViewMessages={item => {
                      setActiveChat(item)
                      setTab('revisions')
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* MESSAGES TAB */}
          {tab === 'revisions' && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black text-slate-950 tracking-tight">Revisions & Messages</h2>
              {/* Chat Thread Interface */}
            </section>
          )}

        </div>
      </div>

      {/* FULLSCREEN VAULT CREATION WIZARD WITH HIGH-TECH WAVE LOADER */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 bg-[#063D2A]/40 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="max-w-2xl w-full mx-auto bg-white border border-slate-200/80 rounded-[40px] flex-1 p-6 sm:p-8 shadow-2xl flex flex-col justify-between overflow-y-auto relative">
            
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#94EC36] animate-pulse" />
                    <span className="text-[11px] font-extrabold text-[#063D2A] uppercase tracking-widest font-mono">STEP {step} OF 3</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Request a payment</h3>
                </div>
                <button 
                  onClick={() => !uploading && resetWizard()} 
                  disabled={uploading}
                  className="w-10 h-10 rounded-full bg-[#F0F5EE] hover:bg-slate-200 flex items-center justify-center text-slate-600 transition active:scale-95 disabled:opacity-30"
                >
                  <X size={20} />
                </button>
              </div>

              {/* PROGRESS BAR */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#063D2A] h-full transition-all duration-300"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>

              {/* STEP 1: DELIVERABLES */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <label className="text-xs font-bold text-slate-700 block">Attach Deliverables (ZIP, Videos, Code, PDFs) *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={onFilePickerChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-3xl p-10 text-center transition-all border-slate-300 bg-[#F0F5EE]/60 hover:border-[#063D2A] cursor-pointer"
                  >
                    <UploadCloud className="w-10 h-10 text-[#063D2A] mx-auto mb-3 animate-bounce" />
                    <span className="text-sm font-bold text-slate-800 block">Click to upload files</span>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2 bg-white p-4 rounded-3xl border border-slate-200 max-h-40 overflow-y-auto">
                      {files.map((f, i) => (
                        <div key={i} className="flex justify-between text-xs items-center px-2 py-1 bg-[#F0F5EE] rounded-xl">
                          <span className="truncate font-semibold text-slate-800">{f.name}</span>
                          <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-600">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: DETAILS */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <input
                    type="text"
                    placeholder="Project Title *"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#F0F5EE] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#063D2A]"
                  />
                  <input
                    type="email"
                    placeholder="Client Email *"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#F0F5EE] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#063D2A]"
                  />
                  <input
                    type="number"
                    placeholder="Escrow Amount *"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#F0F5EE] border border-slate-200 rounded-2xl text-xs font-bold font-mono focus:outline-none focus:border-[#063D2A]"
                  />
                </div>
              )}

              {/* STEP 3: WAVE ANIMATED DEPLOYMENT */}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  {uploading ? (
                    <div className="p-8 bg-[#063D2A] rounded-[32px] text-white space-y-6 relative overflow-hidden shadow-2xl border border-emerald-800">
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-[#94EC36] animate-spin" />
                          <div>
                            <h4 className="text-sm font-black text-white">Deploying Vault...</h4>
                            <p className="text-[10px] text-emerald-200/80 font-mono">Watermark Pipeline Active</p>
                          </div>
                        </div>
                        <span className="text-2xl font-black font-mono text-[#94EC36]">{progress}%</span>
                      </div>

                      {/* FLUID WAVE LOADER BAR */}
                      <div className="relative w-full h-4 bg-emerald-950 rounded-full overflow-hidden p-0.5 border border-emerald-700/50">
                        <div 
                          className="h-full bg-gradient-to-r from-[#063D2A] via-[#94EC36] to-[#063D2A] rounded-full transition-all duration-300 relative overflow-hidden"
                          style={{ width: `${progress}%` }}
                        >
                          <div className="absolute inset-0 bg-white/30 animate-[shimmer_1.5s_infinite] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.6)_50%,rgba(255,255,255,0)_100%)]" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-[#F0F5EE] rounded-3xl space-y-3 text-xs font-semibold">
                      <div className="flex justify-between font-black text-sm text-slate-900 border-b border-slate-200 pb-3">
                        <span>{title}</span>
                        <span className="font-mono">{formatCurrency(amount, currency)}</span>
                      </div>
                      <p className="text-slate-600">Client: {clientEmail}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!uploading && (
              <div className="pt-6 border-t border-slate-100 flex gap-3">
                {step > 1 && (
                  <button onClick={() => setStep(prev => prev - 1)} className="w-1/3 py-4 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl">
                    Back
                  </button>
                )}
                {step < 3 ? (
                  <button onClick={() => setStep(prev => prev + 1)} className="flex-1 py-4 bg-[#063D2A] text-white font-bold text-xs rounded-2xl">
                    Next Step
                  </button>
                ) : (
                  <button onClick={deployVault} className="flex-1 py-4 bg-[#063D2A] text-white font-black text-xs rounded-2xl">
                    Create & Deploy Vault
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </main>
  )
}
