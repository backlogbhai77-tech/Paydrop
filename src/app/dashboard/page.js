'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { auth, db } from '../../lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  addDoc, arrayUnion, collection, deleteDoc, doc, onSnapshot, query,
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

function haptic(pattern = 12) {
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

function StatusBadge({ status, delivery }) {
  const isDemoPaid = status === 'Paid' && delivery?.paymentGatewayId === 'DEMO_SIMULATED_NO_FUNDS'
  const paid = status === 'Paid'
  const expired = status === 'Expired' || status === 'Cancelled'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all duration-300 ${
        paid
          ? 'bg-emerald-100 text-emerald-800 shadow-xs'
          : expired
            ? 'bg-slate-100 text-slate-500'
            : 'bg-amber-100 text-amber-800 animate-pulse'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          paid
            ? 'bg-emerald-600'
            : expired
              ? 'bg-slate-400'
              : 'bg-amber-600'
        }`}
      />
      {isDemoPaid ? 'Demo Unlocked' : (status || 'Pending')}
    </span>
  )
}

function MiniStat({ icon: Icon, label, value, note, tone = 'green' }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-900',
    lime: 'bg-lime-100 text-lime-900',
    blue: 'bg-blue-100 text-blue-900',
    amber: 'bg-amber-100 text-amber-900',
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(5,150,105,0.08)] sm:p-6">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-50/50 transition-transform duration-500 group-hover:scale-150" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform duration-300 group-hover:rotate-6 ${tones[tone]}`}>
          <Icon size={22} />
        </div>
      </div>
      {note && <p className="relative z-10 mt-3 text-xs font-semibold text-slate-500">{note}</p>}
    </div>
  )
}

function FileTypeIcon({ file }) {
  const type = file?.type || ''

  if (type.startsWith('image/')) return <ImageIcon size={18} className="text-emerald-700" />
  if (type.startsWith('video/')) return <Film size={18} className="text-blue-700" />
  if (
    type.includes('zip') ||
    type.includes('compressed') ||
    /\.zip$|\.rar$|\.7z$/i.test(file?.name || '')
  ) {
    return <FileArchive size={18} className="text-amber-700" />
  }

  return <File size={18} className="text-slate-700" />
}

