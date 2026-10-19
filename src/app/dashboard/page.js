
"use client";

import { useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  CreditCard,
  FileCheck2,
  FilePlus2,
  FolderKanban,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Zap,
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Deliveries", icon: FolderKanban, count: "4" },
  { label: "Transactions", icon: CreditCard },
  { label: "Wallet", icon: Wallet },
];

const metrics = [
  {
    label: "Total earnings",
    value: "₹84,250",
    change: "+12.8%",
    detail: "vs. last month",
    icon: Wallet,
  },
  {
    label: "In escrow",
    value: "₹26,400",
    change: "3 active",
    detail: "awaiting approval",
    icon: ShieldCheck,
  },
  {
    label: "Completed",
    value: "24",
    change: "+4",
    detail: "this month",
    icon: FileCheck2,
  },
];

const deliveries = [
  {
    name: "Brand identity system",
    client: "Aarav Mehta",
    amount: "₹18,500",
    status: "In review",
    progress: 85,
    initials: "AM",
    color: "from-emerald-400/20 to-teal-400/5",
  },
  {
    name: "Landing page design",
    client: "Priya Sharma",
    amount: "₹12,000",
    status: "In escrow",
    progress: 55,
    initials: "PS",
    color: "from-lime-300/20 to-emerald-400/5",
  },
  {
    name: "Social media assets",
    client: "Kabir Singh",
    amount: "₹8,400",
    status: "Completed",
    progress: 100,
    initials: "KS",
    color: "from-cyan-300/20 to-teal-400/5",
  },
];

const revenue = [28, 43, 35, 58, 45, 68, 52, 73, 61, 86, 69, 95];

function haptic(pattern: number | number[] = 8) {
  if (
    typeof navigator !== "undefined" &&
    "vibrate" in navigator
  ) {
    navigator.vibrate(pattern);
  }
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-[14px] bg-gradient-to-br from-lime-200 to-emerald-400 text-emerald-950 shadow-lg shadow-emerald-500/10">
        <Zap size={21} strokeWidth={2.7} />
      </div>
      <div>
        <div className="text-[18px] font-bold tracking-tight text-white">
          paydrop<span className="text-emerald-300">.</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/40">
          Creator workspace
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.19em] text-emerald-100/35">
      {children}
    </div>
  );
}

