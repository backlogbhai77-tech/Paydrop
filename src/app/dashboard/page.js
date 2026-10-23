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

function StatusBadge({ status }) {
  const paid = status === 'Paid'
  const expired = status === 'Expired' || status === 'Cancelled'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
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
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
      {note && <p className="mt-3 text-sm text-slate-500">{note}</p>}
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
  }, [paid, currency])  const resetWizard = () => {
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

  const uploadToCloudinary = file =>
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
        if (!event.lengthComputable) return

        const fileProgress = event.total
          ? event.loaded / event.total
          : 0

        setProgress(previous =>
          Math.min(94, Math.max(previous, Math.round(fileProgress * 80)))
        )
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

        // Image previews receive a visible watermark.
        // This is a preview convenience, not a security boundary.
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

    setUploading(true)
    setProgress(0)

    try {
      const uploadedFiles = []

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]

        notify(`Uploading ${file.name} (${index + 1}/${files.length})…`)

        const uploaded = await uploadToCloudinary(file)
        uploadedFiles.push(uploaded)

        setProgress(
          Math.round(((index + 1) / files.length) * 92)
        )
      }

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

      setProgress(97)

      const origin = window.location.origin
      const deliveryUrl = `${origin}/d/${deliveryRef.id}`

      if (clientEmail.trim()) {
        try {
          const response = await fetch('/api/paydrop-engine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send-email',
              clientEmail: clientEmail.trim(),
              clientName: clientName.trim(),
              creatorName:
                user.displayName ||
                user.email?.split('@')[0] ||
                'Creator',
              creatorEmail: user.email || '',
              projectTitle: cleanTitle,
              amount: numericAmount,
              currency,
              deliveryUrl,
            }),
          })

          if (!response.ok) {
            console.error(
              'Client email request failed:',
              await response.text()
            )

            notify(
              'Vault created, but the email notification failed. You can copy the link manually.',
              'error'
            )
          }
        } catch (emailError) {
          console.error('Client email error:', emailError)

          notify(
            'Vault created, but the email could not be sent. Copy the link to share it.',
            'error'
          )
        }
      }

      setProgress(100)
      haptic([15, 40, 15])

      resetWizard()
      setTab('projects')
      notify('Vault created successfully.')
    } catch (error) {
      console.error('Vault creation failed:', error)

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
      haptic()
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
      haptic()
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
        messages: [
          ...(activeChat.messages || []),
          newMessage,
        ],
      })

      setReply('')
      haptic()
      notify('Reply sent.')
    } catch (error) {
      console.error('Reply failed:', error)
      notify('Could not send the reply. Please retry.', 'error')
    }
  }

  const copyDeliveryLink = async delivery => {
    const url = getDeliveryUrl(delivery)

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

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8f5] p-6">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading PayDrop…
          </p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8f5] p-6">
        <div className="w-full max-w-md rounded-3xl border border-white bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-900 text-white">
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
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-emerald-900 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-800"
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

  const visibleProjects =
    tab === 'revisions'
      ? filtered.filter(item => item.messages?.length)
      : filtered

  const pageTitle =
    navigation.find(item => item.id === tab)?.label || 'Overview'

  const formatFileSize = bytes => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const FileTypeIcon = ({ file }) => {
    const type = file?.type || ''

    if (type.startsWith('image/')) return <ImageIcon size={18} />
    if (type.startsWith('video/')) return <Film size={18} />
    if (
      type.includes('zip') ||
      type.includes('compressed') ||
      /\.zip$|\.rar$|\.7z$/i.test(file?.name || '')
    ) {
      return <FileArchive size={18} />
    }

    return <File size={18} />
  }

  const ProjectCard = ({ delivery }) => (
    <article className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
          <BriefcaseBusiness size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-bold text-slate-950">
            {delivery.title || 'Untitled project'}
          </h3>
          <p className="mt-1 break-words text-sm text-slate-500">
            {delivery.clientName || delivery.clientEmail || 'Client not specified'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setProfileOpen(profileOpen === delivery.id ? false : delivery.id)}
          aria-label="Project actions"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100"
        >
          <MoreHorizontal size={21} />
        </button>
      </div>

      {profileOpen === delivery.id && (
        <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => {
              setProfileOpen(false)
              shareVault(delivery)
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            <Share2 size={15} /> Share
          </button>

          <button
            type="button"
            onClick={() => {
              setProfileOpen(false)
              copyDeliveryLink(delivery)
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            <Copy size={15} /> Copy link
          </button>

          <button
            type="button"
            onClick={() => {
              setProfileOpen(false)
              deleteVault(delivery)
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-red-600 ring-1 ring-red-100"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={delivery.status} />
        <span className="text-lg font-extrabold tracking-tight text-slate-950">
          {formatCurrency(delivery.grossAmount, delivery.currency || 'INR')}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Files
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700">
            {delivery.files?.length || 0} attached
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Client messages
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700">
            {delivery.messages?.length || 0}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveChat(delivery)
            setTab('revisions')
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <MessageCircle size={16} /> Messages
        </button>

        <button
          type="button"
          onClick={() => shareVault(delivery)}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-3 text-sm font-bold text-white transition-colors hover:bg-emerald-800"
        >
          Open link <ExternalLink size={15} />
        </button>
      </div>
    </article>
  )

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f5f8f5] text-slate-900">
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
          className={`fixed left-4 right-4 top-4 z-[100] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-xl ${
            toast.type === 'error'
              ? 'border-red-200 bg-white text-red-700'
              : 'border-emerald-200 bg-white text-emerald-800'
          }`}
        >
          {toast.type === 'error'
            ? <CircleHelp size={19} className="shrink-0" />
            : <Check size={19} className="shrink-0" />}

          <span className="min-w-0 flex-1 text-sm font-semibold">
            {toast.message}
          </span>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100"
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
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,280px)] flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 ease-out lg:w-[260px] ${
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
            className="flex min-w-0 items-center gap-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-950 text-white">
              <ShieldCheck size={22} />
            </span>

            <span className="min-w-0">
              <span className="block text-lg font-black tracking-tight text-slate-950">
                PayDrop
              </span>
              <span className="block text-[11px] font-semibold tracking-wide text-slate-400">
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
          <p className="px-3 text-[11px] font-extrabold uppercase tracking-[.14em] text-slate-400">
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
                    haptic()
                  }}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-sm font-bold transition-colors ${
                    selected
                      ? 'bg-emerald-950 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                  aria-current={selected ? 'page' : undefined}
                >
                  <Icon size={19} className="shrink-0" />
                  <span className="min-w-0 flex-1">{item.label}</span>

                  {item.count > 0 && (
                    <span
                      className={`min-w-6 rounded-lg px-1.5 py-1 text-center text-xs font-bold ${
                        selected
                          ? 'bg-white/15 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="mt-8 rounded-3xl bg-[#f0f7f0] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-900">
              <LockKeyhole size={19} />
            </div>

            <p className="mt-3 text-sm font-extrabold text-slate-900">
              Your work, organized
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Keep client deliveries and project conversations together.
            </p>

            <button
              type="button"
              onClick={openWizard}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-950 px-3 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <Plus size={17} /> New vault
            </button>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            <CircleHelp size={18} />
            Help & support
            <ChevronRight size={16} className="ml-auto" />
          </button>

          <button
            type="button"
            onClick={logout}
            className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-400">
                CREATOR WORKSPACE / {pageTitle.toUpperCase()}
              </p>
              <h1 className="mt-0.5 truncate text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
                {pageTitle}
              </h1>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                <Search size={17} className="shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search projects"
                  aria-label="Search projects"
                  className="w-32 min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400 md:w-44"
                />
              </label>

              <select
                aria-label="Currency"
                value={currency}
                onChange={event => setCurrency(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
              </select>
            </div>

            <button
              type="button"
              onClick={openWizard}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-3.5 text-sm font-bold text-white hover:bg-emerald-800 sm:px-4"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">New vault</span>
              <span className="sm:hidden">Create</span>
            </button>

            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-label="Open profile menu"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-950 ring-1 ring-emerald-200"
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
              className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-700"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>

          {profileOpen === true && (
            <div className="absolute right-4 top-[68px] z-40 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:right-6">
              <p className="truncate px-3 py-2 text-sm font-bold text-slate-900">
                {displayName}
              </p>
              <p className="truncate px-3 pb-3 text-xs text-slate-500">
                {user.email}
              </p>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false)
                  logout()
                }}
                className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </header>

        <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10">
          {tab === 'overview' && (
            <section className="space-y-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">
                    {greeting}, {displayName}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Your business at a glance
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                    Track your deliveries, organize client conversations, and keep your workflow moving.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openWizard}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-950 px-5 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  <Plus size={18} /> Create a delivery
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
                      <h3 className="text-lg font-extrabold text-slate-950">
                        Revenue overview
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Paid projects by month · {currency}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBalanceVisible(!balanceVisible)}
                      aria-label={balanceVisible ? 'Hide revenue values' : 'Show revenue values'}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      {balanceVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  <div className="mt-8 flex h-48 items-end gap-3 sm:h-56 sm:gap-5">
                    {monthly.map(item => {
                      const height = item.value
                        ? Math.max(8, (item.value / maxMonthlyValue) * 100)
                        : 3

                      return (
                        <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3">
                          <div className="flex w-full flex-1 items-end justify-center">
                            <div
                              title={
                                balanceVisible
                                  ? formatCurrency(item.value, currency)
                                  : 'Revenue hidden'
                              }
                              className={`w-full max-w-12 rounded-t-xl transition-[height] duration-300 ${
                                item.value
                                  ? 'bg-emerald-800'
                                  : 'bg-slate-100'
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-400">
                            {item.label}
                          </span>
                          {balanceVisible && (
                            <span className="max-w-full truncate text-[10px] font-semibold text-slate-500 sm:text-xs">
                              {item.value
                                ? new Intl.NumberFormat(
                                    currency === 'USD' ? 'en-US' : 'en-IN',
                                    { notation: 'compact', maximumFractionDigits: 1 }
                                  ).format(item.value)
                                : '—'}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
                    Illustrative dashboard analytics based on project records. This is not a bank balance or verified payment ledger.
                  </p>
                </section>

                <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-950">
                        Recent projects
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Your latest delivery activity
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTab('projects')}
                      className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
                    >
                      View all <ArrowRight size={15} />
                    </button>
                  </div>

                  <div className="mt-5 space-y-1">
                    {dataLoading ? (
                      <div className="space-y-3 py-3">
                        {[1, 2, 3].map(item => (
                          <div key={item} className="h-[68px] animate-pulse rounded-2xl bg-slate-100" />
                        ))}
                      </div>
                    ) : deliveries.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                          <BriefcaseBusiness size={21} />
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-800">
                          Your first project starts here
                        </p>
                        <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">
                          Create a delivery vault to organize files and share them with a client.
                        </p>
                        <button
                          type="button"
                          onClick={openWizard}
                          className="mt-4 min-h-10 rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white"
                        >
                          Create first vault
                        </button>
                      </div>
                    ) : (
                      deliveries.slice(0, 5).map(delivery => (
                        <button
                          type="button"
                          key={delivery.id}
                          onClick={() => {
                            setActiveChat(delivery)
                            setTab('revisions')
                          }}
                          className="flex min-h-[72px] w-full min-w-0 items-center gap-3 rounded-2xl px-2 text-left transition-colors hover:bg-slate-50"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                            <File size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {delivery.title || 'Untitled project'}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {delivery.clientName || delivery.clientEmail || 'Client not specified'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-slate-800">
                              {formatCurrency(delivery.grossAmount, delivery.currency || 'INR')}
                            </p>
                            <div className="mt-1">
                              <StatusBadge status={delivery.status} />
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <section>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-950">
                      Needs your attention
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Active deliveries that may need a follow-up
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('projects')}
                    className="text-sm font-bold text-emerald-800 hover:underline"
                  >
                    See all projects
                  </button>
                </div>

                {dataLoading ? (
                  <div className="h-28 animate-pulse rounded-3xl bg-white" />
                ) : pending.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
                    <Check size={22} className="mx-auto text-emerald-700" />
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      No active payment requests
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      New requests will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {pending.slice(0, 3).map(delivery => (
                      <ProjectCard key={delivery.id} delivery={delivery} />
                    ))}
                  </div>
                )}
              </section>
            </section>
          )}
                    {tab === 'projects' && (
            <section className="space-y-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Your workspace
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    All projects
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Manage your delivery links, client requests, and project files.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openWizard}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-950 px-5 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  <Plus size={18} /> Create project
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">All projects</p>
                  <p className="mt-2 text-2xl font-black">{deliveries.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Awaiting payment</p>
                  <p className="mt-2 text-2xl font-black">{pending.length}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-1">
                  <p className="text-sm text-slate-500">Marked paid</p>
                  <p className="mt-2 text-2xl font-black">{paid.length}</p>
                </div>
              </div>

              {dataLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map(item => (
                    <div
                      key={item}
                      className="h-64 animate-pulse rounded-3xl bg-white"
                    />
                  ))}
                </div>
              ) : visibleProjects.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                    {search ? <Search size={24} /> : <BriefcaseBusiness size={24} />}
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold text-slate-950">
                    {search ? 'No matching projects' : 'No projects yet'}
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    {search
                      ? 'Try another search term.'
                      : 'Create your first delivery vault to start organizing client work.'}
                  </p>
                  {!search && (
                    <button
                      type="button"
                      onClick={openWizard}
                      className="mt-5 min-h-11 rounded-xl bg-emerald-950 px-5 text-sm font-bold text-white"
                    >
                      Create your first vault
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleProjects.map(delivery => (
                    <ProjectCard key={delivery.id} delivery={delivery} />
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'revisions' && (
            <section className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Client communication
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Messages & revisions
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Keep project feedback connected to the relevant delivery.
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
                <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-4 sm:p-5">
                    <h3 className="font-extrabold text-slate-950">
                      Project conversations
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {deliveries.filter(item => item.messages?.length).length} active threads
                    </p>
                  </div>

                  <div className="max-h-[540px] overflow-y-auto">
                    {deliveries.filter(item => item.messages?.length).length === 0 ? (
                      <div className="p-7 text-center">
                        <MessageSquare size={25} className="mx-auto text-slate-300" />
                        <p className="mt-3 text-sm font-bold text-slate-800">
                          No conversations yet
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Client messages will appear here when available.
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
                              onClick={() => setActiveChat(delivery)}
                              className={`flex min-h-[82px] w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors sm:px-5 ${
                                selected
                                  ? 'bg-emerald-50'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-extrabold text-emerald-900">
                                {initials(delivery.clientName || 'Client')}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900">
                                  {delivery.title || 'Untitled project'}
                                </p>
                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {lastMessage?.text || 'Attachment or message'}
                                </p>
                              </div>

                              {lastMessage?.sender === 'client' && (
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                              )}
                            </button>
                          )
                        })
                    )}
                  </div>
                </section>

                <section className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  {!activeChat ? (
                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <MessageCircle size={24} />
                      </div>
                      <h3 className="mt-4 text-base font-extrabold text-slate-900">
                        Choose a conversation
                      </h3>
                      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                        Select a project to review its saved messages.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 border-b border-slate-100 p-4 sm:p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 font-extrabold text-emerald-900">
                          {initials(activeChat.clientName || 'Client')}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-extrabold text-slate-950">
                            {activeChat.title || 'Project conversation'}
                          </h3>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {activeChat.clientName || activeChat.clientEmail || 'Client'}
                          </p>
                        </div>

                        <StatusBadge status={activeChat.status} />
                      </div>

                      <div className="pd-scrollbar flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-5">
                        {(activeChat.messages || []).map((message, index) => {
                          const creatorMessage = message.sender === 'creator'

                          return (
                            <div
                              key={`${message.createdAt || 'message'}-${index}`}
                              className={`flex ${creatorMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[80%] ${
                                  creatorMessage
                                    ? 'rounded-br-md bg-emerald-950 text-white'
                                    : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                                }`}
                              >
                                <p className={`mb-1 text-[11px] font-bold ${
                                  creatorMessage ? 'text-emerald-200' : 'text-slate-400'
                                }`}>
                                  {creatorMessage ? 'You' : 'Client'}
                                </p>

                                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                  {message.text || ''}
                                </p>

                                {message.createdAt && (
                                  <p className={`mt-2 text-[10px] ${
                                    creatorMessage ? 'text-emerald-200' : 'text-slate-400'
                                  }`}>
                                    {new Date(message.createdAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <form
                        className="flex items-end gap-2 border-t border-slate-100 p-3 sm:p-4"
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
                          className="min-h-12 min-w-0 flex-1 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
                        />

                        <button
                          type="submit"
                          disabled={!reply.trim()}
                          aria-label="Send message"
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-950 text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Send size={18} />
                        </button>
                      </form>
                    </>
                  )}
                </section>
              </div>
            </section>
          )}

          {tab === 'wallet' && (
            <section className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Financial overview
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Wallet & earnings
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Review amounts recorded against your delivery projects.
                </p>
              </div>

              <div className="rounded-3xl bg-emerald-950 p-6 text-white sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-200">
                      Recorded creator earnings
                    </p>

                    <p className="mt-3 break-words text-3xl font-black tracking-tight sm:text-4xl">
                      {balanceVisible
                        ? formatCurrency(totalRevenue, currency)
                        : '••••••••'}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-emerald-200">
                      Based on projects marked as paid in Firestore.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBalanceVisible(!balanceVisible)}
                    aria-label={balanceVisible ? 'Hide earnings' : 'Show earnings'}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/10"
                  >
                    {balanceVisible ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-emerald-200">
                      Awaiting payment
                    </p>
                    <p className="mt-2 text-xl font-extrabold">
                      {balanceVisible
                        ? formatCurrency(pendingValue, currency)
                        : '••••••'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-emerald-200">
                      Projects marked paid
                    </p>
                    <p className="mt-2 text-xl font-extrabold">
                      {paid.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
                    <Activity size={19} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-extrabold text-amber-950">
                      Demo wallet — no real funds are processed
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-amber-900/80">
                      These figures are project records, not a bank balance, a verified escrow balance, or money available to withdraw. Your current demo payment workflow does not transfer or release real funds.
                    </p>
                  </div>
                </div>
              </div>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <h3 className="font-extrabold text-slate-950">
                    Earnings activity
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Projects marked paid, in the selected currency.
                  </p>
                </div>

                {paid.filter(item => (item.currency || 'INR') === currency).length === 0 ? (
                  <div className="p-8 text-center">
                    <Wallet size={26} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-800">
                      No paid project records yet
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Paid project records will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {paid
                      .filter(item => (item.currency || 'INR') === currency)
                      .map(delivery => (
                        <div
                          key={delivery.id}
                          className="flex min-w-0 items-center gap-3 p-4 sm:px-6"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                            <ArrowUpRight size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {delivery.title || 'Untitled project'}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {delivery.clientName || delivery.clientEmail || 'Client'}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-extrabold text-emerald-800">
                              {balanceVisible
                                ? formatCurrency(
                                    Number(delivery.creatorPayout) ||
                                    Number(delivery.grossAmount) ||
                                    0,
                                    currency
                                  )
                                : '••••••'}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Recorded as paid
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
              className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-5"
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
                className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-white/70 bg-white shadow-2xl sm:rounded-[28px]"
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-800">
                      <ShieldCheck size={15} /> Secure delivery workspace
                    </div>

                    <h2
                      id="vault-dialog-title"
                      className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl"
                    >
                      Create a delivery vault
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Step {step} of 3 · Keep your project details together.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={uploading}
                    onClick={resetWizard}
                    aria-label="Close create vault dialog"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="h-1.5 shrink-0 bg-slate-100">
                  <div
                    className="h-full bg-emerald-700 transition-[width] duration-300"
                    style={{ width: `${(step / 3) * 100}%` }}
                  />
                </div>

                <div className="pd-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
                  {step === 1 && (
                    <div className="space-y-5">
                      <div>
                        <label
                          htmlFor="vault-title"
                          className="mb-2 block text-sm font-bold text-slate-800"
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
                          className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="vault-client"
                            className="mb-2 block text-sm font-bold text-slate-800"
                          >
                            Client name
                          </label>

                          <input
                            id="vault-client"
                            value={clientName}
                            onChange={event => setClientName(event.target.value)}
                            placeholder="Client or company"
                            maxLength={100}
                            className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-emerald-700"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="vault-client-email"
                            className="mb-2 block text-sm font-bold text-slate-800"
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
                            className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-emerald-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="vault-amount"
                          className="mb-2 block text-sm font-bold text-slate-800"
                        >
                          Project amount <span className="text-red-500">*</span>
                        </label>

                        <div className="flex min-w-0 overflow-hidden rounded-2xl border border-slate-200 focus-within:border-emerald-700">
                          <div className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-extrabold text-slate-700">
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
                            className="min-h-12 w-full min-w-0 bg-white px-4 text-base outline-none"
                          />
                        </div>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          The platform fee shown below is an estimate. This demo does not collect real payments.
                        </p>

                        {Number(amount) > 0 && Number.isFinite(Number(amount)) && (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-slate-50 p-3">
                              <p className="text-xs font-semibold text-slate-500">
                                Estimated 5% fee
                              </p>
                              <p className="mt-1 break-words text-base font-extrabold text-slate-800">
                                {formatCurrency(
                                  Math.max(Math.round(Number(amount) * 0.05), 1),
                                  currency
                                )}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-emerald-50 p-3">
                              <p className="text-xs font-semibold text-emerald-800">
                                Estimated payout
                              </p>
                              <p className="mt-1 break-words text-base font-extrabold text-emerald-950">
                                {formatCurrency(
                                  Math.max(
                                    0,
                                    Number(amount) -
                                      Math.max(Math.round(Number(amount) * 0.05), 1)
                                  ),
                                  currency
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="vault-message"
                          className="mb-2 block text-sm font-bold text-slate-800"
                        >
                          Message to client <span className="font-normal text-slate-400">(optional)</span>
                        </label>

                        <textarea
                          id="vault-message"
                          rows={3}
                          value={clientMessage}
                          onChange={event => setClientMessage(event.target.value)}
                          placeholder="Add delivery instructions or a note…"
                          maxLength={1000}
                          className="w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-emerald-700"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="vault-expiry"
                          className="mb-2 block text-sm font-bold text-slate-800"
                        >
                          Link expiry
                        </label>

                        <select
                          id="vault-expiry"
                          value={expiry}
                          onChange={event => setExpiry(event.target.value)}
                          className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none focus:border-emerald-700"
                        >
                          <option value="1">1 day</option>
                          <option value="3">3 days</option>
                          <option value="7">7 days</option>
                          <option value="14">14 days</option>
                          <option value="30">30 days</option>
                          <option value="never">No expiry</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-950">
                          Add your deliverables
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Choose images, videos, documents, archives, or project files from your device.
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
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={event => {
                          event.preventDefault()
                          setDragging(true)
                        }}
                        onDragOver={event => {
                          event.preventDefault()
                          setDragging(true)
                        }}
                        onDragLeave={event => {
                          event.preventDefault()
                          if (!event.currentTarget.contains(event.relatedTarget)) {
                            setDragging(false)
                          }
                        }}
                        onDrop={event => {
                          event.preventDefault()
                          setDragging(false)
                          addSelectedFiles(event.dataTransfer.files)
                        }}
                        className={`flex min-h-48 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-5 py-7 text-center transition-colors ${
                          dragging
                            ? 'border-emerald-700 bg-emerald-50'
                            : 'border-slate-300 bg-slate-50 hover:border-emerald-600 hover:bg-emerald-50/60'
                        }`}
                      >
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-sm">
                          <UploadCloud size={27} />
                        </span>

                        <span className="mt-4 text-base font-extrabold text-slate-900">
                          Tap to choose files
                        </span>

                        <span className="mt-1 text-sm text-slate-500">
                          Or drag and drop on supported devices
                        </span>

                        <span className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                          Up to 100 MB per file
                        </span>
                      </button>

                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-sm font-bold text-blue-950">
                          File selection tips
                        </p>
                        <ul className="mt-2 space-y-1 text-xs leading-5 text-blue-900/80">
                          <li>• You can select multiple files at once.</li>
                          <li>• Tap the picker again to add more files.</li>
                          <li>• Large video uploads need a stable connection.</li>
                          <li>• Cloudinary account limits and preset settings still apply.</li>
                        </ul>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h4 className="text-sm font-extrabold text-slate-900">
                            Selected files
                          </h4>
                          <span className="text-xs font-semibold text-slate-500">
                            {files.length} file{files.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {files.length === 0 ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                            <File size={22} className="mx-auto text-slate-300" />
                            <p className="mt-2 text-sm font-semibold text-slate-600">
                              No files selected yet
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {files.map((file, index) => (
                              <div
                                key={`${file.name}:${file.size}:${file.lastModified}`}
                                className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                              >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                                  <FileTypeIcon file={file} />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="break-all text-sm font-bold text-slate-800">
                                    {file.name}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {formatFileSize(file.size)}
                                    {file.type ? ` · ${file.type}` : ''}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  disabled={uploading}
                                  onClick={() => {
                                    setFiles(previous =>
                                      previous.filter((_, i) => i !== index)
                                    )
                                  }}
                                  aria-label={`Remove ${file.name}`}
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-950">
                          Review your delivery
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Check the project details before uploading and creating the vault.
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-sm">
                            <BriefcaseBusiness size={22} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-lg font-extrabold text-slate-950">
                              {title || 'Untitled project'}
                            </p>
                            <p className="mt-1 break-words text-sm text-slate-500">
                              {clientName || 'Client not specified'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-slate-500">
                              Project amount
                            </p>
                            <p className="mt-1 break-words text-base font-extrabold text-slate-950">
                              {formatCurrency(Number(amount) || 0, currency)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-slate-500">
                              Attached files
                            </p>
                            <p className="mt-1 text-base font-extrabold text-slate-950">
                              {files.length}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-slate-500">
                              Platform fee estimate
                            </p>
                            <p className="mt-1 break-words text-base font-extrabold text-slate-950">
                              {formatCurrency(
                                Math.max(Math.round((Number(amount) || 0) * 0.05), 1),
                                currency
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-slate-500">
                              Link expiry
                            </p>
                            <p className="mt-1 text-base font-extrabold text-slate-950">
                              {expiry === 'never' ? 'No expiry' : `${expiry} days`}
                            </p>
                          </div>
                        </div>

                        {clientEmail && (
                          <div className="mt-3 rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-slate-500">
                              Client email
                            </p>
                            <p className="mt-1 break-all text-sm font-bold text-slate-800">
                              {clientEmail}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <LockKeyhole size={19} className="mt-0.5 shrink-0 text-amber-800" />
                          <div>
                            <p className="text-sm font-bold text-amber-950">
                              Demo payment mode
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-900/80">
                              Creating this vault does not collect money or verify payment. Confirm your payment and file-access flow is secure before using this with real client deliverables.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploading && (
                    <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-emerald-950">
                          Uploading your files…
                        </p>
                        <p className="text-sm font-extrabold tabular-nums text-emerald-800">
                          {progress}%
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                        <div
                          className="h-full rounded-full bg-emerald-700 transition-[width] duration-200"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs leading-5 text-emerald-800">
                        Keep this window open until the upload finishes.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => {
                      if (step === 1) {
                        resetWizard()
                      } else {
                        setStep(previous => Math.max(1, previous - 1))
                      }
                    }}
                    className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {step === 1 ? 'Cancel' : 'Back'}
                  </button>

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (step === 1) {
                          if (!title.trim()) {
                            notify('Enter a project name first.', 'error')
                            return
                          }

                          if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
                            notify('Enter a valid project amount.', 'error')
                            return
                          }

                          if (
                            clientEmail.trim() &&
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())
                          ) {
                            notify('Enter a valid client email address.', 'error')
                            return
                          }
                        }

                        if (step === 2 && files.length === 0) {
                          notify('Select at least one file to continue.', 'error')
                          return
                        }

                        setStep(previous => Math.min(3, previous + 1))
                        haptic()
                      }}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-5 text-sm font-bold text-white hover:bg-emerald-800"
                    >
                      Continue <ArrowRight size={17} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={deployVault}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={17} /> Create vault
                        </>
                      )}
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}

          {assistantOpen && (
            <div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-5"
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
                className="w-full max-w-md rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-[28px]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                      <CircleHelp size={22} />
                    </div>
                    <div>
                      <h2 id="help-dialog-title" className="font-extrabold text-slate-950">
                        PayDrop help
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Quick troubleshooting
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAssistantOpen(false)}
                    aria-label="Close help"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                  >
                    <X size={19} />
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">
                      Files won't upload?
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Confirm your Cloudinary cloud name, unsigned upload preset, allowed resource types, and account size limits. Check the browser console for the exact upload error.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">
                      Projects aren't appearing?
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Confirm that you're signed into the correct account and that your Firestore rules allow the owner to read their delivery records.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">
                      Payment status
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      This dashboard is currently in demo/manual payment mode. A displayed paid status does not prove that money was received.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAssistantOpen(false)}
                  className="mt-6 min-h-12 w-full rounded-2xl bg-emerald-950 px-5 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Got it
                </button>
              </section>
            </div>
          )}

          <nav
            aria-label="Mobile navigation"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pt-2 backdrop-blur-xl pb-[max(.5rem,env(safe-area-inset-bottom))] lg:hidden"
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
                      haptic()
                    }}
                    aria-current={selected ? 'page' : undefined}
                    className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition-colors ${
                      selected
                        ? 'bg-emerald-50 text-emerald-900'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="max-w-full truncate">
                      {item.id === 'revisions' ? 'Messages' : item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      </div>
    </main>
  )
}