function ProjectCard({ delivery, activeMenuId, setActiveMenuId, onShare, onCopyLink, onDelete, onViewMessages, onPreview }) {
  const menuOpen = activeMenuId === delivery.id

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-lime-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 shadow-inner">
          <BriefcaseBusiness size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-bold text-slate-950 transition-colors group-hover:text-emerald-950">
            {delivery.title || 'Untitled project'}
          </h3>
          <p className="mt-1 break-words text-xs font-medium text-slate-500">
            {delivery.clientName || delivery.clientEmail || 'Client not specified'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic(6)
            setActiveMenuId(menuOpen ? null : delivery.id)
          }}
          aria-label="Project actions"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
        >
          <MoreHorizontal size={21} />
        </button>
      </div>

      {menuOpen && (
        <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-3 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => {
              setActiveMenuId(null)
              onShare(delivery)
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <Share2 size={14} /> Share
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMenuId(null)
              onCopyLink(delivery)
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <Copy size={14} /> Copy link
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMenuId(null)
              onDelete(delivery)
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-red-600 ring-1 ring-red-100 hover:bg-red-50"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={delivery.status} delivery={delivery} />
        <span className="text-lg font-black tracking-tight text-slate-950">
          {formatCurrency(delivery.grossAmount, delivery.currency || 'INR')}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Files
          </p>
          <p className="mt-1 text-xs font-bold text-slate-700">
            {delivery.files?.length || 0} attached
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
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
            haptic(8)
            onViewMessages(delivery)
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300"
        >
          <MessageCircle size={15} /> Messages
        </button>

        <button
          type="button"
          onClick={() => {
            haptic(10)
            onPreview(delivery)
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-3 text-xs font-bold text-white transition-all hover:bg-emerald-900 shadow-sm"
        >
          <Eye size={15} /> Preview
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
  const [projectStatusFilter, setProjectStatusFilter] = useState('all')
  const [projectSort, setProjectSort] = useState('newest')
  const [previewDelivery, setPreviewDelivery] = useState(null)
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
  const [uploadPhase, setUploadPhase] = useState('Preparing your vault…')

  const [activeChat, setActiveChat] = useState(null)
  const [reply, setReply] = useState('')

  const toastTimerRef = useRef(null)

  const notify = (message, type = 'success') => {
    setToast({ message, type })
    haptic(type === 'error' ? [30, 50, 30] : 15)

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
              'Could not load projects. Check your connection and Firestore permissions.',
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
    setUploadPhase('Preparing your vault…')
    setDragging(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openWizard = () => {
    haptic(15)
    resetWizard()
    setWizardOpen(true)
  }

  const uploadToCloudinary = (file, fileIndex, totalFiles) =>
    new Promise((resolve, reject) => {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        reject(
          new Error(
            'Cloudinary configuration is missing. Check your environment variables.'
          )
        )
        return
      }

      const endpoint =
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const xhr = new XMLHttpRequest()
      let finished = false

      const fail = message => {
        if (finished) return
        finished = true
        reject(new Error(message))
      }

      xhr.open('POST', endpoint, true)
      xhr.timeout = 180000

      xhr.upload.onprogress = event => {
        if (!event.lengthComputable || !event.total || totalFiles < 1) return

        // Reserve progress ranges for upload, Firestore save and email dispatch.
        // Each file contributes only its share, so progress never jumps backwards.
        const currentFileFraction = Math.min(1, event.loaded / event.total)
        const overallFraction = (fileIndex + currentFileFraction) / totalFiles
        const nextProgress = Math.round(5 + overallFraction * 80)
        setProgress(previous => Math.max(previous, Math.min(85, nextProgress)))
      }

      xhr.onload = () => {
        if (finished) return

        let result

        try {
          result = JSON.parse(xhr.responseText || '{}')
        } catch {
          fail('Cloudinary returned an unreadable response.')
          return
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          const message =
            result?.error?.message ||
            `Upload failed with HTTP ${xhr.status}.`

          fail(message)
          return
        }

        if (!result.secure_url) {
          fail('Cloudinary did not return a file URL.')
          return
        }

        finished = true

        const isImage = file.type.startsWith('image/')
        let previewUrl = result.secure_url

        if (isImage && result.public_id) {
          const publicId = result.public_id
          const version = result.version ? `v${result.version}/` : ''
          // Cloudinary public_id usually has no extension; use the returned format.
          const extension = result.format || file.name.split('.').pop() || ''
          const withoutExtension = extension && publicId.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
            ? publicId.slice(0, -(extension.length + 1))
            : publicId
          const formattedPublicId = extension ? `${withoutExtension}.${extension}` : withoutExtension

          previewUrl =
            `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/` +
            `l_text:Arial_28_bold:PAYDROP%20%E2%80%A2%20PREVIEW%20COPY,co_white,o_75/` +
            `${version}${formattedPublicId}`
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
      }

      xhr.onerror = () => fail(
        'Network error while uploading. Check your internet connection.'
      )

      xhr.ontimeout = () => fail(
        'Upload timed out. Try again with a smaller file or a better connection.'
      )

      xhr.onabort = () => fail('Upload was cancelled.')

      try {
        xhr.send(formData)
      } catch {
        fail('Could not start the upload request.')
      }
    })

  const deployVault = async () => {
    if (!user) {
      notify('Please log in before creating a vault.', 'error')
      return
    }

    const cleanTitle = title.trim()
    const numericAmount = Number(amount)

    if (!cleanTitle) {
      notify('Enter a project name.', 'error')
      setStep(1)
      return
    }

    if (clientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      notify('Enter a valid client email address, or leave it blank.', 'error')
      setStep(1)
      return
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      notify('Enter a valid amount greater than zero.', 'error')
      setStep(1)
      return
    }

    if (!files.length) {
      notify('Select at least one file before continuing.', 'error')
      setStep(2)
      return
    }

    if (files.some(file => file.size > MAX_FILE_BYTES)) {
      notify('One or more files exceed the 100 MB limit.', 'error')
      setStep(2)
      return
    }

    if (uploading) return

    setUploading(true)
    setProgress(5)
    setUploadPhase('Preparing files…')

    let emailSent = false
    let emailFailed = false

    try {
      const uploadedFiles = []

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]

        setUploadPhase(`Uploading file ${index + 1} of ${files.length}: ${file.name}`)

        const uploaded = await uploadToCloudinary(file, index, files.length)
        uploadedFiles.push(uploaded)

        setProgress(Math.max(5, Math.round(5 + ((index + 1) / files.length) * 80)))
      }

      setProgress(88)
      setUploadPhase('Saving project details…')

      const platformFee = Math.max(
        Math.round(numericAmount * 0.05),
        currency === 'INR' ? 1 : 1
      )

      const creatorPayout = Math.max(
        0,
        numericAmount - platformFee
      )

      let expiresAt = null

      if (expiry !== 'never') {
        const days = Number(expiry)

        if (!Number.isFinite(days) || days <= 0) {
          throw new Error('Choose a valid expiry period.')
        }

        expiresAt = new Date(
          Date.now() + days * 24 * 60 * 60 * 1000
        ).toISOString()
      }

      // Firestore's network queue can remain pending on a bad connection. Bound the
      // UI wait so the wizard never sits indefinitely at 88%.
      const savePromise = addDoc(collection(db, 'deliveries'), {
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
      let saveTimeoutId
      const deliveryRef = await Promise.race([
        savePromise,
        new Promise((_, reject) => {
          saveTimeoutId = window.setTimeout(() => reject(new Error(
            'Saving the vault is taking too long. Check your connection and Projects before retrying to avoid a duplicate.'
          )), 30000)
        }),
      ]).finally(() => window.clearTimeout(saveTimeoutId))

      setProgress(92)
      setUploadPhase('Project saved. Preparing client notification…')

      const origin = window.location.origin
      const deliveryUrl = `${origin}/d/${deliveryRef.id}`

      if (clientEmail.trim()) {
        setUploadPhase('Sending client email…')
        setProgress(96)
        const controller = new AbortController()
        const emailTimeout = window.setTimeout(() => controller.abort(), 15000)

        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              portalUrl: deliveryUrl,
              clientEmail: clientEmail.trim(),
              clientName: clientName.trim(),
              projectTitle: cleanTitle,
            }),
          })

          const emailResult = await response.json().catch(() => ({}))
          if (!response.ok || emailResult?.success === false || emailResult?.ok === false) {
            emailFailed = true
            console.error('Client email request failed:', response.status, emailResult)
          } else {
            emailSent = true
          }
        } catch (emailError) {
          emailFailed = true
          console.error('Client email error:', emailError)
        } finally {
          window.clearTimeout(emailTimeout)
        }
      }

      setProgress(100)
      setUploadPhase('Vault created')
      haptic([20, 60, 20, 80])

      resetWizard()
      setTab('projects')
      if (emailFailed) {
        notify('Vault created, but the email could not be confirmed. Copy the link and share it manually.', 'error')
      } else if (emailSent) {
        notify('Vault created and email request accepted.')
      } else {
        notify('Vault created successfully.')
      }
    } catch (error) {
      console.error('Vault creation failed:', error)
      setUploadPhase('Creation failed')

      notify(
        error?.message || 'Could not create the vault. Please try again.',
        'error'
      )
    } finally {
      setUploading(false)
    }
  }

  const deleteVault = async delivery => {
    if (!user || !delivery?.id) return

    const confirmed = window.confirm(
      `Delete "${delivery.title || 'this project'}"? This cannot be undone.`
    )

    if (!confirmed) return

    try {
      await deleteDoc(doc(db, 'deliveries', delivery.id))
      haptic(20)
      notify('Project deleted.')
    } catch (error) {
      console.error('Delete failed:', error)
      notify('Could not delete this project. Check your permissions.', 'error')
    }
  }

  const getDeliveryUrl = delivery =>
    `${window.location.origin}/d/${delivery.id}`

  const shareVault = async delivery => {
    if (!delivery?.id) return

    const url = getDeliveryUrl(delivery)
    haptic(10)

    try {
      if (navigator.share) {
        await navigator.share({
          title: delivery.title || 'PayDrop delivery',
          text: 'View your PayDrop delivery.',
          url,
        })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        notify('Delivery link copied.')
      } else {
        window.prompt('Copy this delivery link:', url)
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error)
        notify('Could not share the link.', 'error')
      }
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      haptic(25)
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      notify('Could not log out. Please try again.', 'error')
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
        // Atomic append avoids overwriting a client message received at the same time.
        messages: arrayUnion(newMessage),
      })

      setReply('')
      haptic(15)
      notify('Reply sent.')
    } catch (error) {
      console.error('Reply failed:', error)
      notify('Could not send the reply. Please retry.', 'error')
    }
  }

  const copyDeliveryLink = async delivery => {
    const url = getDeliveryUrl(delivery)
    haptic(10)

    try {
      await navigator.clipboard.writeText(url)
      notify('Link copied to clipboard.')
    } catch {
      window.prompt('Copy your delivery link:', url)
    }
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours()

    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const displayName =
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Creator'

  const visibleProjects = useMemo(() => {
    let list = tab === 'revisions'
      ? filtered.filter(item => item.messages?.length)
      : filtered
    if (tab === 'projects' && projectStatusFilter !== 'all') {
      list = list.filter(item => {
        if (projectStatusFilter === 'paid') return item.status === 'Paid'
        if (projectStatusFilter === 'pending') return !['Paid', 'Expired', 'Cancelled'].includes(item.status)
        if (projectStatusFilter === 'closed') return ['Expired', 'Cancelled'].includes(item.status)
        return true
      })
    }
    return [...list].sort((a, b) => {
      if (projectSort === 'title') return (a.title || '').localeCompare(b.title || '')
      if (projectSort === 'amount-high') return (Number(b.grossAmount) || 0) - (Number(a.grossAmount) || 0)
      const at = a.createdAt?.seconds || 0
      const bt = b.createdAt?.seconds || 0
      return projectSort === 'oldest' ? at - bt : bt - at
    })
  }, [filtered, tab, projectStatusFilter, projectSort])

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8f5] p-6 animate-in fade-in duration-300">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700 shadow-lg" />
          <p className="mt-4 text-sm font-bold text-slate-600 tracking-wide">
            Loading PayDrop Workspace…
          </p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8f5] p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-md rounded-[32px] border border-white/80 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-950 text-white shadow-md">
            <ShieldCheck size={30} />
          </div>
          <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-950">
            Sign in to PayDrop
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to manage your projects, files, and client deliveries securely.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-emerald-950 px-5 text-sm font-bold text-white transition-all hover:bg-emerald-900 shadow-md hover:scale-[1.01]"
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

  const maxMonthlyValue = Math.max(
    ...monthly.map(item => item.value),
    1
  )

  const pageTitle =
    navigation.find(item => item.id === tab)?.label || 'Overview'

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f5f8f5] text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          max-width: 100%;
          overflow-x: clip;
        }

        body {
          margin: 0;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        button:focus-visible,
        a:focus-visible,
        input:focus-visible,
        textarea:focus-visible,
        select:focus-visible {
          outline: 3px solid rgba(5, 150, 105, 0.35);
          outline-offset: 3px;
        }

        .pd-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5d1 transparent;
        }

        .pd-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .pd-scrollbar::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #cbd5d1;
        }

        @keyframes waveAnimation {
          0% { transform: translateX(0) translateZ(0) scaleY(1); }
          50% { transform: translateX(-25%) translateZ(0) scaleY(1.15); }
          100% { transform: translateX(-50%) translateZ(0) scaleY(1); }
        }

        .wave-container {
          position: relative;
          width: 100%;
          height: 70px;
          overflow: hidden;
          background: linear-gradient(135deg, #022c22 0%, #064e3b 100%);
          border-radius: 20px;
        }

        .wave {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 200%;
          height: 100%;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 88'%3E%3Cpath d='M800 56c-80 0-160-32-240-32s-160 32-240 32-160-32-240-32-160 32-240 32v32h800z' fill='%2310b981' fill-opacity='0.25'/%3E%3C/svg%3E");
          background-repeat: repeat-x;
          animation: waveAnimation 7s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite;
        }

        .wave:nth-of-type(2) {
          bottom: 5px;
          animation: waveAnimation 5s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite reverse;
          opacity: 0.6;
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-4 right-4 top-4 z-[100] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === 'error'
              ? 'border-red-200 bg-white text-red-700'
              : 'border-emerald-200 bg-white text-emerald-900'
          }`}
        >
          {toast.type === 'error'
            ? <CircleHelp size={19} className="shrink-0 text-red-600" />
            : <Check size={19} className="shrink-0 text-emerald-600" />}

          <span className="min-w-0 flex-1 text-sm font-bold">
            {toast.message}
          </span>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,280px)] flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 ease-out lg:w-[260px] ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 shadow-xl lg:shadow-none`}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <Link
            href="/dashboard"
            onClick={() => {
              setTab('overview')
              setMobileMenuOpen(false)
              haptic(8)
            }}
            className="flex min-w-0 items-center gap-3 group"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-950 text-white shadow-md transition-transform duration-300 group-hover:scale-105">
              <ShieldCheck size={22} />
            </span>

            <span className="min-w-0">
              <span className="block text-lg font-black tracking-tight text-slate-950">
                PayDrop
              </span>
              <span className="block text-[10px] font-extrabold tracking-widest text-emerald-800">
                CREATOR WORKSPACE
              </span>
            </span>
          </Link>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="pd-scrollbar flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[11px] font-black uppercase tracking-[.14em] text-slate-400">
            Workspace
          </p>

          <nav className="mt-3 space-y-1.5" aria-label="Main navigation">
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
                    haptic(10)
                  }}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-sm font-bold transition-all duration-200 ${
                    selected
                      ? 'bg-emerald-950 text-white shadow-[0_6px_20px_rgba(6,61,42,0.2)] scale-[1.01]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                  aria-current={selected ? 'page' : undefined}
                >
                  <Icon size={19} className="shrink-0" />
                  <span className="min-w-0 flex-1">{item.label}</span>

                  {item.count > 0 && (
                    <span
                      className={`min-w-6 rounded-lg px-1.5 py-1 text-center text-xs font-black ${
                        selected
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="mt-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-lime-50 p-4 border border-emerald-100/80 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-950 shadow-xs">
              <LockKeyhole size={18} />
            </div>

            <p className="mt-3 text-sm font-extrabold text-slate-950">
              Your work, organized
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Keep client deliveries and project conversations secure.
            </p>

            <button
              type="button"
              onClick={openWizard}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-950 px-3 text-xs font-bold text-white hover:bg-emerald-900 shadow-sm transition-transform active:scale-95"
            >
              <Plus size={16} /> New vault
            </button>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={() => {
              haptic(8)
              setAssistantOpen(true)
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <CircleHelp size={17} />
            Help & support
            <ChevronRight size={15} className="ml-auto" />
          </button>

          <button
            type="button"
            onClick={logout}
            className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => {
                haptic(10)
                setMobileMenuOpen(true)
              }}
              aria-label="Open navigation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">
                WORKSPACE / {pageTitle}
              </p>
              <h1 className="mt-0.5 truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                {pageTitle}
              </h1>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-600 shadow-2xs">
                <Search size={17} className="shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search projects"
                  aria-label="Search projects"
                  className="w-32 min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400 md:w-44 font-medium"
                />
              </label>

              <select
                aria-label="Currency"
                value={currency}
                onChange={event => {
                  haptic(8)
                  setCurrency(event.target.value)
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
              </select>
            </div>

            <button
              type="button"
              onClick={openWizard}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-3.5 text-xs font-bold text-white hover:bg-emerald-900 shadow-md transition-all hover:scale-105 active:scale-95 sm:px-4"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New vault</span>
              <span className="sm:hidden">Create</span>
            </button>

            <button
              type="button"
              onClick={() => {
                haptic(8)
                setHeaderProfileOpen(!headerProfileOpen)
              }}
              aria-label="Open profile menu"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-950 ring-2 ring-emerald-300 shadow-xs transition-transform hover:scale-105"
            >
              {initials(displayName)}
            </button>
          </div>

          <div className="flex gap-2 px-4 pb-3 sm:hidden">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search projects"
                aria-label="Search projects"
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            <select
              aria-label="Currency"
              value={currency}
              onChange={event => setCurrency(event.target.value)}
              className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>

          {headerProfileOpen && (
            <div className="absolute right-4 top-[68px] z-40 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:right-6 animate-in fade-in zoom-in-95 duration-150">
              <p className="truncate px-3 py-2 text-xs font-extrabold text-slate-900">
                {displayName}
              </p>
              <p className="truncate px-3 pb-3 text-[11px] text-slate-500 border-b border-slate-100">
                {user.email}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setHeaderProfileOpen(false)
                    logout()
                  }}
                  className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          )}
        </header>

        <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10">
          {tab === 'overview' && (
            <section className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                    {greeting}, {displayName}
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Your business at a glance
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                    Your business snapshot, recent activity and the next actions that need your attention.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openWizard}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-950 px-4 text-xs font-bold text-white hover:bg-emerald-900 shadow-md transition-transform hover:scale-105"
                >
                  <Plus size={16} /> Create a delivery
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MiniStat
                  icon={Wallet}
                  label="Paid revenue"
                  value={balanceVisible ? formatCurrency(totalRevenue, currency) : '••••••'}
                  note="Based on projects marked paid"
                  tone="green"
                />
                <MiniStat
                  icon={Clock3}
                  label="Awaiting payment"
                  value={balanceVisible ? formatCurrency(pendingValue, currency) : '••••••'}
                  note={`${pending.length} active request${pending.length === 1 ? '' : 's'}`}
                  tone="amber"
                />
                <MiniStat
                  icon={BriefcaseBusiness}
                  label="Total projects"
                  value={String(deliveries.length)}
                  note="All delivery records"
                  tone="blue"
                />
                <MiniStat
                  icon={MessageSquare}
                  label="Client messages"
                  value={String(unread.length)}
                  note="Projects with a latest client message"
                  tone="lime"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
                <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">
                        Revenue overview
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Paid projects by month · {currency}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        haptic(6)
                        setBalanceVisible(!balanceVisible)
                      }}
                      aria-label={balanceVisible ? 'Hide revenue values' : 'Show revenue values'}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      {balanceVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="mt-6 flex h-44 items-end gap-3 sm:h-48 sm:gap-5">
                    {monthly.map(item => {
                      const height = item.value
                        ? Math.max(8, (item.value / maxMonthlyValue) * 100)
                        : 3

                      return (
                        <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 group">
                          <div className="flex w-full flex-1 items-end justify-center">
                            <div
                              title={
                                balanceVisible
                                  ? formatCurrency(item.value, currency)
                                  : 'Revenue hidden'
                              }
                              className={`w-full max-w-10 rounded-t-xl transition-all duration-500 group-hover:bg-emerald-600 ${
                                item.value
                                  ? 'bg-emerald-900 shadow-xs'
                                  : 'bg-slate-100'
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-700">
                            {item.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">
                        Recent projects
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Your latest delivery activity
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        haptic(8)
                        setTab('projects')
                      }}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors"
                    >
                      View all <ArrowRight size={14} />
                    </button>
                  </div>

                  <div className="mt-4 space-y-1">
                    {dataLoading ? (
                      <div className="space-y-3 py-3">
                        {[1, 2, 3].map(item => (
                          <div key={item} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                        ))}
                      </div>
                    ) : deliveries.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-xs font-bold text-slate-800">
                          No projects yet
                        </p>
                        <button
                          type="button"
                          onClick={openWizard}
                          className="mt-3 min-h-9 rounded-xl bg-emerald-950 px-3 text-xs font-bold text-white shadow-sm"
                        >
                          Create first vault
                        </button>
                      </div>
                    ) : (
                      deliveries.slice(0, 4).map(delivery => (
                        <button
                          type="button"
                          key={delivery.id}
                          onClick={() => {
                            haptic(8)
                            setActiveChat(delivery)
                            setTab('revisions')
                          }}
                          className="flex min-h-[64px] w-full min-w-0 items-center gap-3 rounded-2xl px-2 text-left transition-all hover:bg-slate-50"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                            <File size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-900">
                              {delivery.title || 'Untitled project'}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {delivery.clientName || delivery.clientEmail || 'Client not specified'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-bold text-slate-800">
                              {formatCurrency(delivery.grossAmount, delivery.currency || 'INR')}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <section>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">
                      Needs your attention
                    </h3>
                    <p className="text-xs text-slate-500">
                      Active deliveries awaiting payment or action
                    </p>
                  </div>
                </div>

                {dataLoading ? (
                  <div className="h-24 animate-pulse rounded-3xl bg-white" />
                ) : pending.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-5 text-center">
                    <Check size={20} className="mx-auto text-emerald-700" />
                    <p className="mt-1.5 text-xs font-bold text-slate-800">
                      No active payment requests
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {pending.slice(0, 5).map(delivery => (
                      <div key={delivery.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                          <Clock3 size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{delivery.title || 'Untitled project'}</p>
                          <p className="truncate text-xs text-slate-500">{delivery.clientName || delivery.clientEmail || 'Client not specified'} · {formatCurrency(delivery.grossAmount, delivery.currency || 'INR')}</p>
                        </div>
                        <StatusBadge status={delivery.status} delivery={delivery} />
                        <button type="button" onClick={() => setPreviewDelivery(delivery)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50">
                          <Eye size={14} /> Preview
                        </button>
                      </div>
                    ))}
                    {pending.length > 5 && (
                      <button type="button" onClick={() => setTab('projects')} className="w-full px-4 py-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
                        View all {pending.length} pending projects <ArrowRight size={13} className="ml-1 inline" />
                      </button>
                    )}
                  </div>
                )}
              </section>
            </section>
          )}

          {tab === 'projects' && (
            <section className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                    Your workspace
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    All projects
                  </h2>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Manage your delivery links, client requests, and project files.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openWizard}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-950 px-4 text-xs font-bold text-white hover:bg-emerald-900 shadow-md transition-transform hover:scale-105"
                >
                  <Plus size={16} /> Create project
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <p className="text-xs font-bold text-slate-400">All projects</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{deliveries.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <p className="text-xs font-bold text-slate-400">Awaiting payment</p>
                  <p className="mt-1 text-xl font-black text-amber-700">{pending.length}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:col-span-1">
                  <p className="text-xs font-bold text-slate-400">Marked paid</p>
                  <p className="mt-1 text-xl font-black text-emerald-700">{paid.length}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                <label className="relative min-w-0 flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search project, client or email…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                </label>
                <select value={projectStatusFilter} onChange={event => setProjectStatusFilter(event.target.value)} aria-label="Filter projects by status" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500">
                  <option value="all">All statuses</option><option value="pending">Awaiting payment</option><option value="paid">Paid / demo unlocked</option><option value="closed">Expired / cancelled</option>
                </select>
                <select value={projectSort} onChange={event => setProjectSort(event.target.value)} aria-label="Sort projects" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500">
                  <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Project name</option><option value="amount-high">Highest amount</option>
                </select>
              </div>

              {dataLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map(item => (
                    <div
                      key={item}
                      className="h-56 animate-pulse rounded-3xl bg-white"
                    />
                  ))}
                </div>
              ) : visibleProjects.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-10">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                    {search ? <Search size={22} /> : <BriefcaseBusiness size={22} />}
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-950">
                    {search ? 'No matching projects' : 'No projects yet'}
                  </h3>
                  {!search && (
                    <button
                      type="button"
                      onClick={openWizard}
                      className="mt-4 min-h-10 rounded-xl bg-emerald-950 px-4 text-xs font-bold text-white shadow-sm"
                    >
                      Create your first vault
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleProjects.map(delivery => (
                    <ProjectCard
                      key={delivery.id}
                      delivery={delivery}
                      activeMenuId={activeProjectMenuId}
                      setActiveMenuId={setActiveProjectMenuId}
                      onShare={shareVault}
                      onPreview={setPreviewDelivery}
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
          )}

          {tab === 'revisions' && (
            <section className="space-y-6 animate-in fade-in duration-300">
              <div>
                <p className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                  Client communication
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Messages & revisions
                </h2>
                <p className="mt-1.5 text-xs text-slate-500">
                  Keep project feedback connected to the relevant delivery.
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
                <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                  <div className="border-b border-slate-100 p-4 sm:p-5">
                    <h3 className="text-sm font-bold text-slate-950">
                      Project conversations
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {deliveries.filter(item => item.messages?.length).length} active threads
                    </p>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto pd-scrollbar">
                    {deliveries.filter(item => item.messages?.length).length === 0 ? (
                      <div className="p-6 text-center">
                        <MessageSquare size={22} className="mx-auto text-slate-300" />
                        <p className="mt-2 text-xs font-bold text-slate-800">
                          No conversations yet
                        </p>
                      </div>
                    ) : (
                      deliveries
                        .filter(item => item.messages?.length)
                        .map(delivery => {
                          const lastMessage =
                            delivery.messages[delivery.messages.length - 1]

                          const selected = activeChat?.id === delivery.id

                          return (
                            <button
                              key={delivery.id}
                              type="button"
                              onClick={() => {
                                haptic(8)
                                setActiveChat(delivery)
                              }}
                              className={`flex min-h-[76px] w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors sm:px-5 ${
                                selected
                                  ? 'bg-emerald-50/80 border-l-4 border-l-emerald-600'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xs font-black text-emerald-900 shadow-2xs">
                                {initials(delivery.clientName || 'Client')}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-900">
                                  {delivery.title || 'Untitled project'}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                  {lastMessage?.text || 'Attachment or message'}
                                </p>
                              </div>

                              {lastMessage?.sender === 'client' && (
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
                              )}
                            </button>
                          )
                        })
                    )}
                  </div>
                </section>

                <section className="flex min-h-[380px] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                  {!activeChat ? (
                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <MessageCircle size={22} />
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-slate-900">
                        Choose a conversation
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Select a project from the left to view messages.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 border-b border-slate-100 p-4 sm:p-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xs font-black text-emerald-900">
                          {initials(activeChat.clientName || 'Client')}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-slate-950">
                            {activeChat.title || 'Project conversation'}
                          </h3>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {activeChat.clientName || activeChat.clientEmail || 'Client'}
                          </p>
                        </div>

                        <StatusBadge status={activeChat.status} />
                      </div>

                      <div className="pd-scrollbar flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4 sm:p-5">
                        {(activeChat.messages || []).map((message, index) => {
                          const creatorMessage = message.sender === 'creator'

                          return (
                            <div
                              key={`${message.createdAt || 'message'}-${index}`}
                              className={`flex animate-in fade-in slide-in-from-bottom-1 duration-200 ${creatorMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] shadow-2xs ${
                                  creatorMessage
                                    ? 'rounded-br-sm bg-emerald-950 text-white'
                                    : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
                                }`}
                              >
                                <p className={`mb-1 text-[10px] font-extrabold ${
                                  creatorMessage ? 'text-emerald-200' : 'text-slate-400'
                                }`}>
                                  {creatorMessage ? 'You' : 'Client'}
                                </p>

                                <p className="whitespace-pre-wrap break-words text-xs leading-5">
                                  {message.text || ''}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <form
                        className="flex items-end gap-2 border-t border-slate-100 p-3 sm:p-4 bg-white"
                        onSubmit={event => {
                          event.preventDefault()
                          sendReply()
                        }}
                      >
                        <textarea
                          value={reply}
                          onChange={event => setReply(event.target.value)}
                          rows={2}
                          placeholder="Write a message…"
                          aria-label="Write a reply"
                          className="min-h-11 min-w-0 flex-1 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-emerald-600 shadow-2xs"
                        />

                        <button
                          type="submit"
                          disabled={!reply.trim()}
                          aria-label="Send message"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-950 text-white transition-all hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm"
                        >
                          <Send size={16} />
                        </button>
                      </form>
                    </>
                  )}
                </section>
              </div>
            </section>
          )}

          {tab === 'wallet' && (
            <section className="space-y-6 animate-in fade-in duration-300">
              <div>
                <p className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                  Financial overview
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Wallet & earnings
                </h2>
                <p className="mt-1.5 text-xs text-slate-500">
                  Review amounts recorded against your delivery projects.
                </p>
              </div>

              <div className="rounded-3xl bg-emerald-950 p-6 text-white sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-900/40 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-200">
                      Recorded creator earnings
                    </p>

                    <p className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">
                      {balanceVisible
                        ? formatCurrency(totalRevenue, currency)
                        : '••••••••'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      haptic(6)
                      setBalanceVisible(!balanceVisible)
                    }}
                    aria-label={balanceVisible ? 'Hide earnings' : 'Show earnings'}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors"
                  >
                    {balanceVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                <div className="border-b border-slate-100 p-5">
                  <h3 className="text-sm font-bold text-slate-950">
                    Earnings activity
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Projects marked paid in {currency}.
                  </p>
                </div>

                {paid.filter(item => (item.currency || 'INR') === currency).length === 0 ? (
                  <div className="p-6 text-center">
                    <Wallet size={24} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-xs font-bold text-slate-800">
                      No paid project records yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {paid
                      .filter(item => (item.currency || 'INR') === currency)
                      .map(delivery => (
                        <div
                          key={delivery.id}
                          className="flex min-w-0 items-center gap-3 p-4 sm:px-6 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 shadow-2xs">
                            <ArrowUpRight size={16} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-900">
                              {delivery.title || 'Untitled project'}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {delivery.clientName || delivery.clientEmail || 'Client'}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-xs font-bold text-emerald-800">
                              {balanceVisible
                                ? formatCurrency(
                                    Number(delivery.creatorPayout) ||
                                    Number(delivery.grossAmount) ||
                                    0,
                                    currency
                                  )
                                : '••••••'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>
            </section>
          )}

          {wizardOpen && (
            <div
              className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-5 animate-in fade-in duration-200"
              onMouseDown={event => {
                if (event.target === event.currentTarget && !uploading) {
                  resetWizard()
                }
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="vault-dialog-title"
                className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] border border-white/80 bg-white shadow-2xl sm:rounded-[32px] animate-in slide-in-from-bottom-4 duration-300"
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                      <ShieldCheck size={14} /> Secure delivery workspace
                    </div>

                    <h2
                      id="vault-dialog-title"
                      className="mt-1 text-lg font-black tracking-tight text-slate-950 sm:text-xl"
                    >
                      Create a delivery vault
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Step {step} of 3
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={uploading}
                    onClick={resetWizard}
                    aria-label="Close create vault dialog"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="h-1.5 shrink-0 bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-lime-500 transition-all duration-500 ease-out"
                    style={{ width: `${(step / 3) * 100}%` }}
                  />
                </div>

                <div className="pd-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
                  {step === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div>
                        <label
                          htmlFor="vault-title"
                          className="mb-1.5 block text-xs font-bold text-slate-800"
                        >
                          Project name <span className="text-red-500">*</span>
                        </label>

                        <input
                          id="vault-title"
                          value={title}
                          onChange={event => setTitle(event.target.value)}
                          placeholder="e.g. Brand identity design"
                          maxLength={120}
                          required
                          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none transition-all placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="vault-client"
                            className="mb-1.5 block text-xs font-bold text-slate-800"
                          >
                            Client name
                          </label>

                          <input
                            id="vault-client"
                            value={clientName}
                            onChange={event => setClientName(event.target.value)}
                            placeholder="Client or company"
                            maxLength={100}
                            className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 transition-all"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="vault-client-email"
                            className="mb-1.5 block text-xs font-bold text-slate-800"
                          >
                            Client email
                          </label>

                          <input
                            id="vault-client-email"
                            type="email"
                            value={clientEmail}
                            onChange={event => setClientEmail(event.target.value)}
                            placeholder="client@example.com"
                            maxLength={254}
                            className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="vault-amount"
                          className="mb-1.5 block text-xs font-bold text-slate-800"
                        >
                          Project amount <span className="text-red-500">*</span>
                        </label>

                        <div className="flex min-w-0 overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                          <div className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700">
                            {currency === 'INR' ? '₹ INR' : '$ USD'}
                          </div>

                          <input
                            id="vault-amount"
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="any"
                            value={amount}
                            onChange={event => setAmount(event.target.value)}
                            placeholder={currency === 'INR' ? '25000' : '500'}
                            required
                            className="min-h-11 w-full min-w-0 bg-white px-3.5 text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="vault-message"
                          className="mb-1.5 block text-xs font-bold text-slate-800"
                        >
                          Message to client <span className="font-normal text-slate-400">(optional)</span>
                        </label>

                        <textarea
                          id="vault-message"
                          rows={2}
                          value={clientMessage}
                          onChange={event => setClientMessage(event.target.value)}
                          placeholder="Add delivery instructions or a note…"
                          maxLength={1000}
                          className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div>
                        <h3 className="text-sm font-bold text-slate-950">
                          Add your deliverables
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Choose files up to 100 MB each.
                        </p>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={onFilePickerChange}
                        className="sr-only"
                        tabIndex={-1}
                        aria-label="Choose delivery files"
                      />

                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => {
                          haptic(8)
                          fileInputRef.current?.click()
                        }}
                        className="flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-emerald-600 hover:bg-emerald-50/50 transition-all group"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-2xs transition-transform group-hover:scale-110">
                          <UploadCloud size={24} />
                        </div>
                        <span className="mt-3 text-xs font-bold text-slate-900">
                          Tap to choose files
                        </span>
                        <span className="mt-1 text-[11px] text-slate-400">
                          Supports images, videos, zips, code packages
                        </span>
                      </button>

                      {files.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pd-scrollbar pr-1">
                          {files.map((file, index) => (
                            <div
                              key={`${file.name}:${file.size}:${file.lastModified}`}
                              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs animate-in fade-in duration-150"
                            >
                              <FileTypeIcon file={file} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-800">{file.name}</p>
                                <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  haptic(6)
                                  setFiles(previous => previous.filter((_, i) => i !== index))
                                }}
                                className="text-slate-400 hover:text-red-600 p-1"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div>
                        <h3 className="text-sm font-bold text-slate-950">
                          Review & Deploy
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Everything looks ready. Create your vault below.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-slate-500">Project</p>
                          <p className="text-xs font-extrabold text-slate-900">{title}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-slate-500">Client</p>
                          <p className="text-xs font-semibold text-slate-700">{clientName || clientEmail || 'Not specified'}</p>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                          <p className="text-xs font-bold text-slate-500">Amount</p>
                          <p className="text-sm font-black text-emerald-900">{formatCurrency(Number(amount) || 0, currency)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploading && (
                    <div className="mt-6 space-y-3 animate-in fade-in duration-200">
                      <div className="wave-container">
                        <div className="wave" />
                        <div className="wave" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 p-2">
                          <div className="flex items-center gap-2 font-black text-sm tracking-wide">
                            <Sparkles size={16} className="text-lime-300 animate-spin" />
                            <span>{uploadPhase} {progress}%</span>
                          </div>
                          <p className="text-[10px] text-emerald-200/90 font-medium mt-0.5">
                            Keep this window open while PayDrop finishes each step
                          </p>
                        </div>
                      </div>
                      
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-label="Vault creation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-600 to-lime-400 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5 sm:px-7">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => {
                      haptic(6)
                      if (step === 1) resetWizard()
                      else setStep(previous => Math.max(1, previous - 1))
                    }}
                    className="min-h-10 rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    {step === 1 ? 'Cancel' : 'Back'}
                  </button>

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        haptic(10)
                        if (step === 1 && !title.trim()) {
                          notify('Enter a project name.', 'error')
                          return
                        }
                        if (step === 2 && files.length === 0) {
                          notify('Select at least one file.', 'error')
                          return
                        }
                        setStep(previous => Math.min(3, previous + 1))
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-950 px-4 text-xs font-bold text-white hover:bg-emerald-900 shadow-sm transition-all hover:scale-105"
                    >
                      Continue <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => {
                        haptic(15)
                        deployVault()
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-950 px-4 text-xs font-bold text-white hover:bg-emerald-900 shadow-md transition-all hover:scale-105 disabled:opacity-50"
                    >
                      <ShieldCheck size={14} /> Create vault
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}

          {assistantOpen && (
            <div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-5 animate-in fade-in duration-200"
              onMouseDown={event => {
                if (event.target === event.currentTarget) {
                  setAssistantOpen(false)
                }
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="help-dialog-title"
                className="w-full max-w-md rounded-t-[32px] bg-white p-6 shadow-2xl sm:rounded-[32px] animate-in slide-in-from-bottom-4 duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 shadow-2xs">
                      <CircleHelp size={20} />
                    </div>
                    <div>
                      <h2 id="help-dialog-title" className="text-sm font-bold text-slate-950">
                        PayDrop support
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAssistantOpen(false)}
                    aria-label="Close help"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                    <p className="text-xs font-bold text-slate-900">Need help with vaults or payments?</p>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Ensure files are under 100 MB and Cloudinary presets are correctly active in your environment variables.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    haptic(8)
                    setAssistantOpen(false)
                  }}
                  className="mt-5 min-h-11 w-full rounded-xl bg-emerald-950 px-4 text-xs font-bold text-white hover:bg-emerald-900 shadow-sm transition-transform active:scale-95"
                >
                  Got it
                </button>
              </section>
            </div>
          )}

          <nav
            aria-label="Mobile navigation"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pt-2 backdrop-blur-xl pb-[max(.5rem,env(safe-area-inset-bottom))] lg:hidden shadow-lg"
          >
            <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
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
                      haptic(10)
                    }}
                    aria-current={selected ? 'page' : undefined}
                    className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition-all ${
                      selected
                        ? 'bg-emerald-100 text-emerald-950 font-black'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={19} />
                    <span className="max-w-full truncate">
                      {item.id === 'revisions' ? 'Messages' : item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      {previewDelivery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label={`Client preview: ${previewDelivery.title || 'Project'}`} onMouseDown={event => { if (event.target === event.currentTarget) setPreviewDelivery(null) }}>
          <section className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
              <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">Client-side preview</p><h2 className="truncate text-sm font-black text-slate-950 sm:text-base">{previewDelivery.title || 'Untitled project'}</h2><p className="text-[11px] text-slate-500">Preview of the actual client portal · demo payment is simulated only</p></div>
              <div className="flex shrink-0 items-center gap-2"><a href={`/d/${previewDelivery.id}`} target="_blank" rel="noreferrer" className="hidden min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:inline-flex">Open in new tab <ExternalLink size={14}/></a><button type="button" onClick={() => setPreviewDelivery(null)} aria-label="Close preview" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><X size={18}/></button></div>
            </header>
            <div className="relative min-h-0 flex-1 bg-[#F0F5EE]"><iframe key={previewDelivery.id} title={`Client portal preview for ${previewDelivery.title || 'project'}`} src={`/d/${previewDelivery.id}`} className="h-full w-full border-0" /></div>
          </section>
        </div>
      )}
      </div>
    </main>
  )
}