function Sidebar({
  active,
  onNavigate,
  onClose,
}: {
  active: string;
  onNavigate: (label: string) => void;
  onClose?: () => void;
}) {
  return (
    <aside className="flex h-full flex-col bg-[#09140f] px-4 py-5">
      <div className="px-2">
        <Brand />
      </div>

      <div className="mt-10">
        <SectionLabel>Workspace</SectionLabel>
        <nav className="space-y-1">
          {navigation.map(({ label, icon: Icon, count }) => (
            <button
              key={label}
              onClick={() => {
                haptic();
                onNavigate(label);
                onClose?.();
              }}
              data-active={active === label}
              className="pd-nav-item w-full"
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="flex-1 text-left text-[13px] font-medium">
                {label}
              </span>
              {count && (
                <span className="rounded-md bg-emerald-300/10 px-2 py-0.5 text-[10px] text-emerald-200">
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-8">
        <SectionLabel>Manage</SectionLabel>
        <button
          onClick={() => onNavigate("Settings")}
          data-active={active === "Settings"}
          className="pd-nav-item w-full"
        >
          <Activity size={18} />
          <span className="text-[13px] font-medium">Settings</span>
        </button>
      </div>

      <div className="mt-auto">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/10 bg-gradient-to-br from-emerald-300/[0.11] to-lime-200/[0.025] p-4">
          <div className="absolute -right-5 -top-5 size-20 rounded-full bg-emerald-300/10 blur-2xl" />
          <Sparkles size={18} className="text-lime-200" />
          <div className="mt-3 text-sm font-semibold text-white">
            Built for creators
          </div>
          <p className="mt-1 text-xs leading-5 text-emerald-100/50">
            Keep every delivery, approval and payment in one place.
          </p>
        </div>

        <button className="mt-5 flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.035]">
          <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-lime-200 text-xs font-bold text-emerald-950">
            BB
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white">
              Your workspace
            </div>
            <div className="mt-0.5 text-[10px] text-emerald-100/40">
              Freelancer account
            </div>
          </div>
          <MoreHorizontal size={17} className="text-emerald-100/40" />
        </button>
      </div>
    </aside>
  );
}

function MetricCard({
  item,
  index,
}: {
  item: (typeof metrics)[number];
  index: number;
}) {
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      whileHover={{ y: -3 }}
      className="pd-card p-5 sm:p-6"
    >
      <div className="flex items-start justify-between">
        <div className="grid size-10 place-items-center rounded-xl border border-emerald-100/[0.08] bg-emerald-200/[0.06] text-emerald-200">
          <Icon size={19} strokeWidth={1.7} />
        </div>
        <span className="rounded-full border border-emerald-300/10 bg-emerald-300/[0.07] px-2.5 py-1 text-[10px] font-medium text-emerald-200">
          {item.change}
        </span>
      </div>

      <div className="mt-6 text-xs text-emerald-100/45">
        {item.label}
      </div>
      <div className="pd-metric-value mt-1 text-[28px] font-semibold text-white sm:text-[32px]">
        {item.value}
      </div>
      <div className="mt-2 text-[11px] text-emerald-100/35">
        {item.detail}
      </div>
    </motion.div>
  );
}

function RevenueCard() {
  return (
    <section className="pd-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">
            Revenue overview
          </div>
          <p className="mt-1 text-xs text-emerald-100/40">
            Your earnings at a glance
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-emerald-100/65 transition hover:bg-white/[0.06]">
          Last 12 months <ChevronDown size={14} />
        </button>
      </div>

      <div className="mt-7 flex items-end gap-3">
        <div className="pd-metric-value text-[30px] font-semibold text-white">
          ₹84,250
        </div>
        <div className="mb-1 flex items-center gap-1 text-xs text-emerald-300">
          <ArrowUpRight size={14} /> 12.8%
        </div>
      </div>

      <div className="relative mt-7 h-[170px]">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((line) => (
            <div
              key={line}
              className="border-t border-dashed border-emerald-100/[0.075]"
            />
          ))}
        </div>

        <div className="absolute inset-0 flex items-end gap-2 sm:gap-3">
          {revenue.map((height, i) => (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${height}%`, opacity: 1 }}
              transition={{
                duration: 0.65,
                delay: 0.2 + i * 0.035,
                ease: "easeOut",
              }}
              className="group relative flex-1 rounded-t-md bg-gradient-to-t from-emerald-500/20 via-emerald-300/55 to-lime-200/90 transition-all duration-200 hover:brightness-125"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-lime-100/90 opacity-0 transition group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-between text-[10px] text-emerald-100/35">
        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </section>
  );
}

function DeliveryCard({
  item,
  index,
}: {
  item: (typeof deliveries)[number];
  index: number;
}) {
  const complete = item.status === "Completed";

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.18 + index * 0.07 }}
      className="group flex items-center gap-3 border-b border-white/[0.055] py-4 last:border-0"
    >
      <div
        className={`grid size-11 shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-gradient-to-br ${item.color} text-xs font-semibold text-emerald-100`}
      >
        {item.initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-white transition group-hover:text-lime-100">
          {item.name}
        </div>
        <div className="mt-1 text-[11px] text-emerald-100/40">
          {item.client}
        </div>
        <div className="mt-3 h-1 w-full max-w-[180px] overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${item.progress}%` }}
            transition={{ duration: 0.7, delay: 0.2 + index * 0.07 }}
            className={`h-full rounded-full ${
              complete ? "bg-lime-200" : "bg-emerald-300"
            }`}
          />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[12px] font-semibold text-white">
          {item.amount}
        </div>
        <div
          className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] ${
            complete
              ? "bg-lime-200/[0.08] text-lime-200"
              : "bg-emerald-200/[0.08] text-emerald-200"
          }`}
        >
          <span className="pd-status-dot" />
          {item.status}
        </div>
      </div>
    </motion.div>
  );
}

export default function PayDropDashboardUI() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState("");

  function openCreate() {
    haptic(10);
    setNotice("");
    setCreateOpen(true);
  }

  function submitDemoRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    haptic([12, 35, 12]);
    setNotice(
      "UI demo only — connect your existing payment-request handler before creating a real request."
    );
  }

  return (
    <div className="min-h-screen bg-[#07110e] text-[#effcf4]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="pd-grid-glow absolute inset-0 opacity-70" />
        <div className="absolute -left-40 -top-40 size-[420px] rounded-full bg-emerald-500/[0.06] blur-[120px]" />
        <div className="absolute right-[-100px] top-[20%] size-[340px] rounded-full bg-lime-300/[0.035] blur-[110px]" />
      </div>

      <div className="relative flex min-h-screen">
        <div className="hidden w-[250px] shrink-0 border-r border-emerald-100/[0.07] lg:block">
          <div className="sticky top-0 h-screen">
            <Sidebar active={active} onNavigate={setActive} />
          </div>
        </div>

        <AnimatePresence>
          {mobileNav && (
            <>
              <motion.button
                aria-label="Close navigation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileNav(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              />
              <motion.div
                initial={reduceMotion ? false : { x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.22 }}
                className="fixed inset-y-0 left-0 z-50 w-[270px] lg:hidden"
              >
                <Sidebar
                  active={active}
                  onNavigate={setActive}
                  onClose={() => setMobileNav(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1">
          <header className="glass-mint-dark sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-x-0 border-t-0 px-4 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileNav(true)}
                aria-label="Open navigation"
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] text-emerald-100/70 lg:hidden"
              >
                <Menu size={19} />
              </button>

              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-white">
                  {active}
                </div>
                <div className="mt-0.5 hidden text-[11px] text-emerald-100/40 sm:block">
                  Your creative business, in sync.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => {
                  haptic();
                  setNotice("Search UI can be connected to your command palette.");
                }}
                aria-label="Search"
                className="hidden h-10 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-xs text-emerald-100/40 transition hover:bg-white/[0.05] sm:flex"
              >
                <Search size={15} />
                <span>Quick search</span>
                <span className="flex items-center gap-1 rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px]">
                  <Command size={10} /> K
                </span>
              </button>

              <button
                aria-label="Notifications"
                onClick={() => haptic()}
                className="relative grid size-10 place-items-center rounded-xl border border-white/[0.08] text-emerald-100/65 transition hover:bg-white/[0.04]"
              >
                <Bell size={17} />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-lime-200" />
              </button>

              <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />

              <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-lime-200 to-emerald-400 text-xs font-bold text-emerald-950">
                BB
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-4 pb-12 pt-7 sm:px-7 sm:pt-9 lg:px-9">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
            >
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/10 bg-emerald-200/[0.04] px-3 py-1.5 text-[10px] font-medium tracking-wide text-emerald-200/80">
                  <Sparkles size={12} />
                  YOUR CREATOR DASHBOARD
                </div>
                <h1 className="text-[28px] font-semibold tracking-[-0.045em] text-white sm:text-[36px]">
                  Make great work.
                  <br className="sm:hidden" /> Get paid with peace of mind.
                </h1>
                <p className="mt-3 max-w-xl text-[13px] leading-6 text-emerald-100/45">
                  A clearer view of your projects, secured payments and
                  growing business.
                </p>
              </div>

              <button
                onClick={openCreate}
                className="pd-button h-12 shrink-0 px-5 text-[13px]"
              >
                <Plus size={17} strokeWidth={2.5} />
                New payment request
              </button>
            </motion.div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map((item, index) => (
                <MetricCard key={item.label} item={item} index={index} />
              ))}
            </div>

            <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.45fr_1fr]">
              <RevenueCard />

              <section className="pd-card p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Recent deliveries
                    </div>
                    <p className="mt-1 text-xs text-emerald-100/40">
                      Stay on top of your work
                    </p>
                  </div>
                  <button
                    onClick={() => setActive("Deliveries")}
                    className="flex items-center gap-1.5 text-xs text-emerald-200 transition hover:text-lime-200"
                  >
                    View all <ArrowRight size={14} />
                  </button>
                </div>

                <div className="mt-3">
                  {deliveries.map((item, index) => (
                    <DeliveryCard
                      key={item.name}
                      item={item}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <section className="pd-card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-lime-200/[0.08] text-lime-200">
                    <ShieldCheck size={19} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Payment protection
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-100/40">
                      Understand every step
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[12px] leading-6 text-emerald-100/50">
                  Keep project terms, delivery files and approval steps
                  organized with your payment requests.
                </p>

                <button
                  onClick={() => setActive("Deliveries")}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-emerald-200 hover:text-lime-200"
                >
                  Review deliveries <ArrowRight size={14} />
                </button>
              </section>

              <section className="pd-card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-emerald-200/[0.08] text-emerald-200">
                    <ArrowDownLeft size={19} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Ready for your next project?
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-100/40">
                      Start with a clear payment request
                    </div>
                  </div>
                </div>

                <button
                  onClick={openCreate}
                  className="mt-5 flex w-full items-center justify-between rounded-xl border border-emerald-200/10 bg-emerald-200/[0.035] p-3.5 text-left transition hover:border-emerald-200/20 hover:bg-emerald-200/[0.07]"
                >
                  <span className="flex items-center gap-3">
                    <FilePlus2 size={18} className="text-lime-200" />
                    <span className="text-xs font-medium text-white">
                      Create a payment request
                    </span>
                  </span>
                  <ArrowRight size={16} className="text-emerald-200" />
                </button>
              </section>
            </div>

            <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 text-[10px] text-emerald-100/30">
              <span>PayDrop · Creator workspace</span>
              <span className="flex items-center gap-2">
                <CircleHelp size={12} />
                Built for better project workflows
              </span>
            </footer>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setCreateOpen(false);
            }}
          >
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-request-title"
              className="glass-mint w-full max-w-[480px] rounded-[24px] p-5 sm:p-7"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-lime-200 to-emerald-300 text-emerald-950">
                    <FilePlus2 size={20} />
                  </div>
                  <h2
                    id="create-request-title"
                    className="mt-4 text-xl font-semibold tracking-tight text-white"
                  >
                    New payment request
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-emerald-100/45">
                    Add the project details to prepare your request.
                  </p>
                </div>
                <button
                  onClick={() => setCreateOpen(false)}
                  aria-label="Close dialog"
                  className="grid size-9 place-items-center rounded-xl text-emerald-100/50 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={submitDemoRequest} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-emerald-100/70">
                    Project name
                  </span>
                  <input
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Brand identity design"
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-emerald-100/25 focus:border-emerald-200/40 focus:ring-2 focus:ring-emerald-200/[0.06]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-emerald-100/70">
                    Client email
                  </span>
                  <input
                    required
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-emerald-100/25 focus:border-emerald-200/40 focus:ring-2 focus:ring-emerald-200/[0.06]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-emerald-100/70">
                    Amount (INR)
                  </span>
                  <div className="flex h-12 items-center rounded-xl border border-white/[0.09] bg-black/20 px-4 focus-within:border-emerald-200/40">
                    <span className="mr-3 text-sm text-emerald-100/40">₹</span>
                    <input
                      required
                      min="1"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="15000"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-emerald-100/25"
                    />
                  </div>
                </label>

                {notice && (
                  <div
                    role="status"
                    className="rounded-xl border border-lime-200/10 bg-lime-200/[0.05] p-3 text-xs leading-5 text-lime-100/80"
                  >
                    {notice}
                  </div>
                )}

                <button
                  type="submit"
                  className="pd-button h-12 w-full text-sm"
                >
                  <Check size={16} />
                  Prepare request
                </button>

                <p className="text-center text-[10px] leading-5 text-emerald-100/30">
                  Connect this form to your existing request-creation
                  handler before using it for real payments.
                </p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
