'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { auth, db } from '../../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, deleteDoc, doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Plus, MessageSquare, UploadCloud, Lock, ExternalLink, Trash2, X, Search, Wallet, ShieldCheck, Eye, EyeOff, Home, Briefcase, Sparkles, File, Film, Image as ImageIcon, Send, Bot, ArrowRight, ArrowLeft, Share2, CircleHelp, TrendingUp, Files, Menu, Copy, Check, LogOut, LoaderCircle, CircleDollarSign } from 'lucide-react';
import Link from 'next/link';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'mrfujhf8';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || 'releasedrop_vault';
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatCurrency(amount, currency = 'INR') {
    const num = Number(amount);
    if (!Number.isFinite(num))
        return currency === 'USD' ? '$0.00' : '₹0';
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(num);
}

function haptic(pattern = 8) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator)
        navigator.vibrate(pattern);
}

function initials(name) {
    return name?.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase() || 'PD';
}

function statusTone(status) {
    if (status === 'Paid')
        return 'bg-lime-300/10 text-lime-200 border-lime-200/15';
    if (status?.toLowerCase().includes('revision'))
        return 'bg-amber-300/10 text-amber-200 border-amber-200/15';
    return 'bg-emerald-300/10 text-emerald-200 border-emerald-200/15';
}

