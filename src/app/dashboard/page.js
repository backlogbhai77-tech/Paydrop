'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { auth, db } from '../../lib/firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { collection, addDoc, query, where, deleteDoc, doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import {
  Plus, MessageSquare, UploadCloud, Lock, ExternalLink, Trash2, X, Search,
  Wallet, ShieldCheck, Eye, EyeOff, Home, Briefcase, ChevronRight, Sparkles,
  File, Film, Image as ImageIcon, Send, Bot, ArrowRight, ArrowLeft, Share2,
  CheckCircle2, CircleHelp, MoreHorizontal, Bell, TrendingUp, Clock3, Files,
  Menu, Copy, Check, LogOut, ArrowUpRight, LoaderCircle, CircleDollarSign
} from 'lucide-react'
import Link from 'next/link'

type UploadedFile = { name: string; size: string; type: string; rawUrl: string; previewUrl: string }
type Message = { sender: string; text: string; time: string }
type Delivery = {
  id: string; userId?: string; userEmail?: string; title?: string; clientName?: string; clientEmail?: string;
  clientMessage?: string; grossAmount?: number | string; currency?: string; platformFee?: number; creatorPayout?: number;
  status?: string; files?: UploadedFile[]; messages?: Message[]; createdAt?: { seconds?: number };
  expiresAt?: string; viewCount?: number; watermarkText?: string
}
type ChartPoint = { x: number; y: number; month: string; amount: number }

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'mrfujhf8'
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || 'releasedrop_vault'
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatCurrency(amount: unknown, currency = 'INR') {
  const num = Number(amount)
  if (!Number.isFinite(num)) return currency === 'USD' ? '$0.00' : '₹0'
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
    style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(num)
}

function haptic(pattern: number | number[] = 8) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
}

function initials(name?: string | null) {
  return name?.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase() || 'PD'
}

function statusTone(status?: string) {
  if (status === 'Paid') return 'bg-lime-300/10 text-lime-200 border-lime-200/15'
  if (status?.toLowerCase().includes('revision')) return 'bg-amber-300/10 text-amber-200 border-amber-200/15'
  return 'bg-emerald-300/10 text-emerald-200 border-emerald-200/15'
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <div className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lime-200 to-emerald-300 font-black text-emerald-950 shadow-lg shadow-emerald-500/10 ${small ? 'size-9 text-lg' : 'size-11 text-2xl'}`}>P</div>
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`relative overflow-hidden rounded-[24px] border border-emerald-100/[0.09] bg-[linear-gradient(145deg,rgba(17,38,28,.92),rgba(9,22,16,.96))] shadow-[0_12px_36px_rgba(0,0,0,.12)] ${className}`}>{children}</section>
}

export default function Dashboard() {
  const reduceMotion = useReducedMotion()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTab, setCurrentTab] = useState('home')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [currency, setCurrency] = useState('INR')
  const [activeChartPoint, setActiveChartPoint] = useState<ChartPoint | null>(null)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [expirySelection, setExpirySelection] = useState('7')
  const watermarkText = 'PAYDROP • PREVIEW COPY'
  const [fileList, setFileList] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [activeThreadDelivery, setActiveThreadDelivery] = useState<Delivery | null>(null)
  const [threadReplyText, setThreadReplyText] = useState('')
  const chatBottomRef = useRef<HTMLDivElement | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  useEffect(() => {
    let unsubFirestore: (() => void) | undefined
    const unsubAuth = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)
      setLoading(false)
      if (unsubFirestore) { unsubFirestore(); unsubFirestore = undefined }
      if (!currentUser) { setDeliveries([]); return }
      const q = query(collection(db, 'deliveries'), where('userId', '==', currentUser.uid))
      unsubFirestore = onSnapshot(q, snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Delivery))
        docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setDeliveries(docs)
        setActiveThreadDelivery(previous => previous ? docs.find(d => d.id === previous.id) || previous : null)
      }, error => showToast(error.message || 'Unable to sync projects', 'error'))
    })
    return () => { unsubAuth(); unsubFirestore?.() }
  }, [showToast])

  useEffect(() => {
    if (currentTab === 'chat-thread' || activeThreadDelivery) chatBottomRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [currentTab, activeThreadDelivery?.messages, reduceMotion])

  const handleFilesAdd = (files: FileList | File[]) => {
    const selected = Array.from(files)
    if (!selected.length) return
    setFileList(prev => [...prev, ...selected])
    haptic()
  }
  const removeFile = (idx: number) => setFileList(prev => prev.filter((_, i) => i !== idx))

  const uploadFileToCloudinary = (file: File): Promise<UploadedFile> => new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`)
    xhr.upload.onprogress = event => { if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 98)) }
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText)
        if (xhr.status === 200 && (res.secure_url || res.url)) {
          const rawUrl = res.secure_url || res.url
          const previewUrl = file.type.startsWith('image/') ? rawUrl.replace('/upload/', `/upload/l_text:Arial_24_bold:${encodeURIComponent(watermarkText)},o_35,a_-30/`) : rawUrl
          resolve({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`, type: file.type || 'application/octet-stream', rawUrl, previewUrl })
        } else reject(new Error(res?.error?.message || 'Storage error'))
      } catch { reject(new Error('Upload parsing error')) }
    }
    xhr.onerror = () => reject(new Error('Network connection interrupted'))
    xhr.send(formData)
  })

  const handleDeployVault = async () => {
    if (!title.trim() || !amount || Number(amount) <= 0 || !fileList.length || !user) {
      showToast('Add a project name, valid amount and at least one file', 'error'); return
    }
    setUploading(true)
    try {
      const manifest: UploadedFile[] = []
      for (let i = 0; i < fileList.length; i++) {
        setUploadProgress(Math.round((i / fileList.length) * 100))
        manifest.push(await uploadFileToCloudinary(fileList[i]))
      }
      setUploadProgress(100)
      const numAmount = Number(amount)
      const platformFee = Math.max(Math.round(numAmount * 0.05), 1)
      const creatorPayout = Math.max(numAmount - platformFee, 0)
      const expiresAt = expirySelection === 'never' ? null : (() => { const date = new Date(); date.setDate(date.getDate() + Number.parseInt(expirySelection, 10)); return date.toISOString() })()
      const newDocRef = await addDoc(collection(db, 'deliveries'), {
        userId: user.uid, userEmail: user.email, title: title.trim(),
        clientName: clientName.trim() || clientEmail.split('@')[0] || 'Client', clientEmail: clientEmail.trim(),
        clientMessage: clientMessage.trim(), grossAmount: numAmount, currency,
        platformFee, creatorPayout, watermarkText, status: 'Awaiting Payment', files: manifest,
        expiresAt, viewCount: 0, messages: [], createdAt: serverTimestamp(),
      })
      const clientPortalUrl = `${window.location.origin}/d/${newDocRef.id}`
      if (clientEmail.trim()) {
        try {
          const emailResponse = await fetch('/api/paydrop-engine', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send-email', clientEmail: clientEmail.trim(), clientName: clientName.trim() || 'Client', creatorName: user.displayName || user.email?.split('@')[0] || 'Creator', projectTitle: title.trim(), amount: numAmount, deliveryUrl: clientPortalUrl }),
          })
          if (!emailResponse.ok) console.error('Email dispatch returned', emailResponse.status)
        } catch (emailErr) { console.error('Email dispatch failed:', emailErr) }
      }
      showToast('Vault created successfully', 'success')
      setTitle(''); setClientName(''); setClientEmail(''); setClientMessage(''); setAmount(''); setFileList([]); setWizardStep(1); setRequestModalOpen(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create vault', 'error')
    } finally { setUploading(false); setUploadProgress(0) }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this project?')) return
    try { await deleteDoc(doc(db, 'deliveries', id)); showToast('Project deleted', 'success') }
    catch { showToast('Failed to delete project', 'error') }
  }

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/d/${id}`)
      setCopiedId(id); showToast('Escrow link copied', 'success'); haptic([10, 25, 10])
      setTimeout(() => setCopiedId(null), 2500)
    } catch { showToast('Could not copy link. Check browser permissions.', 'error') }
  }

  const shareProject = async (item: Delivery) => {
    const url = `${window.location.origin}/d/${item.id}`
    if (navigator.share) {
      try { await navigator.share({ title: `PayDrop Escrow: ${item.title}`, text: `Review protected deliverables for ${item.title}`, url }) }
      catch (error) { if (error instanceof Error && error.name !== 'AbortError') await copyLink(item.id) }
    } else await copyLink(item.id)
  }

  const handleSendThreadReply = async (deliveryId: string) => {
    if (!threadReplyText.trim()) return
    try {
      const target = deliveries.find(d => d.id === deliveryId)
      const updated = [...(target?.messages || []), { sender: 'creator', text: threadReplyText.trim(), time: new Date().toISOString() }]
      await updateDoc(doc(db, 'deliveries', deliveryId), { messages: updated })
      setThreadReplyText(''); showToast('Reply sent to client', 'success'); haptic()
    } catch { showToast('Failed to send reply', 'error') }
  }

  const handleLogout = async () => {
    try { await signOut(auth); showToast('Logged out successfully', 'success') }
    catch { showToast('Logout failed', 'error') }
  }

  const paidDeliveries = useMemo(() => deliveries.filter(d => d.status === 'Paid'), [deliveries])
  const totalRevenueINR = useMemo(() => paidDeliveries.filter(d => (d.currency || 'INR') === 'INR').reduce((acc, d) => acc + (Number(d.creatorPayout) || Number(d.grossAmount) || 0), 0), [paidDeliveries])
  const totalRevenueUSD = useMemo(() => paidDeliveries.filter(d => d.currency === 'USD').reduce((acc, d) => acc + (Number(d.creatorPayout) || Number(d.grossAmount) || 0), 0), [paidDeliveries])
  const selectedRevenue = currency === 'INR' ? totalRevenueINR : totalRevenueUSD
  const unreadRevisions = deliveries.filter(d => d.messages?.length && d.messages[d.messages.length - 1]?.sender === 'client')
  const filteredDeliveries = deliveries.filter(d => d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) || d.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase()))
  const currentYear = new Date().getFullYear()
  const monthlyDataPoints = monthNames.map((month, i) => {
    const monthItems = paidDeliveries.filter(d => {
      const date = d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000) : null
      return date && date.getMonth() === i && date.getFullYear() === currentYear && (d.currency || 'INR') === currency
    })
    return { month, amount: monthItems.reduce((sum, d) => sum + (Number(d.creatorPayout) || Number(d.grossAmount) || 0), 0) }
  })
  const maxVal = Math.max(...monthlyDataPoints.map(p => p.amount), 1)
  const chartPoints: ChartPoint[] = monthlyDataPoints.map((p, idx) => ({ x: (idx / 11) * 300, y: 100 - (p.amount / maxVal) * 80, month: p.month, amount: p.amount }))
  const svgPathD = chartPoints.reduce((path, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`, '')
  const areaPathD = `${svgPathD} L 300 120 L 0 120 Z`

  const openRequest = () => { haptic(); setWizardStep(1); setRequestModalOpen(true) }
  const navItems = [
    { id: 'home', label: 'Overview', icon: Home },
    { id: 'projects', label: 'Projects', icon: Briefcase, count: deliveries.length },
    { id: 'revisions', label: 'Revisions', icon: MessageSquare, count: unreadRevisions.length },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
  ]

  if (loading) return <div className="pd-root flex min-h-screen items-center justify-center"><div className="flex flex-col items-center gap-4 text-center"><BrandMark /><LoaderCircle className="animate-spin text-emerald-200" size={22} /><p className="text-[11px] font-semibold tracking-[.2em] text-emerald-100/40">PREPARING YOUR WORKSPACE</p></div></div>
  if (!user) return <div className="pd-root flex min-h-screen items-center justify-center p-6"><div className="pd-panel max-w-sm p-8 text-center"><BrandMark /><h1 className="mt-5 text-xl font-bold text-white">You’re signed out</h1><p className="mt-2 text-sm text-emerald-100/50">Sign in again to access your workspace.</p><Link href="/login" className="pd-primary mt-6 inline-flex w-full justify-center">Return to login <ArrowRight size={16} /></Link></div></div>

  const renderDeliveryCard = (item: Delivery, compact = false) => (
    <motion.article key={item.id} layout initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={reduceMotion ? undefined : { y: -3 }} className="pd-panel group p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-100/10 bg-gradient-to-br from-lime-200/20 to-emerald-300/5 text-xs font-bold text-lime-100">{initials(item.clientName)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-white sm:text-[15px]">{item.title || 'Untitled project'}</h3><p className="mt-1 truncate text-xs text-emerald-100/40">{item.clientName || 'Client'}{item.clientEmail ? ` · ${item.clientEmail}` : ''}</p></div>
            <div className="shrink-0 text-right"><div className="text-sm font-bold tabular-nums text-white">{formatCurrency(item.grossAmount, item.currency || 'INR')}</div><span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold ${statusTone(item.status)}`}>{item.status || 'Pending'}</span></div>
          </div>
          {!compact && <div className="mt-4"><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><motion.div initial={{ width: 0 }} animate={{ width: item.status === 'Paid' ? '100%' : '62%' }} transition={{ duration: .65 }} className={`h-full rounded-full ${item.status === 'Paid' ? 'bg-lime-200' : 'bg-emerald-300'}`} /></div><div className="mt-2 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[10px] text-emerald-100/40"><span className={`size-1.5 rounded-full ${item.status === 'Paid' ? 'bg-lime-200' : 'bg-emerald-300'}`} />{item.status === 'Paid' ? 'Funds released' : 'Awaiting payment / approval'}</span><span className="text-[10px] text-emerald-100/35">{item.files?.length || 0} file(s)</span></div></div>}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
            <button onClick={() => shareProject(item)} className="pd-icon-button" title="Share project"><Share2 size={14} /><span className="sm:hidden">Share</span></button>
            <button onClick={() => copyLink(item.id)} className="pd-small-button">{copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}{copiedId === item.id ? 'Copied' : 'Copy link'}</button>
            <Link href={`/d/${item.id}`} target="_blank" className="pd-small-button">Portal <ExternalLink size={13} /></Link>
            <button onClick={() => handleDelete(item.id)} className="pd-icon-button ml-auto text-rose-200/65 hover:text-rose-200" title="Delete project"><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    </motion.article>
  )

  return (
    <div className="pd-root min-h-screen pb-24 text-white lg:pb-0 pd-premium-shell">
      <style jsx global>{`
        :root { color-scheme: dark; }
        .pd-premium-shell { --pd-line: rgba(167,243,208,.12); --pd-muted: rgba(209,250,229,.56); background: #07110d; color: #f4fff8; isolation: isolate; }
        .pd-premium-shell::selection { background: rgba(190,242,100,.28); }
        .pd-premium-shell .pd-grid-glow { opacity: .35; background-image: linear-gradient(rgba(167,243,208,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(167,243,208,.035) 1px, transparent 1px); background-size: 46px 46px; mask-image: linear-gradient(to bottom, black, transparent 85%); }
        .pd-premium-shell aside.fixed.inset-y-0.left-0 { width: 264px; padding: 26px 18px 18px; background: linear-gradient(180deg, rgba(10,25,18,.98), rgba(6,16,11,.98)); border-color: rgba(167,243,208,.10); box-shadow: 14px 0 50px rgba(0,0,0,.12); }
        .pd-premium-shell .lg\:pl-\[250px\] { padding-left: 264px; }
        .pd-premium-shell .pd-nav-item { display:flex; align-items:center; gap:12px; min-height:46px; padding: 0 13px; border:1px solid transparent; border-radius:14px; color:rgba(209,250,229,.56); transition: background .18s ease, border-color .18s ease, color .18s ease, transform .18s ease; }
        .pd-premium-shell .pd-nav-item:hover { color:#f4fff8; background:rgba(255,255,255,.035); border-color:rgba(167,243,208,.07); transform:translateX(2px); }
        .pd-premium-shell .pd-nav-item[data-active="true"] { color:#eaffbd; background:linear-gradient(100deg,rgba(190,242,100,.13),rgba(52,211,153,.055)); border-color:rgba(190,242,100,.15); box-shadow: inset 3px 0 0 #bef264; }
        .pd-premium-shell .pd-primary { display:inline-flex; align-items:center; justify-content:center; gap:9px; min-height:44px; padding:0 17px; border:1px solid rgba(217,249,157,.36); border-radius:14px; background:linear-gradient(135deg,#d9f99d,#6ee7b7); color:#092016; font-size:12px; font-weight:800; box-shadow:0 7px 22px rgba(110,231,183,.10); transition:transform .18s ease, box-shadow .18s ease, filter .18s ease; }
        .pd-premium-shell .pd-primary:hover { transform:translateY(-1px); box-shadow:0 10px 28px rgba(110,231,183,.17); filter:saturate(1.08); }
        .pd-premium-shell .pd-primary:active { transform:translateY(0) scale(.99); }
        .pd-premium-shell .pd-secondary { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:40px; padding:0 13px; border:1px solid rgba(167,243,208,.13); border-radius:12px; background:rgba(255,255,255,.035); color:rgba(236,253,245,.84); font-size:11px; font-weight:650; transition:background .18s ease,border-color .18s ease; }
        .pd-premium-shell .pd-secondary:hover { background:rgba(167,243,208,.075); border-color:rgba(167,243,208,.24); }
        .pd-premium-shell .pd-panel, .pd-premium-shell .pd-premium-shell section { border-color:rgba(167,243,208,.12); background:linear-gradient(145deg,rgba(16,36,26,.96),rgba(8,22,15,.97)); box-shadow:0 16px 45px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.025); }
        .pd-premium-shell .pd-panel { border-radius:22px; transition:border-color .2s ease, box-shadow .2s ease; }
        .pd-premium-shell .pd-panel:hover { border-color:rgba(167,243,208,.18); }
        .pd-premium-shell header.sticky { height:76px; border-color:rgba(167,243,208,.09); background:rgba(6,17,12,.82); box-shadow:0 10px 30px rgba(0,0,0,.06); }
        .pd-premium-shell .pd-icon-button { display:inline-grid; place-items:center; min-width:38px; min-height:38px; border:1px solid rgba(167,243,208,.12); border-radius:12px; background:rgba(255,255,255,.035); color:rgba(236,253,245,.8); transition:background .18s ease,border-color .18s ease,color .18s ease; }
        .pd-premium-shell .pd-icon-button:hover { color:#d9f99d; border-color:rgba(190,242,100,.25); background:rgba(190,242,100,.07); }
        .pd-premium-shell .pd-input { width:100%; min-height:45px; border:1px solid rgba(167,243,208,.13); border-radius:13px; background:rgba(2,10,6,.34); color:#f0fdf4; padding:11px 14px; outline:none; transition:border-color .18s ease,box-shadow .18s ease; }
        .pd-premium-shell .pd-input::placeholder { color:rgba(209,250,229,.30); }
        .pd-premium-shell .pd-input:focus { border-color:rgba(190,242,100,.45); box-shadow:0 0 0 3px rgba(190,242,100,.07); }
        .pd-premium-shell main { position:relative; }
        .pd-premium-shell main h2 { letter-spacing:-.045em; }
        .pd-premium-shell .animate-pulse-glow { animation: pd-soft-glow 6s ease-in-out infinite; }
        .pd-premium-shell nav.fixed.bottom-0 { border-color:rgba(167,243,208,.12); background:rgba(6,17,12,.94); box-shadow:0 -12px 38px rgba(0,0,0,.24); }
        @keyframes pd-soft-glow { 0%,100% { box-shadow:0 12px 36px rgba(0,0,0,.13), 0 0 0 rgba(110,231,183,0); } 50% { box-shadow:0 14px 42px rgba(0,0,0,.18), 0 0 28px rgba(110,231,183,.035); } }
        @media (max-width: 1023px) { .pd-premium-shell .lg\:pl-\[250px\] { padding-left:0; } .pd-premium-shell header.sticky { height:66px; } .pd-premium-shell main { padding-top:22px; } .pd-premium-shell .pd-panel { border-radius:19px; } }
        @media (max-width: 640px) { .pd-premium-shell main { padding-left:14px; padding-right:14px; } .pd-premium-shell main h2 { font-size:27px; line-height:1.15; } .pd-premium-shell .pd-primary { min-height:43px; padding-left:14px; padding-right:14px; } .pd-premium-shell .pd-secondary { min-height:38px; padding-left:10px; padding-right:10px; } .pd-premium-shell .pd-panel { border-radius:18px; } .pd-premium-shell nav.fixed.bottom-0 button { min-width:0; flex:1; padding-left:6px; padding-right:6px; } }
        @media (prefers-reduced-motion: reduce) { .pd-premium-shell *, .pd-premium-shell *::before, .pd-premium-shell *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; scroll-behavior:auto !important; } }
      `}</style>
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="pd-grid-glow absolute inset-0" /><div className="absolute -left-40 -top-40 size-[400px] rounded-full bg-emerald-400/[0.06] blur-[120px]" /><div className="absolute right-[-100px] top-[25%] size-[340px] rounded-full bg-lime-200/[0.035] blur-[110px]" /></div>

      <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: -18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }} className={`fixed left-1/2 top-4 z-[100] flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${toast.type === 'error' ? 'border-rose-300/20 bg-[#321b1b]/95' : 'border-emerald-200/15 bg-[#10251b]/95'}`}><span className={`size-2 shrink-0 rounded-full ${toast.type === 'error' ? 'bg-rose-300' : 'bg-lime-200'}`} /><span className="text-xs font-medium text-white">{toast.message}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={14} className="text-white/50" /></button></motion.div>}</AnimatePresence>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] border-r border-emerald-100/[0.07] bg-[#09140f]/95 px-4 py-5 backdrop-blur-2xl lg:flex lg:flex-col">
        <button onClick={() => setCurrentTab('home')} className="flex items-center gap-3 px-2 text-left"><BrandMark /><span className="text-[22px] font-black tracking-tight">paydrop<span className="text-lime-200">.</span><span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[.2em] text-emerald-100/35">Creator workspace</span></span></button>
        <button onClick={openRequest} className="pd-primary mt-9 w-full"><Plus size={17} /> Request payment <span className="ml-auto text-emerald-950/55">↗</span></button>
        <div className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[.19em] text-emerald-100/30">Workspace</div>
        <nav className="space-y-1">{navItems.map(({ id, label, icon: Icon, count }) => <button key={id} onClick={() => { setCurrentTab(id); haptic() }} data-active={currentTab === id || (id === 'revisions' && currentTab === 'chat-thread')} className="pd-nav-item w-full"><Icon size={18} strokeWidth={1.8} /><span className="flex-1 text-left">{label}</span>{typeof count === 'number' && count > 0 && <span className="rounded-full bg-emerald-200/10 px-2 py-0.5 text-[10px] text-emerald-100">{count}</span>}</button>)}</nav>
        <div className="mt-auto">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/10 bg-gradient-to-br from-emerald-300/[0.11] to-lime-200/[0.025] p-4"><Sparkles size={17} className="text-lime-200" /><p className="mt-3 text-sm font-semibold">Your work, protected.</p><p className="mt-1 text-xs leading-5 text-emerald-100/45">Keep every delivery and client approval organized in one place.</p><button onClick={() => setAiDrawerOpen(true)} className="mt-3 text-xs font-semibold text-lime-200">Open assistant <ArrowRight size={13} className="ml-1 inline" /></button></div>
          <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-4"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-lime-200 to-emerald-300 text-xs font-black text-emerald-950">{initials(user.displayName || user.email)}</div><button onClick={() => setProfileDrawerOpen(true)} className="min-w-0 flex-1 text-left"><span className="block truncate text-xs font-semibold text-white">{user.displayName || user.email?.split('@')[0]}</span><span className="mt-1 block truncate text-[10px] text-emerald-100/35">{user.email}</span></button><button onClick={handleLogout} aria-label="Sign out" className="pd-icon-button"><LogOut size={15} /></button></div>
        </div>
      </aside>

      <div className="relative min-w-0 lg:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b border-emerald-100/[0.07] bg-[#07110e]/85 px-4 backdrop-blur-2xl sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3"><button className="pd-icon-button lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu"><Menu size={18} /></button><div className="min-w-0"><div className="hidden text-[10px] font-semibold uppercase tracking-[.17em] text-emerald-100/35 sm:block">Creator workspace</div><h1 className="truncate text-sm font-semibold text-white sm:mt-1 sm:text-base">{currentTab === 'home' ? `Welcome back, ${(user.displayName || user.email?.split('@')[0] || 'creator').split(' ')[0]}` : currentTab === 'chat-thread' ? 'Client conversation' : navItems.find(n => n.id === currentTab)?.label || 'Workspace'}</h1></div></div>
          <div className="flex items-center gap-2 sm:gap-3"><div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[11px] text-emerald-100/35 md:flex"><Search size={14} /><input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setCurrentTab('projects') }} placeholder="Search projects..." className="w-28 bg-transparent outline-none placeholder:text-emerald-100/30" /></div><button onClick={() => setAiDrawerOpen(true)} className="pd-icon-button" title="AI assistant"><Sparkles size={17} className="text-lime-200" /></button><button onClick={() => setProfileDrawerOpen(true)} className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-lime-200 to-emerald-300 text-xs font-black text-emerald-950">{initials(user.displayName || user.email)}</button></div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 pb-10 pt-6 sm:px-7 sm:pt-8 lg:px-9">
          <AnimatePresence mode="wait" initial={false}>
            {currentTab === 'home' && <motion.div key="home" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .22 }} className="space-y-6">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/10 bg-emerald-200/[0.04] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-emerald-200/80"><span className="size-1.5 rounded-full bg-lime-200 shadow-[0_0_12px_rgba(217,249,157,.6)]" /> YOUR BUSINESS AT A GLANCE</div><h2 className="max-w-3xl text-[29px] font-semibold leading-tight tracking-[-.045em] text-white sm:text-[38px]">Make great work.<br className="hidden sm:block" /> Get paid with peace of mind.</h2><p className="mt-3 max-w-xl text-[13px] leading-6 text-emerald-100/45">Your projects, approvals and settled earnings — all in one calm workspace.</p></div><button onClick={openRequest} className="pd-primary shrink-0"><Plus size={17} /> New payment request</button></div>

              <div className="grid gap-4 md:grid-cols-3"><Panel className="animate-pulse-glow p-5 sm:p-6 md:col-span-2"><div className="absolute -right-10 -top-16 size-60 rounded-full bg-emerald-300/[0.08] blur-[65px]" /><div className="relative flex items-start justify-between"><div><div className="flex items-center gap-2 text-xs text-emerald-100/55">Settled earnings <button onClick={() => setBalanceVisible(v => !v)} aria-label={balanceVisible ? 'Hide balance' : 'Show balance'} className="text-emerald-200/70 hover:text-white">{balanceVisible ? <Eye size={15} /> : <EyeOff size={15} />}</button></div><div className="mt-4 text-[34px] font-semibold tracking-[-.055em] text-white sm:text-[43px]">{balanceVisible ? formatCurrency(selectedRevenue, currency) : '••••••••'}</div><div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-100/40"><span className="flex items-center gap-1 text-lime-200"><TrendingUp size={13} /> {paidDeliveries.length} paid</span><span>·</span><span>Lifetime settled payouts in selected currency</span></div></div><div className="grid size-12 place-items-center rounded-2xl border border-lime-100/10 bg-lime-200/[0.08] text-lime-200"><Wallet size={22} /></div></div><div className="relative mt-7 flex flex-wrap items-center gap-2"><span className="text-[10px] uppercase tracking-[.16em] text-emerald-100/30">Display currency</span>{['INR', 'USD'].map(c => <button key={c} onClick={() => { setCurrency(c); setActiveChartPoint(null) }} className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold transition ${currency === c ? 'border-lime-200/25 bg-lime-200/10 text-lime-100' : 'border-white/[0.08] text-emerald-100/45 hover:text-white'}`}>{c === 'INR' ? '₹ INR' : '$ USD'}</button>)}</div></Panel>
                <Panel className="flex flex-col justify-between p-5 sm:p-6"><div className="flex items-center justify-between"><span className="text-xs text-emerald-100/50">Your workspace</span><div className="grid size-10 place-items-center rounded-xl bg-emerald-200/[0.07] text-emerald-200"><Briefcase size={18} /></div></div><div className="mt-5"><div className="text-4xl font-semibold tracking-[-.05em] text-white">{deliveries.length.toString().padStart(2, '0')}</div><div className="mt-1 text-xs text-emerald-100/45">Total projects created</div></div><div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4"><span className="text-[10px] text-emerald-100/35">{unreadRevisions.length} client replies to review</span><button onClick={() => setCurrentTab('revisions')} className="text-[10px] font-semibold text-lime-200">Review <ArrowRight size={12} className="ml-1 inline" /></button></div></Panel></div>

              <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_.75fr]"><Panel className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-white">Revenue trend <span className="text-emerald-100/35">· {currentYear}</span></h3><p className="mt-1 text-xs text-emerald-100/40">Settled payouts by month · {currency}</p></div><div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs font-medium text-emerald-100/60">{currency}</div></div><div className="mt-6 flex items-end gap-3"><span className="text-2xl font-semibold tracking-tight text-white">{formatCurrency(monthlyDataPoints.reduce((sum, p) => sum + p.amount, 0), currency)}</span><span className="mb-1 text-[10px] text-emerald-100/35">this year</span></div><div className="relative mt-5 h-[170px]"><div className="absolute inset-0 flex flex-col justify-between">{[0,1,2,3].map(n => <div key={n} className="border-t border-dashed border-emerald-100/[0.08]" />)}</div><svg className="relative h-full w-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none"><defs><linearGradient id="pdChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a3e635" stopOpacity=".28" /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></linearGradient></defs><path d={areaPathD} fill="url(#pdChartFill)" /><path d={svgPathD} fill="none" stroke="#a3e635" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />{chartPoints.map((pt, i) => <g key={pt.month} className="cursor-pointer" onMouseEnter={() => setActiveChartPoint(pt)} onMouseLeave={() => setActiveChartPoint(null)} onClick={() => setActiveChartPoint(pt)}><circle cx={pt.x} cy={pt.y} r={activeChartPoint?.month === pt.month ? 5 : 3} fill={activeChartPoint?.month === pt.month ? '#d9f99d' : '#34d399'} stroke="#0b1912" strokeWidth="2" /><circle cx={pt.x} cy={pt.y} r="10" fill="transparent" /></g>)}</svg>{activeChartPoint && <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10251b] px-3 py-2 text-[10px] shadow-xl"><span className="text-emerald-100/50">{activeChartPoint.month}</span><span className="ml-2 font-semibold text-white">{formatCurrency(activeChartPoint.amount, currency)}</span></div>}</div><div className="mt-3 flex justify-between text-[10px] text-emerald-100/30">{monthNames.map(m => <span key={m}>{m}</span>)}</div></Panel>

                <Panel className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-white">Recent activity</h3><p className="mt-1 text-xs text-emerald-100/40">Your latest projects</p></div><button onClick={() => setCurrentTab('projects')} className="text-xs font-semibold text-lime-200">View all <ArrowRight size={13} className="ml-1 inline" /></button></div><div className="mt-3">{deliveries.slice(0, 4).length ? deliveries.slice(0, 4).map(item => <div key={item.id} className="flex items-center gap-3 border-b border-white/[0.055] py-4 last:border-0"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-200/[0.07] text-xs font-bold text-emerald-100">{initials(item.clientName)}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-white">{item.title || 'Untitled project'}</div><div className="mt-1 truncate text-[10px] text-emerald-100/35">{item.clientName || 'Client'}</div></div><div className="shrink-0 text-right"><div className="text-xs font-semibold text-white">{formatCurrency(item.grossAmount, item.currency || 'INR')}</div><div className="mt-1 text-[9px] text-emerald-100/40">{item.status || 'Pending'}</div></div></div>) : <div className="py-10 text-center"><div className="mx-auto grid size-11 place-items-center rounded-2xl bg-emerald-200/[0.06] text-emerald-200"><Files size={19} /></div><p className="mt-3 text-xs font-medium text-white">Your projects will appear here</p><p className="mt-1 text-[10px] text-emerald-100/35">Create a request to get started.</p></div>}</div></Panel></div>

              <div className="flex items-end justify-between gap-4"><div><h3 className="text-lg font-semibold tracking-tight text-white">Projects in motion</h3><p className="mt-1 text-xs text-emerald-100/40">A quick look at your client deliverables</p></div><button onClick={() => setCurrentTab('projects')} className="hidden text-xs font-semibold text-lime-200 sm:block">All projects <ArrowRight size={13} className="ml-1 inline" /></button></div>
              {deliveries.length ? <div className="grid gap-3 xl:grid-cols-2">{deliveries.slice(0, 4).map(d => renderDeliveryCard(d))}</div> : <Panel className="p-8 text-center sm:p-12"><div className="mx-auto grid size-14 place-items-center rounded-2xl border border-emerald-100/10 bg-emerald-200/[0.06] text-emerald-200"><Files size={23} /></div><h3 className="mt-4 text-sm font-semibold text-white">Your first project starts here</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-emerald-100/40">Create a payment request, attach deliverables and send your client a dedicated portal link.</p><button onClick={openRequest} className="pd-primary mx-auto mt-5"><Plus size={16} /> Create payment request</button></Panel>}
            </motion.div>}

            {currentTab === 'projects' && <motion.div key="projects" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-200/60">Workspace library</div><h2 className="mt-2 text-3xl font-semibold tracking-tight">All projects</h2><p className="mt-2 text-xs text-emerald-100/40">Manage deliveries, share portal links and track status.</p></div><button onClick={openRequest} className="pd-primary"><Plus size={16} /> New project</button></div><div className="relative"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-100/35" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by project, client or email..." className="pd-input pl-11" /></div>{filteredDeliveries.length ? <div className="grid gap-3 xl:grid-cols-2">{filteredDeliveries.map(d => renderDeliveryCard(d))}</div> : <Panel className="p-12 text-center"><Search size={24} className="mx-auto text-emerald-100/35" /><p className="mt-3 text-sm font-medium">No matching projects</p><p className="mt-1 text-xs text-emerald-100/40">Try a different search or create a new request.</p></Panel>}</motion.div>}

            {currentTab === 'revisions' && <motion.div key="revisions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-5"><div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-200/60">Client communication</div><h2 className="mt-2 text-3xl font-semibold tracking-tight">Revision inbox</h2><p className="mt-2 text-xs text-emerald-100/40">Keep feedback and handover discussions close to each project.</p></div>{deliveries.filter(d => d.messages?.length).length ? deliveries.filter(d => d.messages?.length).map(d => { const last = d.messages![d.messages!.length - 1]; const unread = last?.sender === 'client'; return <Panel key={d.id} className="p-4 sm:p-5"><div className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-200/[0.07] text-xs font-bold text-emerald-100">{initials(d.clientName)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-white">{d.clientName || 'Client'}</h3>{unread && <span className="rounded-full border border-rose-200/15 bg-rose-300/10 px-2 py-1 text-[9px] font-semibold text-rose-200">New client reply</span>}</div><p className="mt-1 truncate text-xs text-emerald-100/40">{d.title}</p><p className="mt-3 line-clamp-2 text-xs leading-5 text-emerald-100/65">{last?.text || 'No revision notes yet.'}</p></div><button onClick={() => { setActiveThreadDelivery(d); setCurrentTab('chat-thread'); haptic() }} className="pd-secondary shrink-0">Open chat <ArrowRight size={13} /></button></div></Panel> }) : <Panel className="p-12 text-center"><MessageSquare size={25} className="mx-auto text-emerald-100/35" /><p className="mt-3 text-sm font-semibold">No revision conversations yet</p><p className="mt-1 text-xs text-emerald-100/40">Client messages will appear here when they reply through their portal.</p></Panel>}</motion.div>}

            {currentTab === 'chat-thread' && activeThreadDelivery && <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex min-h-[calc(100dvh-130px)] max-w-4xl flex-col overflow-hidden rounded-[24px] border border-emerald-100/10 bg-[#0b1912]/90"><div className="flex items-center gap-3 border-b border-white/[0.07] p-4 sm:p-5"><button onClick={() => setCurrentTab('revisions')} className="pd-icon-button"><ArrowLeft size={17} /></button><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-200/[0.08] text-xs font-bold text-emerald-100">{initials(activeThreadDelivery.clientName)}</div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{activeThreadDelivery.clientName || 'Client'}</h3><p className="mt-1 truncate text-[10px] text-emerald-100/40">{activeThreadDelivery.title}</p></div><Link href={`/d/${activeThreadDelivery.id}`} target="_blank" className="pd-secondary">Portal <ExternalLink size={13} /></Link></div><div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">{(activeThreadDelivery.messages || []).length ? activeThreadDelivery.messages!.map((m, idx) => { const creator = m.sender === 'creator'; const parsedTime = new Date(m.time); return <div key={`${m.time}-${idx}`} className={`flex flex-col ${creator ? 'items-end' : 'items-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-5 sm:max-w-[75%] ${creator ? 'rounded-br-sm bg-gradient-to-br from-emerald-400 to-lime-200 text-emerald-950' : 'rounded-bl-sm border border-white/[0.07] bg-white/[0.04] text-emerald-50/90'}`}>{m.text}</div><span className="mt-1.5 text-[9px] text-emerald-100/30">{Number.isNaN(parsedTime.getTime()) ? '' : parsedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div> }) : <div className="flex h-full min-h-48 flex-col items-center justify-center text-center"><MessageSquare size={24} className="text-emerald-100/30" /><p className="mt-3 text-sm font-medium">Start the conversation</p><p className="mt-1 text-xs text-emerald-100/35">Send a note to your client about this delivery.</p></div>}<div ref={chatBottomRef} /></div><div className="border-t border-white/[0.07] p-3 sm:p-4"><div className="mb-3 flex gap-2 overflow-x-auto">{['Working on this draft ✍️', 'Uploaded revised files 📁', 'Revision completed ✅'].map(p => <button key={p} onClick={() => setThreadReplyText(p)} className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[10px] text-emerald-100/65 hover:bg-white/[0.06]">{p}</button>)}</div><form onSubmit={e => { e.preventDefault(); handleSendThreadReply(activeThreadDelivery.id) }} className="flex gap-2"><input value={threadReplyText} onChange={e => setThreadReplyText(e.target.value)} placeholder="Write a reply..." className="pd-input flex-1" /><button type="submit" disabled={!threadReplyText.trim()} className="pd-primary px-4 disabled:opacity-40"><Send size={15} /><span className="hidden sm:inline">Send</span></button></form></div></motion.div>}

            {currentTab === 'wallet' && <motion.div key="wallet" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-6"><div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-200/60">Earnings overview</div><h2 className="mt-2 text-3xl font-semibold tracking-tight">Wallet & payouts</h2><p className="mt-2 text-xs text-emerald-100/40">Your settled project earnings, grouped by currency.</p></div><div className="grid gap-4 md:grid-cols-2"><Panel className="p-6 sm:p-7"><div className="flex items-center justify-between"><span className="text-xs text-emerald-100/45">Settled earnings · INR</span><div className="grid size-10 place-items-center rounded-xl bg-emerald-200/[0.07] text-emerald-200"><CircleDollarSign size={19} /></div></div><div className="mt-5 text-3xl font-semibold tracking-tight">{formatCurrency(totalRevenueINR, 'INR')}</div><p className="mt-2 text-[11px] text-emerald-100/35">From {paidDeliveries.filter(d => (d.currency || 'INR') === 'INR').length} paid project(s)</p></Panel><Panel className="p-6 sm:p-7"><div className="flex items-center justify-between"><span className="text-xs text-emerald-100/45">Settled earnings · USD</span><div className="grid size-10 place-items-center rounded-xl bg-lime-200/[0.07] text-lime-200"><Wallet size={19} /></div></div><div className="mt-5 text-3xl font-semibold tracking-tight">{formatCurrency(totalRevenueUSD, 'USD')}</div><p className="mt-2 text-[11px] text-emerald-100/35">From {paidDeliveries.filter(d => d.currency === 'USD').length} paid project(s)</p></Panel></div><Panel className="flex items-start gap-3 p-5"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-lime-200" /><div><h3 className="text-sm font-semibold">Payment status clarity</h3><p className="mt-1 text-xs leading-5 text-emerald-100/45">These totals are calculated from projects marked Paid in Firestore. Actual escrow custody, settlement and bank payouts must be verified by your payment provider and backend.</p></div></Panel></motion.div>}
          </AnimatePresence>
        </main>
      </div>

      <button onClick={openRequest} aria-label="Create payment request" className="pd-fab fixed bottom-20 right-5 z-30 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-lime-200 to-emerald-300 text-emerald-950 shadow-[0_10px_35px_rgba(52,211,153,.18)] transition hover:-translate-y-1 active:scale-95 sm:bottom-7 sm:right-7 lg:hidden"><Plus size={25} strokeWidth={2.5} /></button>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-emerald-100/[0.08] bg-[#09140f]/95 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 backdrop-blur-2xl lg:hidden">{navItems.map(({ id, label, icon: Icon, count }) => <button key={id} onClick={() => setCurrentTab(id)} className={`relative flex min-w-[60px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition ${currentTab === id || (id === 'revisions' && currentTab === 'chat-thread') ? 'text-lime-200' : 'text-emerald-100/40'}`}><Icon size={19} /><span className="text-[9px] font-medium">{label}</span>{typeof count === 'number' && count > 0 && <span className="absolute right-2 top-0 grid min-w-4 place-items-center rounded-full bg-lime-200 px-1 text-[8px] font-bold text-emerald-950">{count}</span>}</button>)}</nav>

      <AnimatePresence>{requestModalOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget && !uploading) setRequestModalOpen(false) }}><motion.div initial={reduceMotion ? false : { opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .98 }} transition={{ duration: .2 }} role="dialog" aria-modal="true" aria-labelledby="pd-wizard-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border border-emerald-100/10 bg-[#0b1912] shadow-2xl"><div className="flex items-start justify-between border-b border-white/[0.07] p-5 sm:p-7"><div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-emerald-200/55">PAYMENT REQUEST · STEP {wizardStep} OF 4</div><h2 id="pd-wizard-title" className="mt-2 text-2xl font-semibold tracking-tight">Create a secure request</h2><p className="mt-1 text-xs text-emerald-100/40">Clear details make for smoother handovers.</p></div><button disabled={uploading} onClick={() => setRequestModalOpen(false)} className="pd-icon-button"><X size={18} /></button></div><div className="px-5 pt-5 sm:px-7"><div className="flex gap-2">{[1,2,3,4].map(s => <div key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]"><motion.div initial={false} animate={{ width: wizardStep >= s ? '100%' : '0%' }} className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-200" /></div>)}</div></div><div className="flex-1 overflow-y-auto p-5 sm:p-7">
        {wizardStep === 1 && <motion.div key="step1" initial={{ opacity: 0, x: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4"><div><h3 className="text-sm font-semibold">Attach your deliverables</h3><p className="mt-1 text-xs text-emerald-100/40">Images, videos, archives, source code and PDFs.</p></div><div onDragOver={e => { e.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={e => { e.preventDefault(); setIsDragging(false); handleFilesAdd(e.dataTransfer.files) }} className={`rounded-2xl border border-dashed p-7 text-center transition sm:p-10 ${isDragging ? 'border-lime-200 bg-lime-200/[0.06]' : 'border-emerald-100/15 bg-white/[0.02] hover:border-emerald-200/35'}`}><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-200/[0.08] text-emerald-200"><UploadCloud size={23} /></div><p className="mt-4 text-sm font-semibold">Drop your files here</p><p className="mt-1 text-xs text-emerald-100/40">or choose files from your device</p><label className="pd-primary mx-auto mt-4 inline-flex cursor-pointer">Browse files<input type="file" multiple onChange={e => { if (e.target.files) handleFilesAdd(e.target.files); e.currentTarget.value = '' }} className="hidden" /></label></div>{fileList.length > 0 && <div className="space-y-2 rounded-2xl border border-white/[0.07] bg-black/10 p-3">{fileList.map((f, i) => <div key={`${f.name}-${f.lastModified}-${i}`} className="flex items-center gap-3 rounded-xl px-2 py-2"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-200/[0.07] text-emerald-200">{f.type.startsWith('video/') ? <Film size={16} /> : f.type.startsWith('image/') ? <ImageIcon size={16} /> : <File size={16} />}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-white">{f.name}</div><div className="mt-1 text-[10px] text-emerald-100/35">{(f.size / (1024 * 1024)).toFixed(2)} MB</div></div><button onClick={() => removeFile(i)} className="pd-icon-button text-rose-200/70" aria-label={`Remove ${f.name}`}><X size={14} /></button></div>)}</div>}</motion.div>}
        {wizardStep === 2 && <motion.div key="step2" initial={{ opacity: 0, x: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4"><div><h3 className="text-sm font-semibold">Project & client details</h3><p className="mt-1 text-xs text-emerald-100/40">Tell your client what this delivery includes.</p></div><label className="pd-field-label">Client name <span className="text-emerald-100/25">(optional)</span><input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client or company name" className="pd-input mt-2" /></label><label className="pd-field-label">Client email *<input required type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@company.com" className="pd-input mt-2" /></label><label className="pd-field-label">Project name *<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Website redesign & source code" className="pd-input mt-2" /></label><label className="pd-field-label">Handover message <textarea rows={3} value={clientMessage} onChange={e => setClientMessage(e.target.value)} placeholder="A short note about the files and next steps..." className="pd-input mt-2 resize-y" /></label></motion.div>}
        {wizardStep === 3 && <motion.div key="step3" initial={{ opacity: 0, x: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-5"><div><h3 className="text-sm font-semibold">Pricing & access</h3><p className="mt-1 text-xs text-emerald-100/40">Choose the request amount and portal expiry.</p></div><label className="pd-field-label">Payment amount *<div className="mt-2 flex overflow-hidden rounded-xl border border-white/[0.09] bg-black/20 focus-within:border-emerald-200/35"><select value={currency} onChange={e => setCurrency(e.target.value)} className="border-r border-white/[0.08] bg-[#10251b] px-3 text-xs font-semibold text-emerald-100 outline-none"><option value="INR">INR ₹</option><option value="USD">USD $</option></select><input required type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent px-4 py-3.5 text-sm font-semibold text-white outline-none placeholder:text-emerald-100/25" /></div></label><div><div className="text-xs font-medium text-emerald-100/75">Portal link expiry</div><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{['7','14','30','never'].map(opt => <button type="button" key={opt} onClick={() => setExpirySelection(opt)} className={`rounded-xl border px-3 py-3 text-xs font-semibold transition ${expirySelection === opt ? 'border-lime-200/25 bg-lime-200/10 text-lime-100' : 'border-white/[0.08] text-emerald-100/50 hover:bg-white/[0.03]'}`}>{opt === 'never' ? 'No expiry' : `${opt} days`}</button>)}</div><p className="mt-2 text-[10px] text-emerald-100/30">“No expiry” stores a null expiry date. Ensure the client portal handles this value.</p></div><div className="rounded-2xl border border-emerald-200/10 bg-emerald-200/[0.04] p-4"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-lime-200" /><div><p className="text-xs font-semibold text-white">Preview watermark enabled</p><p className="mt-1 text-[11px] leading-5 text-emerald-100/45">Image previews will include “{watermarkText}”. Keep the original files protected through server-side access controls too.</p></div></div></div></motion.div>}
        {wizardStep === 4 && <motion.div key="step4" initial={{ opacity: 0, x: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4"><div><h3 className="text-sm font-semibold">Review your request</h3><p className="mt-1 text-xs text-emerald-100/40">Check the details before creating the portal.</p></div><div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><div className="flex items-start justify-between gap-3 border-b border-white/[0.07] pb-4"><div><div className="text-[10px] uppercase tracking-[.16em] text-emerald-100/35">Project</div><div className="mt-1 text-sm font-semibold text-white">{title || 'Untitled project'}</div><div className="mt-1 text-xs text-emerald-100/40">{clientName || clientEmail || 'Client not set'}</div></div><div className="text-right"><div className="text-[10px] text-emerald-100/35">Request amount</div><div className="mt-1 text-lg font-semibold text-lime-100">{formatCurrency(amount, currency)}</div></div></div><div className="mt-4 grid grid-cols-2 gap-4"><div><div className="text-[10px] text-emerald-100/35">Client email</div><div className="mt-1 break-all text-xs text-emerald-50/80">{clientEmail}</div></div><div><div className="text-[10px] text-emerald-100/35">Files attached</div><div className="mt-1 text-xs text-emerald-50/80">{fileList.length} file(s)</div></div><div><div className="text-[10px] text-emerald-100/35">Portal expiry</div><div className="mt-1 text-xs text-emerald-50/80">{expirySelection === 'never' ? 'No expiry' : `${expirySelection} days`}</div></div><div><div className="text-[10px] text-emerald-100/35">Platform fee estimate (5%)</div><div className="mt-1 text-xs text-emerald-50/80">{formatCurrency(Math.max(Math.round(Number(amount || 0) * .05), 1), currency)}</div></div></div></div><div className="flex items-start gap-3 rounded-2xl border border-lime-200/10 bg-lime-200/[0.045] p-4"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-lime-200" /><p className="text-xs leading-5 text-emerald-50/70">Creating this request uploads the selected files and stores project metadata. Payment custody and protected file delivery must be enforced by your payment provider and server-side rules.</p></div>{uploading && <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4"><div className="flex items-center justify-between text-xs"><span className="text-emerald-100/65">Uploading files and creating request…</span><span className="font-semibold text-lime-100">{uploadProgress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><motion.div animate={{ width: `${uploadProgress}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-200" /></div></div>}</motion.div>}
      </div><div className="flex gap-3 border-t border-white/[0.07] p-4 sm:p-5">{wizardStep > 1 && <button disabled={uploading} onClick={() => setWizardStep(s => s - 1)} className="pd-secondary flex-1 justify-center disabled:opacity-40"><ArrowLeft size={15} /> Back</button>}{wizardStep < 4 ? <button disabled={(wizardStep === 1 && fileList.length === 0) || (wizardStep === 2 && (!clientEmail.trim() || !title.trim())) || (wizardStep === 3 && (!amount || Number(amount) <= 0))} onClick={() => setWizardStep(s => s + 1)} className="pd-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-35">Continue <ArrowRight size={15} /></button> : <button disabled={uploading} onClick={handleDeployVault} className="pd-primary flex-1 justify-center disabled:opacity-50">{uploading ? <LoaderCircle size={16} className="animate-spin" /> : <Lock size={15} />}{uploading ? 'Creating request…' : 'Create payment request'}</button>}</div></motion.div></motion.div>}</AnimatePresence>

      <AnimatePresence>{(aiDrawerOpen || profileDrawerOpen || mobileMenuOpen) && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) { setAiDrawerOpen(false); setProfileDrawerOpen(false); setMobileMenuOpen(false) } }}><motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .22, ease: 'easeOut' }} className="absolute inset-y-0 right-0 flex w-full max-w-[380px] flex-col border-l border-emerald-100/10 bg-[#0b1912] p-5 shadow-2xl sm:p-6">{mobileMenuOpen ? <><div className="flex items-center justify-between"><div className="flex items-center gap-3"><BrandMark small /><span className="text-lg font-black">paydrop<span className="text-lime-200">.</span></span></div><button onClick={() => setMobileMenuOpen(false)} className="pd-icon-button"><X size={17} /></button></div><button onClick={() => { setMobileMenuOpen(false); openRequest() }} className="pd-primary mt-7 w-full"><Plus size={16} /> Request payment</button><nav className="mt-6 space-y-1">{navItems.map(({ id, label, icon: Icon, count }) => <button key={id} onClick={() => { setCurrentTab(id); setMobileMenuOpen(false) }} data-active={currentTab === id} className="pd-nav-item w-full"><Icon size={18} /><span className="flex-1 text-left">{label}</span>{typeof count === 'number' && count > 0 && <span className="text-xs text-lime-200">{count}</span>}</button>)}</nav><div className="mt-auto flex items-center gap-3 border-t border-white/[0.07] pt-4"><div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-lime-200 to-emerald-300 text-xs font-black text-emerald-950">{initials(user.displayName || user.email)}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user.displayName || user.email}</p><p className="mt-1 truncate text-[10px] text-emerald-100/35">{user.email}</p></div><button onClick={handleLogout} className="pd-icon-button"><LogOut size={15} /></button></div></> : aiDrawerOpen ? <><div className="flex items-center justify-between border-b border-white/[0.07] pb-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-lime-200/[0.08] text-lime-200"><Bot size={19} /></div><div><h3 className="text-sm font-semibold">AI escrow assistant</h3><p className="mt-1 text-[10px] text-emerald-100/35">Workspace insights</p></div></div><button onClick={() => setAiDrawerOpen(false)} className="pd-icon-button"><X size={17} /></button></div><Panel className="mt-6 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-lime-100"><Sparkles size={15} /> Your snapshot</div><p className="mt-3 text-xs leading-6 text-emerald-50/70">You have <strong className="text-white">{deliveries.length}</strong> project(s), <strong className="text-white">{paidDeliveries.length}</strong> marked as paid, and <strong className="text-white">{unreadRevisions.length}</strong> client message(s) that may need attention.</p><p className="mt-3 text-[10px] leading-5 text-emerald-100/35">These insights summarize your current dashboard data; they are not legal or financial advice.</p></Panel><div className="mt-5 space-y-3"><button onClick={() => { setAiDrawerOpen(false); setCurrentTab('revisions') }} className="pd-secondary w-full justify-start"><MessageSquare size={15} /> Review client messages <ArrowRight size={14} className="ml-auto" /></button><button onClick={() => { setAiDrawerOpen(false); setCurrentTab('projects') }} className="pd-secondary w-full justify-start"><Briefcase size={15} /> Review your projects <ArrowRight size={14} className="ml-auto" /></button></div><button onClick={() => setAiDrawerOpen(false)} className="pd-primary mt-auto w-full justify-center">Close assistant</button></> : <><div className="flex items-center justify-between border-b border-white/[0.07] pb-4"><h3 className="text-sm font-semibold">Account settings</h3><button onClick={() => setProfileDrawerOpen(false)} className="pd-icon-button"><X size={17} /></button></div><div className="mt-6 flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-lime-200 to-emerald-300 text-sm font-black text-emerald-950">{initials(user.displayName || user.email)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.displayName || user.email?.split('@')[0]}</p><p className="mt-1 truncate text-xs text-emerald-100/40">{user.email}</p></div></div><Panel className="mt-6 p-4"><div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={16} className="text-lime-200" /> Account security</div><p className="mt-2 text-xs leading-5 text-emerald-100/45">Your session is managed through Firebase Authentication.</p></Panel><button onClick={handleLogout} className="mt-5 flex w-full items-center gap-3 rounded-xl border border-rose-200/10 bg-rose-300/[0.05] p-3 text-left text-xs font-semibold text-rose-200 transition hover:bg-rose-300/[0.09]"><LogOut size={16} /> Sign out</button><button onClick={() => setProfileDrawerOpen(false)} className="pd-secondary mt-auto w-full justify-center">Close settings</button></>}</motion.aside></motion.div>}</AnimatePresence>
      <footer className="relative hidden justify-between px-9 pb-5 text-[10px] text-emerald-100/25 lg:flex"><span>PayDrop · Creator workspace</span><span className="flex items-center gap-1.5"><CircleHelp size={12} /> Keep your client portal details up to date</span></footer>
    </div>
  )
}