function BrandMark({ small = false }) {
    return (
        <div className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lime-200 to-emerald-300 font-black text-emerald-950 shadow-lg shadow-emerald-500/10 ${small ? 'size-9 text-lg' : 'size-11 text-2xl'}`}>
            P
        </div>
    );
}

function Panel({ children, className = '' }) {
    return (
        <section className={`relative overflow-hidden rounded-[24px] border border-emerald-100/[0.09] bg-[linear-gradient(145deg,rgba(17,38,28,.92),rgba(9,22,16,.96))] shadow-[0_12px_36px_rgba(0,0,0,.12)] ${className}`}>
            {children}
        </section>
    );
}

export default function Dashboard() {
    const reduceMotion = useReducedMotion();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deliveries, setDeliveries] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTab, setCurrentTab] = useState('home');
    const [copiedId, setCopiedId] = useState(null);
    const [toast, setToast] = useState(null);
    const [balanceVisible, setBalanceVisible] = useState(true);
    const [currency, setCurrency] = useState('INR');
    const [activeChartPoint, setActiveChartPoint] = useState(null);
    const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
    const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [title, setTitle] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientMessage, setClientMessage] = useState('');
    const [amount, setAmount] = useState('');
    const [expirySelection, setExpirySelection] = useState('7');
    const watermarkText = 'PAYDROP • PREVIEW COPY';
    const [fileList, setFileList] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [activeThreadDelivery, setActiveThreadDelivery] = useState(null);
    const [threadReplyText, setThreadReplyText] = useState('');
    const chatBottomRef = useRef(null);
    const toastTimerRef = useRef(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        if (toastTimerRef.current)
            clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 3000);
    }, []);

    useEffect(() => () => {
        if (toastTimerRef.current)
            clearTimeout(toastTimerRef.current);
    }, []);

    useEffect(() => {
        let unsubFirestore;
        const unsubAuth = onAuthStateChanged(auth, currentUser => {
            setUser(currentUser);
            setLoading(false);

            if (unsubFirestore) {
                unsubFirestore();
                unsubFirestore = undefined;
            }

            if (!currentUser) {
                setDeliveries([]);
                return;
            }

            const q = query(
                collection(db, 'deliveries'),
                where('userId', '==', currentUser.uid)
            );

            unsubFirestore = onSnapshot(q, snap => {
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setDeliveries(docs);
                setActiveThreadDelivery(previous =>
                    previous ? docs.find(d => d.id === previous.id) || previous : null
                );
            }, error => showToast(error.message || 'Unable to sync projects', 'error'));
        });

        return () => {
            unsubAuth();
            unsubFirestore?.();
        };
    }, [showToast]);

    useEffect(() => {
        if (currentTab === 'chat-thread' || activeThreadDelivery)
            chatBottomRef.current?.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth'
            });
    }, [currentTab, activeThreadDelivery?.messages, reduceMotion]);

    const handleFilesAdd = (files) => {
        const selected = Array.from(files);
        if (!selected.length)
            return;
        setFileList(prev => [...prev, ...selected]);
        haptic();
    };

    const removeFile = (idx) =>
        setFileList(prev => prev.filter((_, i) => i !== idx));

    const uploadFileToCloudinary = (file) => new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const xhr = new XMLHttpRequest();
        xhr.open(
            'POST',
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`
        );

        xhr.upload.onprogress = event => {
            if (event.lengthComputable)
                setUploadProgress(Math.round((event.loaded / event.total) * 98));
        };

        xhr.onload = () => {
            try {
                const res = JSON.parse(xhr.responseText);

                if (xhr.status === 200 && (res.secure_url || res.url)) {
                    const rawUrl = res.secure_url || res.url;
                    const previewUrl = file.type.startsWith('image/')
                        ? rawUrl.replace(
                            '/upload/',
                            `/upload/l_text:Arial_24_bold:${encodeURIComponent(watermarkText)},o_35,a_-30/`
                        )
                        : rawUrl;

                    resolve({
                        name: file.name,
                        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                        type: file.type || 'application/octet-stream',
                        rawUrl,
                        previewUrl
                    });
                } else {
                    reject(new Error(res?.error?.message || 'Storage error'));
                }
            } catch {
                reject(new Error('Upload parsing error'));
            }
        };

        xhr.onerror = () => reject(new Error('Network connection interrupted'));
        xhr.send(formData);
    });

    const handleDeployVault = async () => {
        if (!title.trim() || !amount || Number(amount) <= 0 || !fileList.length || !user) {
            showToast('Add a project name, valid amount and at least one file', 'error');
            return;
        }

        setUploading(true);

        try {
            const manifest = [];

            for (let i = 0; i < fileList.length; i++) {
                setUploadProgress(Math.round((i / fileList.length) * 100));
                manifest.push(await uploadFileToCloudinary(fileList[i]));
            }

            setUploadProgress(100);

            const numAmount = Number(amount);
            const platformFee = Math.max(Math.round(numAmount * 0.05), 1);
            const creatorPayout = Math.max(numAmount - platformFee, 0);

            const expiresAt = expirySelection === 'never'
                ? null
                : (() => {
                    const date = new Date();
                    date.setDate(date.getDate() + Number.parseInt(expirySelection, 10));
                    return date.toISOString();
                })();

            const newDocRef = await addDoc(collection(db, 'deliveries'), {
                userId: user.uid,
                userEmail: user.email,
                title: title.trim(),
                clientName: clientName.trim() || clientEmail.split('@')[0] || 'Client',
                clientEmail: clientEmail.trim(),
                clientMessage: clientMessage.trim(),                grossAmount: numAmount,
                currency,
                platformFee,
                creatorPayout,
                watermarkText,
                status: 'Awaiting Payment',
                files: manifest,
                expiresAt,
                viewCount: 0,
                messages: [],
                createdAt: serverTimestamp(),
            });

            const clientPortalUrl = `${window.location.origin}/d/${newDocRef.id}`;

            if (clientEmail.trim()) {
                try {
                    const emailResponse = await fetch('/api/paydrop-engine', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'send-email',
                            clientEmail: clientEmail.trim(),
                            clientName: clientName.trim() || 'Client',
                            creatorName: user.displayName || user.email?.split('@')[0] || 'Creator',
                            projectTitle: title.trim(),
                            amount: numAmount,
                            deliveryUrl: clientPortalUrl,
                        }),
                    });

                    if (!emailResponse.ok) {
                        console.error('Email dispatch returned', emailResponse.status);
                    }
                } catch (emailErr) {
                    console.error('Email dispatch failed:', emailErr);
                }
            }

            showToast('Vault created successfully', 'success');
            setTitle('');
            setClientName('');
            setClientEmail('');
            setClientMessage('');
            setAmount('');
            setFileList([]);
            setWizardStep(1);
            setRequestModalOpen(false);
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : 'Failed to create vault',
                'error'
            );
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Permanently delete this project?')) return;

        try {
            await deleteDoc(doc(db, 'deliveries', id));
            showToast('Project deleted', 'success');
        } catch {
            showToast('Failed to delete project', 'error');
        }
    };

    const copyLink = async (id) => {
        try {
            await navigator.clipboard.writeText(
                `${window.location.origin}/d/${id}`
            );
            setCopiedId(id);
            showToast('Escrow link copied', 'success');
            haptic([10, 25, 10]);
            setTimeout(() => setCopiedId(null), 2500);
        } catch {
            showToast('Could not copy link. Check browser permissions.', 'error');
        }
    };

    const shareProject = async (item) => {
        const url = `${window.location.origin}/d/${item.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `PayDrop Escrow: ${item.title}`,
                    text: `Review protected deliverables for ${item.title}`,
                    url,
                });
            } catch (error) {
                if (error instanceof Error && error.name !== 'AbortError') {
                    await copyLink(item.id);
                }
            }
        } else {
            await copyLink(item.id);
        }
    };

    const handleSendThreadReply = async (deliveryId) => {
        if (!threadReplyText.trim()) return;

        try {
            const target = deliveries.find(d => d.id === deliveryId);
            const updated = [
                ...(target?.messages || []),
                {
                    sender: 'creator',
                    text: threadReplyText.trim(),
                    time: new Date().toISOString(),
                },
            ];

            await updateDoc(doc(db, 'deliveries', deliveryId), {
                messages: updated,
            });

            setThreadReplyText('');
            showToast('Reply sent to client', 'success');
            haptic();
        } catch {
            showToast('Failed to send reply', 'error');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            showToast('Logged out successfully', 'success');
        } catch {
            showToast('Logout failed', 'error');
        }
    };

    const paidDeliveries = useMemo(
        () => deliveries.filter(d => d.status === 'Paid'),
        [deliveries]
    );

    const totalRevenueINR = useMemo(
        () => paidDeliveries
            .filter(d => (d.currency || 'INR') === 'INR')
            .reduce(
                (acc, d) => acc + (Number(d.creatorPayout) || Number(d.grossAmount) || 0),
                0
            ),
        [paidDeliveries]
    );

    const totalRevenueUSD = useMemo(
        () => paidDeliveries
            .filter(d => d.currency === 'USD')
            .reduce(
                (acc, d) => acc + (Number(d.creatorPayout) || Number(d.grossAmount) || 0),
                0
            ),
        [paidDeliveries]
    );

    const selectedRevenue = currency === 'INR'
        ? totalRevenueINR
        : totalRevenueUSD;

    const unreadRevisions = deliveries.filter(
        d => d.messages?.length &&
            d.messages[d.messages.length - 1]?.sender === 'client'
    );

    const filteredDeliveries = deliveries.filter(d =>
        d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentYear = new Date().getFullYear();

    const monthlyDataPoints = monthNames.map((month, i) => {
        const monthItems = paidDeliveries.filter(d => {
            const date = d.createdAt?.seconds
                ? new Date(d.createdAt.seconds * 1000)
                : null;

            return date &&
                date.getMonth() === i &&
                date.getFullYear() === currentYear &&
                (d.currency || 'INR') === currency;
        });

        return {
            month,
            amount: monthItems.reduce(
                (sum, d) => sum + (Number(d.creatorPayout) || Number(d.grossAmount) || 0),
                0
            ),
        };
    });

    const maxVal = Math.max(
        ...monthlyDataPoints.map(p => p.amount),
        1
    );

    const chartPoints = monthlyDataPoints.map((p, idx) => ({
        x: (idx / 11) * 300,
        y: 100 - (p.amount / maxVal) * 80,
        month: p.month,
        amount: p.amount,
    }));

    const svgPathD = chartPoints.reduce(
        (path, p, i) => i === 0
            ? `M ${p.x} ${p.y}`
            : `${path} L ${p.x} ${p.y}`,
        ''
    );

    const areaPathD = `${svgPathD} L 300 120 L 0 120 Z`;

    const openRequest = () => {
        haptic();
        setWizardStep(1);
        setRequestModalOpen(true);
    };

    const navItems = [
        { id: 'home', label: 'Overview', icon: Home },
        {
            id: 'projects',
            label: 'Projects',
            icon: Briefcase,
            count: deliveries.length,
        },
        {
            id: 'revisions',
            label: 'Revisions',
            icon: MessageSquare,
            count: unreadRevisions.length,
        },
        { id: 'wallet', label: 'Wallet', icon: Wallet },
    ];

    if (loading) {
        return (
            <div className="pd-root flex min-h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <BrandMark />
                    <LoaderCircle
                        className="animate-spin text-emerald-200"
                        size={22}
                    />
                    <p className="text-[11px] font-semibold tracking-[.2em] text-emerald-100/40">
                        PREPARING YOUR WORKSPACE
                    </p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="pd-root flex min-h-screen items-center justify-center p-6">
                <div className="pd-panel max-w-sm p-8 text-center">
                    <BrandMark />
                    <h1 className="mt-5 text-xl font-bold text-white">
                        You’re signed out
                    </h1>
                    <p className="mt-2 text-sm text-emerald-100/50">
                        Sign in again to access your workspace.
                    </p>
                    <Link
                        href="/login"
                        className="pd-primary mt-6 inline-flex w-full justify-center"
                    >
                        Return to login <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }
      const renderDeliveryCard = (item, index) => {
        const Icon = item.files?.some(f => f.type?.startsWith('video/'))
            ? Film
            : item.files?.some(f => f.type?.startsWith('image/'))
                ? ImageIcon
                : File;

        return (
            <motion.article
                key={item.id}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.2) }}
                className="pd-card group"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="pd-file-icon">
                            <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="truncate font-semibold text-white">
                                {item.title || 'Untitled project'}
                            </h3>
                            <p className="mt-1 truncate text-xs text-emerald-100/45">
                                {item.clientName || 'Client'}{item.clientEmail ? ` · ${item.clientEmail}` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleDelete(item.id)}
                        aria-label="Delete project"
                        className="rounded-xl p-2 text-emerald-100/40 transition hover:bg-red-400/10 hover:text-red-300"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="my-5 flex flex-wrap items-center justify-between gap-3">
                    <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${statusTone(item.status)}`}>
                        {item.status || 'Awaiting Payment'}
                    </span>
                    <span className="text-lg font-bold text-white">
                        {formatCurrency(item.grossAmount, item.currency || 'INR')}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-100/35">
                            Deliverables
                        </p>
                        <p className="mt-1 text-sm font-semibold text-emerald-50">
                            {item.files?.length || 0} files
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-100/35">
                            Client views
                        </p>
                        <p className="mt-1 text-sm font-semibold text-emerald-50">
                            {item.viewCount || 0} views
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    <button
                        onClick={() => copyLink(item.id)}
                        className="pd-secondary flex flex-1 items-center justify-center gap-2"
                    >
                        {copiedId === item.id
                            ? <Check size={15} />
                            : <Copy size={15} />}
                        {copiedId === item.id ? 'Copied' : 'Copy link'}
                    </button>

                    <button
                        onClick={() => shareProject(item)}
                        className="pd-secondary flex items-center justify-center gap-2"
                        aria-label="Share project"
                    >
                        <Share2 size={15} />
                    </button>

                    <button
                        onClick={() => {
                            setActiveThreadDelivery(item);
                            setCurrentTab('chat-thread');
                        }}
                        className="pd-secondary flex items-center justify-center gap-2"
                        aria-label="Open project messages"
                    >
                        <MessageSquare size={15} />
                        {item.messages?.length ? item.messages.length : ''}
                    </button>

                    <Link
                        href={`/d/${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pd-secondary flex items-center justify-center gap-2"
                        aria-label="Preview client portal"
                    >
                        <ExternalLink size={15} />
                    </Link>
                </div>
            </motion.article>
        );
    };

    return (
        <div className="pd-root min-h-screen text-white">
            <style jsx global>{`
                .pd-root {
                    --pd-bg: #07130e;
                    --pd-panel: #0d1e15;
                    --pd-green: #063d2a;
                    --pd-lime: #94ec36;
                    background:
                        radial-gradient(ellipse at 70% -10%, rgba(72, 160, 87, .12), transparent 40%),
                        #07130e;
                    color: #f3f8f3;
                    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
                }
                .pd-root * { box-sizing: border-box; }
                .pd-panel {
                    border: 1px solid rgba(210,255,221,.09);
                    border-radius: 24px;
                    background: linear-gradient(145deg,rgba(17,38,28,.95),rgba(9,22,16,.98));
                    box-shadow: 0 12px 36px rgba(0,0,0,.12);
                }
                .pd-card {
                    min-width: 0;
                    padding: 20px;
                    border: 1px solid rgba(210,255,221,.09);
                    border-radius: 22px;
                    background: linear-gradient(145deg,rgba(17,38,28,.9),rgba(9,22,16,.96));
                    transition: border-color .2s, transform .2s;
                }
                .pd-card:hover {
                    border-color: rgba(148,236,54,.3);
                    transform: translateY(-2px);
                }
                .pd-file-icon {
                    display: grid;
                    width: 44px;
                    height: 44px;
                    flex-shrink: 0;
                    place-items: center;
                    border: 1px solid rgba(148,236,54,.15);
                    border-radius: 14px;
                    background: rgba(148,236,54,.08);
                    color: #b9f77c;
                }
                .pd-primary {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    border: 0;
                    border-radius: 14px;
                    background: #94ec36;
                    padding: 12px 17px;
                    color: #092115;
                    font-size: 13px;
                    font-weight: 800;
                    transition: filter .2s, transform .2s;
                    cursor: pointer;
                }
                .pd-primary:hover { filter: brightness(1.08); }
                .pd-primary:disabled { opacity: .5; cursor: not-allowed; }
                .pd-secondary {
                    min-height: 40px;
                    border: 1px solid rgba(210,255,221,.1);
                    border-radius: 12px;
                    background: rgba(255,255,255,.025);
                    padding: 9px 12px;
                    color: #d9e9dc;
                    font-size: 12px;
                    font-weight: 650;
                    transition: background .2s, border-color .2s;
                    cursor: pointer;
                }
                .pd-secondary:hover {
                    border-color: rgba(148,236,54,.25);
                    background: rgba(148,236,54,.07);
                }
                .pd-input {
                    width: 100%;
                    border: 1px solid rgba(210,255,221,.12);
                    border-radius: 13px;
                    outline: none;
                    background: rgba(0,0,0,.15);
                    padding: 12px 14px;
                    color: white;
                    font-size: 13px;
                    transition: border-color .2s;
                }
                .pd-input:focus { border-color: rgba(148,236,54,.65); }
                .pd-input::placeholder { color: rgba(221,240,225,.3); }
                .pd-label {
                    display: block;
                    margin-bottom: 8px;
                    color: rgba(221,240,225,.7);
                    font-size: 12px;
                    font-weight: 650;
                }
                .pd-nav {
                    display: flex;
                    width: 100%;
                    align-items: center;
                    gap: 12px;
                    border-radius: 13px;
                    padding: 12px 13px;
                    color: rgba(221,240,225,.55);
                    font-size: 13px;
                    font-weight: 650;
                    text-align: left;
                    transition: .2s;
                }
                .pd-nav:hover { background: rgba(255,255,255,.04); color: white; }
                .pd-nav-active {
                    background: rgba(148,236,54,.1);
                    color: #c8f69c;
                    box-shadow: inset 2px 0 #94ec36;
                }
                .pd-muted { color: rgba(221,240,225,.48); }
                .pd-stat {
                    padding: 20px;
                    border: 1px solid rgba(210,255,221,.09);
                    border-radius: 20px;
                    background: rgba(16,35,24,.78);
                }
                .pd-stat-label {
                    color: rgba(221,240,225,.48);
                    font-size: 11px;
                    font-weight: 650;
                }
                .pd-stat-value {
                    margin-top: 14px;
                    font-size: clamp(22px, 2.5vw, 30px);
                    font-weight: 800;
                    letter-spacing: -.04em;
                }
                .pd-scrollbar::-webkit-scrollbar { width: 5px; }
                .pd-scrollbar::-webkit-scrollbar-thumb {
                    border-radius: 8px;
                    background: rgba(148,236,54,.2);
                }
                @media(max-width:767px) {
                    .pd-card { padding: 15px; }
                    .pd-stat { padding: 15px; }
                }
            `}</style>

            <div className="flex min-h-screen">
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/70 md:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                    )}
                </AnimatePresence>

                <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.07] bg-[#09170f] p-5 transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex items-center gap-3 px-1">
                        <BrandMark />
                        <div>
                            <p className="text-lg font-black tracking-tight">PayDrop</p>
                            <p className="text-[9px] font-bold tracking-[.22em] text-lime-300/55">
                                CREATOR WORKSPACE
                            </p>
                        </div>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="ml-auto rounded-lg p-2 text-white/50 md:hidden"
                            aria-label="Close menu"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <button
                        onClick={openRequest}
                        className="pd-primary mt-9 w-full"
                    >
                        <Plus size={17} /> New delivery
                    </button>

                    <p className="mb-3 mt-9 px-3 text-[9px] font-bold tracking-[.2em] text-emerald-100/30">
                        WORKSPACE
                    </p>

                    <nav className="space-y-1">
                        {navItems.map(item => {
                            const NavIcon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setCurrentTab(item.id);
                                        setMobileMenuOpen(false);
                                    }}
                                    className={`pd-nav ${currentTab === item.id ? 'pd-nav-active' : ''}`}
                                >
                                    <NavIcon size={17} />
                                    <span className="flex-1">{item.label}</span>
                                    {item.count > 0 && (
                                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px]">
                                            {item.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mt-auto">
                        <div className="mb-4 rounded-2xl border border-lime-300/10 bg-lime-300/[0.04] p-4">
                            <div className="flex items-center gap-2 text-lime-200">
                                <ShieldCheck size={16} />
                                <span className="text-xs font-bold">Protected delivery</span>
                            </div>
                            <p className="mt-2 text-[11px] leading-5 text-emerald-100/45">
                                Keep your deliverables organized in a single client portal.
                            </p>
                        </div>

                        <button
                            onClick={() => setProfileDrawerOpen(true)}
                            className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] p-3 text-left hover:bg-white/[0.03]"
                        >
                            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-lime-300/10 text-sm font-bold text-lime-200">
                                {initials(user.displayName || user.email)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold">
                                    {user.displayName || 'Creator'}
                                </p>
                                <p className="mt-1 truncate text-[10px] text-white/40">
                                    {user.email}
                                </p>
                            </div>
                            <MoreHorizontal size={17} className="text-white/40" />
                        </button>
                    </div>
                </aside>

                <main className="min-w-0 flex-1">
                    <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-white/[0.06] bg-[#07130e]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="rounded-xl border border-white/10 p-2.5 md:hidden"
                                aria-label="Open menu"
                            >
                                <Menu size={18} />
                            </button>
                            <div className="min-w-0">
                                <p className="truncate text-[10px] font-bold tracking-[.16em] text-lime-200/50">
                                    CREATOR CONSOLE
                                </p>
                                <h1 className="mt-1 truncate text-lg font-bold tracking-tight sm:text-xl">
                                    {currentTab === 'home' ? 'Overview'
                                        : currentTab === 'projects' ? 'Your projects'
                                            : currentTab === 'revisions' ? 'Client messages'
                                                : currentTab === 'wallet' ? 'Wallet & earnings'
                                                    : currentTab === 'chat-thread' ? 'Project conversation'
                                                        : 'Your workspace'}
                                </h1>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 sm:flex">
                                <ShieldCheck size={14} className="text-lime-200" />
                                <span className="text-[10px] font-semibold text-emerald-100/55">
                                    Secure workspace
                                </span>
                            </div>
                            <button
                                onClick={() => setAiDrawerOpen(true)}
                                className="flex items-center gap-2 rounded-xl border border-lime-200/15 bg-lime-200/[0.06] px-3 py-2.5 text-xs font-bold text-lime-100"
                            >
                                <Sparkles size={15} />
                                <span className="hidden sm:inline">PayDrop AI</span>
                            </button>
                        </div>
                    </header>

                    <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
                        {currentTab === 'home' && (
                            <>
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                                    <div>
                                        <p className="text-sm text-emerald-100/50">
                                            Welcome back, {user.displayName?.split(' ')[0] || 'Creator'}.
                                        </p>
                                        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                                            Your work, <span className="text-lime-200">protected.</span>
                                        </h2>
                                        <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/45">
                                            Manage deliveries, share client portals and keep every project in one place.
                                        </p>
                                    </div>
                                    <button onClick={openRequest} className="pd-primary self-start sm:self-auto">
                                        <Plus size={17} /> Create delivery
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                                    <div className="pd-stat">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="pd-stat-label">Total projects</p>
                                            <Briefcase size={17} className="text-lime-200/70" />
                                        </div>
                                        <p className="pd-stat-value">{deliveries.length}</p>
                                        <p className="mt-2 text-[10px] text-emerald-100/35">All deliveries</p>
                                    </div>
                                    <div className="pd-stat">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="pd-stat-label">Paid projects</p>
                                            <Check size={17} className="text-lime-200/70" />
                                        </div>
                                        <p className="pd-stat-value">{paidDeliveries.length}</p>
                                        <p className="mt-2 text-[10px] text-emerald-100/35">Marked as paid</p>
                                    </div>
                                    <div className="pd-stat">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="pd-stat-label">Pending payment</p>
                                            <Clock3 size={17} className="text-amber-200/70" />
                                        </div>
                                        <p className="pd-stat-value">
                                            {deliveries.filter(d => d.status !== 'Paid').length}
                                        </p>
                                        <p className="mt-2 text-[10px] text-emerald-100/35">Awaiting completion</p>
                                    </div>
                                    <div className="pd-stat">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="pd-stat-label">Client messages</p>
                                            <MessageSquare size={17} className="text-lime-200/70" />
                                        </div>
                                        <p className="pd-stat-value">{unreadRevisions.length}</p>
                                        <p className="mt-2 text-[10px] text-emerald-100/35">Projects with messages</p>
                                    </div>
                                </div>

                                <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
                                    <Panel className="p-5 sm:p-7">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold text-emerald-100/45">
                                                    Revenue overview
                                                </p>
                                                <p className="mt-2 text-3xl font-black tracking-tight">
                                                    {balanceVisible
                                                        ? formatCurrency(selectedRevenue, currency)
                                                        : '••••••'}
                                                </p>
                                                <p className="mt-2 text-[11px] text-emerald-100/40">
                                                    Earnings from projects marked paid
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setBalanceVisible(v => !v)}
                                                    className="rounded-xl border border-white/[0.08] p-2.5 text-white/55"
                                                    aria-label="Toggle balance visibility"
                                                >
                                                    {balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                <select
                                                    value={currency}
                                                    onChange={e => setCurrency(e.target.value)}
                                                    className="rounded-xl border border-white/[0.08] bg-[#0c1c13] px-3 py-2.5 text-xs outline-none"
                                                    aria-label="Select currency"
                                                >
                                                    <option value="INR">INR ₹</option>
                                                    <option value="USD">USD $</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mt-7">
                                            <svg viewBox="0 0 300 130" className="h-auto w-full overflow-visible" role="img" aria-label="Monthly revenue chart">
                                                <defs>
                                                    <linearGradient id="pdChartFill" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#94ec36" stopOpacity=".23" />
                                                        <stop offset="100%" stopColor="#94ec36" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                {[20, 45, 70, 95].map(y => (
                                                    <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,.07)" strokeDasharray="3 5" />
                                                ))}
                                                <path d={areaPathD} fill="url(#pdChartFill)" />
                                                <path d={svgPathD} fill="none" stroke="#94ec36" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                {chartPoints.map(p => (
                                                    <circle
                                                        key={p.month}
                                                        cx={p.x}
                                                        cy={p.y}
                                                        r={activeChartPoint?.month === p.month ? 5 : 2.5}
                                                        fill="#94ec36"
                                                        stroke="#0d1e15"
                                                        strokeWidth="1.5"
                                                        className="cursor-pointer"
                                                        onClick={() => setActiveChartPoint(p)}
                                                    />
                                                ))}
                                            </svg>

                                            <div className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-12">
                                                {chartPoints.map(p => (
                                                    <button
                                                        key={p.month}
                                                        onClick={() => setActiveChartPoint(p)}
                                                        className={`rounded-md py-1.5 text-[9px] ${activeChartPoint?.month === p.month ? 'bg-lime-300/10 text-lime-200' : 'text-emerald-100/35 hover:text-white'}`}
                                                    >
                                                        {p.month}
                                                    </button>
                                                ))}
                                            </div>

                                            {activeChartPoint && (
                                                <div className="mt-3 flex items-center justify-between rounded-xl border border-lime-200/10 bg-lime-200/[0.04] p-3">
                                                    <span className="text-xs text-emerald-100/55">
                                                        {activeChartPoint.month} {currentYear}
                                                    </span>
                                                    <span className="text-sm font-bold text-lime-200">
                                                        {formatCurrency(activeChartPoint.amount, currency)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </Panel>

                                    <Panel className="p-5 sm:p-7">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold text-emerald-100/45">
                                                    Workspace activity
                                                </p>
                                                <h3 className="mt-2 text-lg font-bold">Recent deliveries</h3>
                                            </div>
                                            <button
                                                onClick={() => setCurrentTab('projects')}
                                                className="flex items-center gap-1 text-xs font-bold text-lime-200"
                                            >
                                                View all <ArrowUpRight size={14} />
                                            </button>
                                        </div>

                                        <div className="mt-5 space-y-1">
                                            {deliveries.slice(0, 5).map((item, i) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        setActiveThreadDelivery(item);
                                                        setCurrentTab('chat-thread');
                                                    }}
                                                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/[0.035]"
                                                >
                                                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime-200/[0.07] text-lime-200">
                                                        <Files size={17} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-semibold">
                                                            {item.title || 'Untitled project'}
                                                        </p>
                                                        <p className="mt-1 truncate text-[10px] text-white/40">
                                                            {item.clientName || 'Client'}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-[10px] font-semibold text-emerald-100/65">
                                                        {formatCurrency(item.grossAmount, item.currency || 'INR')}
                                                    </span>
                                                </button>
                                            ))}

                                            {!deliveries.length && (
                                                <div className="py-10 text-center">
                                                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-lime-200/[0.07] text-lime-200">
                                                        <Files size={20} />
                                                    </div>
                                                    <p className="mt-4 text-sm font-semibold">No projects yet</p>
                                                    <p className="mt-2 text-xs text-white/40">
                                                        Create your first protected delivery.
                                                    </p>
                                                    <button onClick={openRequest} className="pd-primary mt-4">
                                                        <Plus size={15} /> Create project
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </Panel>
                                </div>

                                <div>
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <h3 className="text-lg font-bold">Latest projects</h3>
                                        <button onClick={() => setCurrentTab('projects')} className="text-xs font-semibold text-lime-200">
                                            See all <ArrowRight size={13} className="inline" />
                                        </button>
                                    </div>
                                    {deliveries.length ? (
                                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                            {deliveries.slice(0, 3).map(renderDeliveryCard)}
                                        </div>
                                    ) : (
                                        <div className="pd-panel p-8 text-center">
                                            <p className="font-semibold">Your next project starts here.</p>
                                            <p className="mt-2 text-sm text-white/45">
                                                Create a delivery, add your files and share a portal with your client.
                                            </p>
                                            <button onClick={openRequest} className="pd-primary mt-5">
                                                <Plus size={16} /> New delivery
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        {currentTab === 'projects' && (
                            <section>
                                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div>
                                        <h2 className="text-2xl font-black">Your projects</h2>
                                        <p className="mt-2 text-sm text-white/45">
                                            Manage and share all your client deliveries.
                                        </p>
                                    </div>
                                    <button onClick={openRequest} className="pd-primary self-start">
                                        <Plus size={16} /> New delivery
                                    </button>
                                </div>

                                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4">
                                    <Search size={17} className="shrink-0 text-white/35" />
                                    <input
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search projects or clients..."
                                        className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-white/30"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} aria-label="Clear search">
                                            <X size={16} className="text-white/40" />
                                        </button>
                                    )}
                                </div>

                                {filteredDeliveries.length ? (
                                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                        {filteredDeliveries.map(renderDeliveryCard)}
                                    </div>
                                ) : (
                                    <div className="pd-panel p-10 text-center">
                                        <Files size={32} className="mx-auto text-lime-200/70" />
                                        <h3 className="mt-4 font-bold">No matching projects</h3>
                                        <p className="mt-2 text-sm text-white/40">
                                            Try a different search or create a new delivery.
                                        </p>
                                    </div>
                                )}
                            </section>
                        )}

                        {currentTab === 'revisions' && (
                            <section>
                                <h2 className="text-2xl font-black">Client messages</h2>
                                <p className="mt-2 text-sm text-white/45">
                                    Continue conversations about your deliveries.
                                </p>

                                <div className="mt-6 grid gap-4 md:grid-cols-2">
                                    {deliveries.filter(d => d.messages?.length).map(renderDeliveryCard)}
                                </div>

                                {!deliveries.some(d => d.messages?.length) && (
                                    <div className="pd-panel mt-6 p-10 text-center">
                                        <MessageSquare size={30} className="mx-auto text-lime-200/60" />
                                        <p className="mt-4 font-semibold">No messages yet</p>
                                        <p className="mt-2 text-sm text-white/40">
                                            Client conversations will appear here when messages are available.
                                        </p>
                                    </div>
                                )}
                            </section>
                        )}

                        {currentTab === 'wallet' && (
                            <section>
                                <h2 className="text-2xl font-black">Wallet & earnings</h2>
                                <p className="mt-2 text-sm text-white/45">
                                    Review project amounts and earnings recorded in your workspace.
                                </p>

                                <Panel className="mt-6 p-6 sm:p-8">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-white/45">Recorded creator earnings</p>
                                            <p className="mt-3 text-3xl font-black text-lime-200">
                                                {balanceVisible
                                                    ? formatCurrency(selectedRevenue, currency)
                                                    : '••••••'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setBalanceVisible(v => !v)}
                                            className="pd-secondary flex items-center gap-2"
                                        >
                                            {balanceVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                            {balanceVisible ? 'Hide balance' : 'Show balance'}
                                        </button>
                                    </div>
                                    <div className="mt-5 flex gap-2">
                                        <button
                                            onClick={() => setCurrency('INR')}
                                            className={`pd-secondary ${currency === 'INR' ? 'border-lime-200/30 text-lime-200' : ''}`}
                                        >
                                            INR ₹
                                        </button>
                                        <button
                                            onClick={() => setCurrency('USD')}
                                            className={`pd-secondary ${currency === 'USD' ? 'border-lime-200/30 text-lime-200' : ''}`}
                                        >
                                            USD $
                                        </button>
                                    </div>
                                </Panel>

                                <div className="mt-6 space-y-3">
                                    {paidDeliveries.map(item => (
                                        <div key={item.id} className="pd-panel flex flex-wrap items-center justify-between gap-3 p-4">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold">{item.title}</p>
                                                <p className="mt-1 text-xs text-white/40">
                                                    {item.clientName || 'Client'} · Paid project
                                                </p>
                                            </div>
                                            <p className="font-bold text-lime-200">
                                                {formatCurrency(
                                                    item.creatorPayout ?? item.grossAmount,
                                                    item.currency || 'INR'
                                                )}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-5 text-xs leading-5 text-amber-100/50">
                                    Note: these totals reflect project records in Firestore. They do not confirm that funds have been received in a bank account or payment processor.
                                </p>
                            </section>
                        )}

                        {currentTab === 'chat-thread' && (
                            <section className="mx-auto max-w-3xl">
                                <button
                                    onClick={() => setCurrentTab('revisions')}
                                    className="mb-5 flex items-center gap-2 text-sm text-white/50 hover:text-white"
                                >
                                    <ArrowLeft size={16} /> Back to messages
                                </button>

                                <Panel className="flex min-h-[65vh] flex-col">
                                    <div className="border-b border-white/[0.07] p-5">
                                        <h2 className="font-bold">
                                            {activeThreadDelivery?.title || 'Project conversation'}
                                        </h2>
                                        <p className="mt-1 text-xs text-white/40">
                                            {activeThreadDelivery?.clientName || 'Client'}
                                        </p>
                                    </div>

                                    <div className="pd-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
                                        {(activeThreadDelivery?.messages || []).map((message, i) => (
                                            <div
                                                key={`${message.time || i}-${i}`}
                                                className={`flex ${message.sender === 'creator' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[85%] rounded-2xl p-4 ${message.sender === 'creator' ? 'bg-lime-300 text-emerald-950' : 'border border-white/[0.08] bg-white/[0.04] text-white'}`}>
                                                    <p className="whitespace-pre-wrap break-words text-sm">
                                                        {message.text}
                                                    </p>
                                                    <p className={`mt-2 text-[9px] ${message.sender === 'creator' ? 'text-emerald-950/55' : 'text-white/35'}`}>
                                                        {message.sender === 'creator' ? 'You' : 'Client'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}

                                        {!activeThreadDelivery?.messages?.length && (
                                            <p className="py-10 text-center text-sm text-white/35">
                                                No messages in this conversation yet.
                                            </p>
                                        )}

                                        <div ref={chatBottomRef} />
                                    </div>

                                    <form
                                        className="flex gap-2 border-t border-white/[0.07] p-4"
                                        onSubmit={e => {
                                            e.preventDefault();
                                            if (activeThreadDelivery) {
                                                handleSendThreadReply(activeThreadDelivery.id);
                                            }
                                        }}
                                    >
                                        <input
                                            value={threadReplyText}
                                            onChange={e => setThreadReplyText(e.target.value)}
                                            placeholder="Write a reply..."
                                            className="pd-input flex-1"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!threadReplyText.trim()}
                                            className="pd-primary"
                                            aria-label="Send reply"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </form>
                                </Panel>
                            </section>
                        )}
                    </div>
                </main>
            </div>

            <AnimatePresence>
                {requestModalOpen && (
                    <motion.div
                        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onMouseDown={e => {
                            if (e.target === e.currentTarget && !uploading) {
                                setRequestModalOpen(false);
                            }
                        }}
                    >
                        <motion.div
                            initial={reduceMotion ? false : { opacity: 0, y: 25, scale: .98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="pd-panel pd-scrollbar max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-b-none p-5 sm:rounded-[24px] sm:p-7"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-bold tracking-[.18em] text-lime-200/55">
                                        NEW DELIVERY
                                    </p>
                                    <h2 className="mt-2 text-xl font-black">
                                        Create a client vault
                                    </h2>
                                    <p className="mt-2 text-xs leading-5 text-white/40">
                                        Add project details and upload your deliverables.
                                    </p>
                                </div>
                                <button
                                    disabled={uploading}
                                    onClick={() => setRequestModalOpen(false)}
                                    className="rounded-xl border border-white/10 p-2 text-white/55 disabled:opacity-40"
                                    aria-label="Close modal"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="mt-6 flex gap-2">
                                {[1, 2, 3].map(step => (
                                    <div
                                        key={step}
                                        className={`h-1.5 flex-1 rounded-full ${wizardStep >= step ? 'bg-lime-300' : 'bg-white/10'}`}
                                    />
                                ))}
                            </div>

                            {wizardStep === 1 && (
                                <div className="mt-6 space-y-5">
                                    <div>
                                        <label className="pd-label">Project name *</label>
                                        <input
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            className="pd-input"
                                            placeholder="e.g. Brand identity package"
                                            required
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="pd-label">Client name</label>
                                            <input
                                                value={clientName}
                                                onChange={e => setClientName(e.target.value)}
                                                className="pd-input"
                                                placeholder="Client's name"
                                            />
                                        </div>
                                        <div>
                                            <label className="pd-label">Client email</label>
                                            <input
                                                type="email"
                                                value={clientEmail}
                                                onChange={e => setClientEmail(e.target.value)}
                                                className="pd-input"
                                                placeholder="client@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="pd-label">Project notes</label>
                                        <textarea
                                            value={clientMessage}
                                            onChange={e => setClientMessage(e.target.value)}
                                            className="pd-input min-h-24 resize-y"
                                            placeholder="Add instructions for your client..."
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="pd-label">Amount *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="0.01"
                                                value={amount}
                                                onChange={e => setAmount(e.target.value)}
                                                className="pd-input"
                                                placeholder="Enter amount"
                                            />
                                        </div>
                                        <div>
                                            <label className="pd-label">Currency</label>
                                            <select
                                                value={currency}
                                                onChange={e => setCurrency(e.target.value)}
                                                className="pd-input"
                                            >
                                                <option value="INR">INR (₹)</option>
                                                <option value="USD">USD ($)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="pd-label">Portal expiry</label>
                                        <select
                                            value={expirySelection}
                                            onChange={e => setExpirySelection(e.target.value)}
                                            className="pd-input"
                                        >
                                            <option value="1">1 day</option>
                                            <option value="7">7 days</option>
                                            <option value="14">14 days</option>
                                            <option value="30">30 days</option>
                                            <option value="never">Never expires</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (!title.trim() || !amount || Number(amount) <= 0) {
                                                showToast('Enter a project name and valid amount', 'error');
                                                return;
                                            }
                                            setWizardStep(2);
                                        }}
                                        className="pd-primary w-full"
                                    >
                                        Continue <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}

                            {wizardStep === 2 && (
                                <div className="mt-6 space-y-5">
                                    <div>
                                        <label className="pd-label">Deliverable files *</label>
                                        <label
                                            onDragOver={e => {
                                                e.preventDefault();
                                                setIsDragging(true);
                                            }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={e => {
                                                e.preventDefault();
                                                setIsDragging(false);
                                                handleFilesAdd(e.dataTransfer.files);
                                            }}
                                            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center transition ${isDragging ? 'border-lime-200 bg-lime-200/10' : 'border-white/15 bg-white/[0.02] hover:border-lime-200/40'}`}
                                        >
                                            <UploadCloud size={28} className="text-lime-200" />
                                            <p className="mt-3 text-sm font-semibold">
                                                Drop files here or browse
                                            </p>
                                            <p className="mt-2 text-xs text-white/40">
                                                Images, videos, PDFs and other deliverables
                                            </p>
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={e => {
                                                    handleFilesAdd(e.target.files);
                                                    e.target.value = '';
                                                }}
                                            />
                                        </label>
                                    </div>

                                    {fileList.length > 0 && (
                                        <div className="space-y-2">
                                            {fileList.map((file, i) => (
                                                <div key={`${file.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-white/[0.07] p-3">
                                                    <File size={17} className="shrink-0 text-lime-200" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-semibold">{file.name}</p>
                                                        <p className="mt-1 text-[10px] text-white/40">
                                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFile(i)}
                                                        className="rounded-lg p-2 text-white/40 hover:text-red-300"
                                                        aria-label={`Remove ${file.name}`}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button onClick={() => setWizardStep(1)} className="pd-secondary flex-1">
                                            <ArrowLeft size={15} className="mr-1 inline" /> Back
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!fileList.length) {
                                                    showToast('Add at least one file', 'error');
                                                    return;
                                                }
                                                setWizardStep(3);
                                            }}
                                            className="pd-primary flex-1"
                                        >
                                            Continue <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {wizardStep === 3 && (
                                <div className="mt-6 space-y-5">
                                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                                        <p className="text-xs text-white/45">Project summary</p>
                                        <h3 className="mt-2 text-lg font-bold">{title}</h3>
                                        <div className="mt-4 flex justify-between gap-3 text-sm">
                                            <span className="text-white/45">Client</span>
                                            <span className="text-right">{clientName || clientEmail || 'Not specified'}</span>
                                        </div>
                                        <div className="mt-3 flex justify-between gap-3 text-sm">
                                            <span className="text-white/45">Files</span>
                                            <span>{fileList.length}</span>
                                        </div>
                                        <div className="mt-3 flex justify-between gap-3 text-sm">
                                            <span className="text-white/45">Amount</span>
                                            <span className="font-bold text-lime-200">
                                                {formatCurrency(amount, currency)}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex justify-between gap-3 text-sm">
                                            <span className="text-white/45">Platform fee (estimated 5%)</span>
                                            <span>{formatCurrency(Math.max(Number(amount) * .05, 1), currency)}</span>
                                        </div>
                                    </div>

                                    {uploading && (
                                        <div>
                                            <div className="mb-2 flex justify-between text-xs">
                                                <span className="text-white/50">Uploading files...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                                <div
                                                    className="h-full rounded-full bg-lime-300 transition-all"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            disabled={uploading}
                                            onClick={() => setWizardStep(2)}
                                            className="pd-secondary flex-1"
                                        >
                                            <ArrowLeft size={15} className="mr-1 inline" /> Back
                                        </button>
                                        <button
                                            disabled={uploading}
                                            onClick={handleDeployVault}
                                            className="pd-primary flex-1"
                                        >
                                            {uploading
                                                ? <><LoaderCircle size={16} className="animate-spin" /> Uploading...</>
                                                : <><Lock size={15} /> Create vault</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {profileDrawerOpen && (
                    <motion.div
                        className="fixed inset-0 z-[80] flex justify-end bg-black/65 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onMouseDown={e => {
                            if (e.target === e.currentTarget) setProfileDrawerOpen(false);
                        }}
                    >
                        <motion.aside
                            initial={{ x: 350 }}
                            animate={{ x: 0 }}
                            exit={{ x: 350 }}
                            className="pd-scrollbar h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-[#09170f] p-6"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold">Your profile</h2>
                                <button onClick={() => setProfileDrawerOpen(false)} className="pd-secondary">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="mt-8 flex flex-col items-center text-center">
                                <div className="grid size-20 place-items-center rounded-3xl bg-lime-300/10 text-2xl font-black text-lime-200">
                                    {initials(user.displayName || user.email)}
                                </div>
                                <h3 className="mt-4 font-bold">{user.displayName || 'Creator'}</h3>
                                <p className="mt-1 break-all text-xs text-white/40">{user.email}</p>
                            </div>

                            <div className="mt-8 space-y-3">
                                <div className="rounded-xl border border-white/[0.08] p-4">
                                    <p className="text-[10px] text-white/40">Authentication</p>
                                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                                        <ShieldCheck size={16} className="text-lime-200" />
                                        Firebase authenticated
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.08] p-4">
                                    <p className="text-[10px] text-white/40">Account ID</p>
                                    <p className="mt-2 break-all text-xs">{user.uid}</p>
                                </div>
                            </div>

                            <button onClick={handleLogout} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-red-300/15 bg-red-300/[0.05] p-3 text-sm font-bold text-red-200">
                                <LogOut size={16} /> Sign out
                            </button>
                        </motion.aside>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {aiDrawerOpen && (
                    <motion.div
                        className="fixed inset-0 z-[80] flex justify-end bg-black/65 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onMouseDown={e => {
                            if (e.target === e.currentTarget) setAiDrawerOpen(false);
                        }}
                    >
                        <motion.aside
                            initial={{ x: 350 }}
                            animate={{ x: 0 }}
                            exit={{ x: 350 }}
                            className="h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-[#09170f] p-6"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="grid size-11 place-items-center rounded-2xl bg-lime-300/10 text-lime-200">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold">PayDrop AI</h2>
                                        <p className="mt-1 text-[10px] text-white/40">Workspace assistant</p>
                                    </div>
                                </div>
                                <button onClick={() => setAiDrawerOpen(false)} className="pd-secondary">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="mt-8 rounded-2xl border border-lime-200/10 bg-lime-200/[0.04] p-5">
                                <Bot size={24} className="text-lime-200" />
                                <h3 className="mt-4 font-bold">Your workspace at a glance</h3>
                                <p className="mt-2 text-xs leading-6 text-white/50">
                                    You have {deliveries.length} project{deliveries.length === 1 ? '' : 's'}, {paidDeliveries.length} marked paid, and {unreadRevisions.length} project{unreadRevisions.length === 1 ? '' : 's'} with client messages.
                                </p>
                            </div>

                            <h3 className="mb-3 mt-7 text-xs font-bold text-white/50">
                                QUICK ACTIONS
                            </h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        setAiDrawerOpen(false);
                                        openRequest();
                                    }}
                                    className="pd-secondary flex w-full items-center justify-between text-left"
                                >
                                    Create a delivery <ArrowRight size={15} />
                                </button>
                                <button
                                    onClick={() => {
                                        setAiDrawerOpen(false);
                                        setCurrentTab('projects');
                                    }}
                                    className="pd-secondary flex w-full items-center justify-between text-left"
                                >
                                    Review projects <ArrowRight size={15} />
                                </button>
                                <button
                                    onClick={() => {
                                        setAiDrawerOpen(false);
                                        setCurrentTab('wallet');
                                    }}
                                    className="pd-secondary flex w-full items-center justify-between text-left"
                                >
                                    View earnings <ArrowRight size={15} />
                                </button>
                            </div>

                            <p className="mt-8 text-[10px] leading-5 text-white/30">
                                This panel summarizes workspace data. It does not contact an AI service or initiate payments.
                            </p>
                        </motion.aside>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-5 left-1/2 z-[100] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-2xl border px-5 py-3 shadow-2xl backdrop-blur-xl ${toast.type === 'error' ? 'border-red-300/20 bg-[#28100e] text-red-100' : 'border-lime-200/20 bg-[#102318] text-lime-100'}`}
                        role="status"
                        aria-live="polite"
                    >
                        {toast.type === 'error'
                            ? <CircleHelp size={17} />
                            : <CheckCircle2 size={17} />}
                        <span className="text-xs font-semibold">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-1 opacity-60 hover:opacity-100" aria-label="Dismiss notification">
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
