import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  ArrowLeft,
  Check,
  PieChart,
  Shield,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import MetLogo from '../components/MetLogo'
import MetLoadingOverlay from '../components/MetLoadingOverlay'
import { getPublicStats, type PublicStats } from '../api/publicApi'

const fallbackStats = {
  totalUsers: 1284,
  totalTransactions: 18420,
  averageUserRating: 4.8,
  countriesCount: 12,
  premiumUsers: 847,
  premiumRate: 65.9,
  avgBalanceUsd: 142000,
  savingsRate: 64,
  avgMonthlyTransactions: 34,
  monthlyIncome: 12450,
  monthlyExpense: 4120
} satisfies PublicStats

function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isYearly, setIsYearly] = useState(false)
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const nextStats = await getPublicStats()
        setStats(nextStats)
      } catch {
        setStats(null)
      } finally {
        setStatsLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    if (showHowItWorks) {
      window.scrollTo(0, 0)
    }
  }, [showHowItWorks])

  useEffect(() => {
    if (!location.hash) return
    if (showHowItWorks) {
      setShowHowItWorks(false)
    }

    const targetId = location.hash.replace('#', '')
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)

    return () => window.clearTimeout(timer)
  }, [location.hash, showHowItWorks])

  useEffect(() => {
    if (!loadingRoute) return
    const timer = window.setTimeout(() => {
      navigate(loadingRoute)
      setLoadingRoute(null)
    }, 1400)

    return () => window.clearTimeout(timer)
  }, [loadingRoute, navigate])

  const safeStats = stats || fallbackStats
  const trustedUsers = useMemo(
    () => new Intl.NumberFormat('en-US').format(safeStats.totalUsers),
    [safeStats.totalUsers]
  )
  const avgBalance = safeStats.avgBalanceUsd ?? fallbackStats.avgBalanceUsd
  const savingsRate = safeStats.savingsRate ?? fallbackStats.savingsRate
  const monthlyIncome = safeStats.monthlyIncome ?? fallbackStats.monthlyIncome
  const monthlyExpense = safeStats.monthlyExpense ?? fallbackStats.monthlyExpense
  const statsBarItems = useMemo(() => {
    if (statsLoading) {
      return [
        { label: 'ACTIVE USERS', value: '...' },
        { label: 'TRANSACTIONS TRACKED', value: '...' },
        { label: 'USER RATING', value: '...' as string, accent: true },
        { label: 'COUNTRIES', value: '...' }
      ]
    }

    return [
      { label: 'ACTIVE USERS', value: new Intl.NumberFormat('en-US').format(safeStats.totalUsers) },
      { label: 'TRANSACTIONS TRACKED', value: formatLargeCount(safeStats.totalTransactions) },
      {
        label: 'USER RATING',
        value: safeStats.averageUserRating === null ? 'N/A' : `${safeStats.averageUserRating.toFixed(1)} / 5`,
        accent: true
      },
      { label: 'COUNTRIES', value: new Intl.NumberFormat('en-US').format(safeStats.countriesCount) }
    ]
  }, [safeStats, statsLoading])
  const proPrice = useMemo(() => (isYearly ? '$9.6' : '$12'), [isYearly])
  const primaryButtonClass = 'inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#dc89e1] to-[#ff9eff] font-extrabold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(255,158,255,0.4)]'
  const currentHost = typeof window !== 'undefined' ? window.location.host : 'met.app'

  const triggerRouteTransition = (path: string) => {
    if (loadingRoute) return
    setLoadingRoute(path)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f1f5f9]">
      <style>{`
        @keyframes metHeroReveal {
          from { opacity: 0; transform: translateY(20px); filter: blur(10px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes metHeroAccent {
          0%, 100% { opacity: 0.92; text-shadow: 0 0 0 rgba(255,158,255,0); }
          50% { opacity: 1; text-shadow: 0 0 24px rgba(255,158,255,0.22); }
        }
        @keyframes metButtonSheen {
          0% { transform: translateX(-135%) skewX(-18deg); opacity: 0; }
          18% { opacity: 0.22; }
          55% { opacity: 0.08; }
          100% { transform: translateX(170%) skewX(-18deg); opacity: 0; }
        }
      `}</style>
      <MetLoadingOverlay
        key={loadingRoute ?? 'idle'}
        isOpen={Boolean(loadingRoute)}
        statusMessages={['Preparing your workspace...', 'Opening the next view...', 'Almost there...']}
      />
      <nav className="fixed top-0 z-[100] h-16 w-full border-b border-white/10 bg-[#0a0a0a]/85 backdrop-blur-xl">
        <div className="relative mx-auto flex h-full w-full max-w-7xl items-center justify-between px-6">
          <button
            onClick={() => setShowHowItWorks(false)}
            className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer p-0"
          >
            <MetLogo compact />
            <span className="text-xl font-extrabold tracking-tighter text-[#f1f5f9]">MET</span>
          </button>
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm font-medium text-[#64748b] md:flex">
            <Link to="/#features" className="hover:text-[#f1f5f9]">Features</Link>
            <Link to="/#pricing" className="hover:text-[#f1f5f9]">Pricing</Link>
            <Link to="/#testimonials" className="hover:text-[#f1f5f9]">Reviews</Link>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => triggerRouteTransition('/auth')}
              className="group relative overflow-hidden rounded-[10px] border border-white/15 px-[18px] py-2 text-[13px] font-semibold text-white/95 transition-all duration-200 hover:border-[#ff9eff]/35 hover:bg-white/5 hover:text-white"
            >
              <span className="absolute inset-y-0 left-[-35%] w-10 bg-[linear-gradient(90deg,transparent,rgba(255,158,255,0.28),transparent)]" style={{ animation: 'metButtonSheen 2.6s ease-in-out infinite' }} />
              <span className="relative">Sign in</span>
            </button>
            <button
              type="button"
              onClick={() => triggerRouteTransition('/register')}
              className="rounded-[10px] bg-gradient-to-r from-[#dc89e1] to-[#ff9eff] px-[18px] py-2 text-[13px] font-extrabold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(255,158,255,0.4)]"
            >
              Try for free
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {showHowItWorks ? (
          <motion.div
            key="how-it-works"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <HowItWorksView onBack={() => setShowHowItWorks(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: loadingRoute ? 0 : 1, scale: loadingRoute ? 0.985 : 1, filter: loadingRoute ? 'blur(6px)' : 'blur(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: loadingRoute ? 0.32 : 0.3 }}
          >
            <section className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-6 pb-24 pt-32">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:48px_48px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,158,255,0.08),transparent_45%)]" />
              <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center">
                <Link to="/#features" className="mb-10 inline-flex items-center gap-2 rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-4 py-1.5 text-[12px] font-bold text-[#ff9eff]">
                  <Sparkles size={12} />
                  Now with AI budget insights
                </Link>
                <h1 className="max-w-4xl overflow-visible px-[0.04em] pb-[0.3em] pt-[0.08em] text-center text-[clamp(44px,6.5vw,84px)] font-extrabold leading-[1.24] tracking-[-0.04em]">
                  <span className="block pb-[0.08em] opacity-0" style={{ animation: 'metHeroReveal 720ms cubic-bezier(0.16, 1, 0.3, 1) 80ms forwards' }}>
                    Your wealth,
                  </span>
                  <span
                    className="block pt-[0.04em] opacity-0 bg-gradient-to-r from-[#ff9eff] to-[#dc89e1] bg-clip-text text-transparent"
                    style={{ animation: 'metHeroReveal 720ms cubic-bezier(0.16, 1, 0.3, 1) 220ms forwards, metHeroAccent 3.2s ease-in-out 1.1s infinite' }}
                  >
                    clearly.
                  </span>
                </h1>
                <p className="mt-6 max-w-[540px] text-center text-[18px] leading-[1.75] text-[#64748b]">
                  Track every transaction, set smart budgets, and grow your net worth - all in one beautifully simple dashboard.
                </p>
                <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
                  <button type="button" onClick={() => triggerRouteTransition('/register')} className={`${primaryButtonClass} h-[52px] px-8 text-[15px]`}>
                    Try for free -&gt;
                  </button>
                  <button
                    onClick={() => setShowHowItWorks(true)}
                    className="inline-flex h-[52px] items-center justify-center rounded-xl border border-white/15 px-8 text-[15px] font-medium text-white hover:bg-white/5 cursor-pointer"
                  >
                    See how it works
                  </button>
                </div>
                <p className="mt-7 text-[12px] text-[#64748b]">
                  Trusted by <span className="font-semibold text-[#f1f5f9]">{trustedUsers}</span> members - No credit card required
                </p>
              </div>
            </section>

            <section className="px-6 pb-24">
              <div className="mx-auto w-full max-w-[900px] overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#0a0a0a] shadow-[0_40px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)]">
                <div className="flex h-10 items-center gap-2 border-b border-white/[0.06] bg-[#111] px-4">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex flex-1 justify-center">
                    <div className="flex h-6 w-[200px] items-center justify-center rounded-md bg-[#1a1a1a]">
                      <span className="text-[11px] text-[#64748b]">{currentHost}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-[#0a0a0a] p-5">
                  <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <DashboardMiniCard label="Balance" value={formatUsdCompact(avgBalance)} />
                    <DashboardMiniCard label="Income" value={formatUsdCompact(monthlyIncome)} valueClass="text-emerald-400" />
                    <DashboardMiniCard label="Expenses" value={formatUsdCompact(monthlyExpense)} valueClass="text-red-400" />
                    <DashboardMiniCard label="Savings" value={`${Math.round(savingsRate)}%`} valueClass="text-[#ff9eff]" />
                  </div>

                  <div className="mb-5 h-[110px] w-full overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 pb-1 pt-3">
                    <svg viewBox="0 0 400 80" className="h-full w-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff9eff" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#ff9eff" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,65 C60,50 120,35 180,42 S300,18 400,8 L400,80 L0,80 Z" fill="url(#cg)" />
                      <path d="M0,65 C60,50 120,35 180,42 S300,18 400,8" stroke="#ff9eff" strokeWidth="2" fill="none" strokeLinecap="round" />
                      <circle cx="0" cy="65" r="3" fill="#ff9eff" />
                      <circle cx="100" cy="42" r="3" fill="#ff9eff" />
                      <circle cx="200" cy="28" r="3" fill="#ff9eff" />
                      <circle cx="300" cy="15" r="3" fill="#ff9eff" />
                      <circle cx="400" cy="8" r="3.5" fill="#ff9eff" stroke="#0a0a0a" strokeWidth="1.5" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Recent Transactions</p>
                      <div className="space-y-2">
                        <TransactionRow label="Stripe Payout" value={`+${formatUsdCompact(monthlyIncome * 0.2)}`} tone="income" />
                        <TransactionRow label="Subscription Costs" value={`-${formatUsdCompact(monthlyExpense * 0.32)}`} tone="expense" />
                        <TransactionRow label="Team Tools" value={`-${formatUsdCompact(monthlyExpense * 0.08)}`} tone="expense" />
                      </div>
                    </div>
                    <div>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Budget Progress</p>
                      <div className="space-y-4">
                        <ProgressBar label="Housing" value={52} />
                        <ProgressBar label="Food" value={43} />
                        <ProgressBar label="Entertainment" value={Math.min(95, Math.max(35, Math.round(savingsRate + 28)))} warn />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="w-full border-y border-white/[0.06] bg-white/[0.015] py-10">
              <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-10 px-6 text-center md:gap-20">
                {statsBarItems.map((item) => (
                  <StatBlock key={item.label} value={item.value} label={item.label} accent={item.accent} />
                ))}
              </div>
            </section>

            <section id="features" className="mx-auto max-w-[1100px] px-6 py-24">
              <div className="mb-14 flex flex-col items-center text-center">
                <span className="rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#ff9eff]">Features</span>
                <h2 className="mt-4 text-[40px] font-extrabold tracking-tight">Everything you need to grow</h2>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <FeatureCard icon={<Activity size={18} />} title="Transaction Intelligence" text="Advanced filters, split transactions, and recurring templates for cleaner ledgers." />
                <FeatureCard icon={<SlidersHorizontal size={18} />} title="Budget Control" text="Category targets, budget health signals, and trend-aware dashboard analysis." />
                <FeatureCard icon={<TrendingUp size={18} />} title="Import and Export" text="Excel and PDF export plus Excel import with auto-categorization support." />
                <FeatureCard icon={<Shield size={18} />} title="Bank-Level Security" text="Strong credential hashing, access controls, and transport-level security by default." />
                <FeatureCard icon={<PieChart size={18} />} title="Multi-Account Tracking" text="Track cash flow across account groups with role-based account limits." />
                <FeatureCard icon={<Sparkles size={18} />} title="Admin Controls" text="User moderation, promo codes, and audit logs for platform operations." />
              </div>
            </section>

            <section id="pricing" className="mx-auto max-w-[900px] px-6 py-32 text-center">
              <span className="rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#ff9eff]">Pricing</span>
              <h2 className="mt-4 text-[40px] font-extrabold tracking-tight">Simple, transparent pricing</h2>
              <p className="mt-3 text-[16px] text-[#64748b]">Start free. Upgrade when you need more.</p>

              <div className="mt-8 flex items-center justify-center gap-4">
                <span className={`text-sm font-semibold ${!isYearly ? 'text-[#f1f5f9]' : 'text-[#64748b]'}`}>Monthly</span>
                <button
                  type="button"
                  onClick={() => setIsYearly((prev) => !prev)}
                  className="relative h-7 w-14 rounded-full border border-white/10 bg-white/10 p-1"
                >
                  <span className={`block h-5 w-5 rounded-full bg-[#ff9eff] shadow-[0_0_8px_rgba(255,158,255,0.5)] transition-transform ${isYearly ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
                <span className={`text-sm font-semibold ${isYearly ? 'text-[#f1f5f9]' : 'text-[#64748b]'}`}>Yearly</span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Save 20%</span>
              </div>

              <div className="mt-14 grid grid-cols-1 gap-6 text-left md:grid-cols-2">
                <div className="rounded-2xl border border-white/12 bg-white/5 p-8">
                  <p className="text-[15px] font-bold">Free</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-[42px] font-extrabold tracking-tight">$0</span>
                    <span className="text-sm text-[#64748b]">/ month</span>
                  </div>
                  <p className="mt-2 text-[13px] text-[#64748b]">Perfect for getting started</p>
                  <div className="mt-8 space-y-3.5 text-[13px]">
                    <PriceLine ok text="50 transactions / month" />
                    <PriceLine ok text="3 budget categories" />
                    <PriceLine ok text="Basic charts" />
                    <PriceLine ok text="Mobile app access" />
                    <PriceLine ok={false} text="AI insights" />
                    <PriceLine ok={false} text="Export to CSV" />
                  </div>
                  <button type="button" onClick={() => triggerRouteTransition('/register')} className="mt-8 block w-full rounded-xl border border-white/15 py-3 text-center text-[14px] font-bold hover:bg-white/5">
                    Try for free
                  </button>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-[#ff9eff]/30 bg-white/5 p-8 shadow-[0_0_40px_rgba(255,158,255,0.1)]">
                  <div className="absolute right-4 top-4 rounded-full bg-[#ff9eff] px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-black">
                    MOST POPULAR
                  </div>
                  <p className="text-[15px] font-bold">Pro</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-[42px] font-extrabold tracking-tight">{proPrice}</span>
                    <span className="text-sm text-[#64748b]">/ month</span>
                  </div>
                  <p className="mt-2 text-[13px] text-[#64748b]">For serious wealth builders</p>
                  <div className="mt-8 space-y-3.5 text-[13px]">
                    <PriceLine ok text="Unlimited transactions" />
                    <PriceLine ok text="Unlimited categories" />
                    <PriceLine ok text="Advanced charts + export" />
                    <PriceLine ok text="AI-powered insights" />
                    <PriceLine ok text="Investment tracking" />
                    <PriceLine ok text="Priority support" />
                  </div>
                  <button type="button" onClick={() => triggerRouteTransition('/register')} className={`${primaryButtonClass} mt-8 w-full py-3 text-[14px]`}>
                    Try for free -&gt;
                  </button>
                </div>
              </div>
            </section>

            <section id="testimonials" className="mx-auto max-w-[1100px] px-6 py-24">
              <div className="mb-14 flex flex-col items-center text-center">
                <span className="rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#ff9eff]">Reviews</span>
                <h2 className="mt-4 text-[36px] font-extrabold tracking-tight">Loved by finance nerds</h2>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Testimonial quote="MET completely changed how I think about money." name="Sarah K." role="Product Designer" />
                <Testimonial quote="The only finance app that does not feel like a chore." name="Marcus T." role="Software Engineer" />
                <Testimonial quote="Found forgotten subscriptions in the first week." name="Elena L." role="Freelancer" />
              </div>
            </section>

            <section className="px-6 py-24">
              <div
                className="relative mx-auto flex max-w-[760px] flex-col items-center overflow-hidden rounded-2xl border border-white/12 bg-white/5 p-16 text-center"
                style={{ transform: 'none' }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,158,255,0.07)_0%,transparent_65%)]" />
                <h2 className="relative z-10 text-[36px] font-extrabold leading-tight tracking-tight">Ready to take control<br />of your finances?</h2>
                <p className="relative z-10 mt-4 max-w-sm text-[15px] text-[#64748b]">Join the next generation of wealth builders today.</p>
                <div className="relative z-10 mt-10 flex flex-col items-center gap-3 sm:flex-row">
                  <button type="button" onClick={() => triggerRouteTransition('/register')} className={`${primaryButtonClass} h-[52px] px-8 text-[15px]`}>Try for free -&gt;</button>
                  <button
                    onClick={() => setShowHowItWorks(true)}
                    className="inline-flex h-[52px] items-center rounded-xl border border-white/15 px-8 text-[15px] font-medium text-white hover:bg-white/5 cursor-pointer"
                  >
                    See how it works
                  </button>
                </div>
                <p className="relative z-10 mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">Free forever - No credit card - Cancel anytime</p>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-white/[0.06] px-6 pb-10 pt-16">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              <MetLogo compact />
              <span className="text-[18px] font-extrabold tracking-tighter">MET</span>
            </div>
            <p className="max-w-[200px] text-[13px] leading-relaxed text-[#64748b]">Your wealth, clearly.<br />Built for serious savers.</p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { label: 'Features', href: '/#features' },
              { label: 'Pricing', href: '/#pricing' },
              { label: 'Reviews', href: '/#testimonials' },
              { label: 'Get Started', href: '/register' }
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { label: 'Sign In', href: '/auth' },
              { label: 'Create Account', href: '/register' },
              { label: 'Dashboard', href: '/' },
              { label: 'Support', href: 'mailto:support@met.app' }
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Security', href: '/security' },
              { label: 'Status', href: '/status' }
            ]}
          />
        </div>

        <div className="mx-auto mt-14 flex max-w-6xl flex-col justify-between gap-3 border-t border-white/[0.06] pt-7 md:flex-row">
          <p className="text-[12px] text-[#64748b]">Copyright 2026 MET Technologies. All rights reserved.</p>
          <p className="text-[12px] text-[#64748b]">Made for finance nerds.</p>
        </div>
      </footer>
    </div>
  )
}

function DashboardMiniCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
      <p className="mb-1.5 text-[9px] font-semibold uppercase text-[#64748b]">{label}</p>
      <p className={`text-[15px] font-extrabold ${valueClass || ''}`}>{value}</p>
    </div>
  )
}

function ProgressBar({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[10px]">
        <span className="text-[#64748b]">{label}</span>
        <span className={`font-bold ${warn ? 'text-red-400' : ''}`}>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: warn
              ? 'linear-gradient(90deg,#dc89e1,#ef4444)'
              : 'linear-gradient(90deg,#dc89e1,#ff9eff)'
          }}
        />
      </div>
    </div>
  )
}

function TransactionRow({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone: 'income' | 'expense'
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${tone === 'income' ? 'bg-[rgba(255,158,255,0.1)]' : 'bg-[rgba(220,137,225,0.1)]'}`}>
          <div className={`h-2 w-2 rounded-full ${tone === 'income' ? 'bg-[#ff9eff]' : 'bg-[#dc89e1]'}`} />
        </div>
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <span className={`text-[11px] font-bold ${tone === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>{value}</span>
    </div>
  )
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-white/12 bg-white/5 p-5 transition hover:border-[#ff9eff]/25">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff9eff]/12 text-[#ff9eff]">
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </article>
  )
}

function PriceLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-3 ${ok ? '' : 'text-[#64748b] line-through'}`}>
      {ok ? <Check size={16} className="text-[#ff9eff]" /> : <X size={16} className="text-[#64748b]" />}
      <span>{text}</span>
    </div>
  )
}

function Testimonial({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <article className="rounded-2xl border border-white/12 bg-white/5 p-7">
      <p className="mb-4 text-[16px] tracking-wider text-[#ff9eff]">*****</p>
      <p className="text-[13px] leading-[1.75] text-[#f1f5f9]">"{quote}"</p>
      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-[13px] font-bold">{name}</p>
        <p className="text-[11px] text-[#64748b]">{role}</p>
      </div>
    </article>
  )
}

function StatBlock({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-[28px] font-extrabold ${accent ? 'text-[#ff9eff]' : ''}`}>{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-[#64748b]">{label}</p>
    </div>
  )
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#f1f5f9]">{title}</h4>
      <div className="flex flex-col gap-2.5 text-[13px] text-[#64748b]">
        {links.map((link) => {
          const isExternal = link.href.startsWith('http') || link.href.startsWith('mailto:')
          const isHash = link.href.startsWith('#')
          if (isExternal || isHash) {
            return (
              <a key={link.label} href={link.href} className="transition-colors hover:text-[#ff9eff]">
                {link.label}
              </a>
            )
          }

          return (
            <Link key={link.label} to={link.href} className="transition-colors hover:text-[#ff9eff]">
              {link.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function formatUsdCompact(value: number) {
  const compact = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
  return compact.replace('K', 'k')
}

function formatLargeCount(value: number) {
  const compact = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0
  }).format(value)

  return compact.replace('K', 'k')
}

function HowItWorksView({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-32 pb-24 px-6">
      <div className="relative z-10 mx-auto max-w-4xl">
        <button
          onClick={onBack}
          className="mb-12 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[#64748b] transition-colors hover:border-white/20 hover:text-[#f1f5f9] cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>

        <header className="mb-20">
          <h2 className="text-[clamp(32px,5vw,56px)] font-extrabold tracking-tight mb-6">
            Everything you need,<br />
            <span className="bg-gradient-to-r from-[#ff9eff] to-[#dc89e1] bg-clip-text text-transparent">simply organized.</span>
          </h2>
          <p className="text-[#64748b] text-[18px] max-w-xl leading-relaxed">
            MET is designed for those who want to master their finances without the complexity of traditional banking apps.
          </p>
        </header>

        <div className="space-y-32">
          {/* Step 1 */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#ff9eff]/12 text-[#ff9eff] flex items-center justify-center font-extrabold text-xl mb-6 border border-[#ff9eff]/20">1</div>
              <h3 className="text-2xl font-bold mb-4 text-[#f1f5f9]">Connect your world</h3>
              <p className="text-[#64748b] leading-relaxed text-[16px]">
                Create multiple accounts to track different parts of your life. 
                Keep your business expenses, daily spending, and long-term savings 
                in separate buckets while seeing your total net worth in one place.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff9eff]/5 blur-3xl rounded-full" />
               <div className="space-y-4 relative z-10">
                 <DashboardMiniCard label="Primary Checking" value="$4,820.00" />
                 <DashboardMiniCard label="Emergency Fund" value="$12,500.00" valueClass="text-emerald-400" />
                 <DashboardMiniCard label="Crypto Wallet" value="$2,140.00" valueClass="text-[#ff9eff]" />
               </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#dc89e1]/5 blur-3xl rounded-full" />
               <div className="space-y-3 relative z-10">
                 <TransactionRow label="Apple Music" value="-$10.99" tone="expense" />
                 <TransactionRow label="Stripe Payout" value="+$850.00" tone="income" />
                 <TransactionRow label="Whole Foods" value="-$64.20" tone="expense" />
                 <TransactionRow label="Starbucks" value="-$5.50" tone="expense" />
               </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="w-12 h-12 rounded-2xl bg-[#ff9eff]/12 text-[#ff9eff] flex items-center justify-center font-extrabold text-xl mb-6 border border-[#ff9eff]/20">2</div>
              <h3 className="text-2xl font-bold mb-4 text-[#f1f5f9]">Log with confidence</h3>
              <p className="text-[#64748b] leading-relaxed text-[16px]">
                Transactions are the heart of MET. Quickly add expenses, assign them 
                to categories, and even split a single receipt across multiple 
                budgets. Our system learns your patterns to make tracking effortless.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#ff9eff]/12 text-[#ff9eff] flex items-center justify-center font-extrabold text-xl mb-6 border border-[#ff9eff]/20">3</div>
              <h3 className="text-2xl font-bold mb-4 text-[#f1f5f9]">Visualize your growth</h3>
              <p className="text-[#64748b] leading-relaxed text-[16px]">
                Stop guessing where your money goes. Our interactive charts 
                give you a clear view of your spending habits and income trends. 
                Watch your savings rate grow as you make better financial decisions.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl flex flex-col justify-center min-h-[220px]">
                <div className="flex items-end gap-2 h-32 w-full">
                  {[40, 65, 45, 90, 75, 55, 85].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="flex-1 bg-gradient-to-t from-[#ff9eff]/10 to-[#ff9eff]/40 rounded-t-sm"
                    />
                  ))}
                </div>
                <div className="mt-4 flex justify-between text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                  <span>Sun</span>
                </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
               <div className="space-y-6">
                 <ProgressBar label="Housing & Rent" value={45} />
                 <ProgressBar label="Entertainment" value={82} warn />
                 <ProgressBar label="Groceries" value={60} />
               </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="w-12 h-12 rounded-2xl bg-[#ff9eff]/12 text-[#ff9eff] flex items-center justify-center font-extrabold text-xl mb-6 border border-[#ff9eff]/20">4</div>
              <h3 className="text-2xl font-bold mb-4 text-[#f1f5f9]">Stay on track</h3>
              <p className="text-[#64748b] leading-relaxed text-[16px]">
                Set smart budgets for what matters most. MET keeps a watchful 
                eye on your spending and nudges you when you're getting close 
                to your limits, helping you save more without the stress.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-40 text-center relative overflow-hidden rounded-3xl border border-[#ff9eff]/20 bg-white/[0.02] p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,158,255,0.08),transparent_70%)]" />
          <h3 className="text-3xl font-extrabold mb-6 relative z-10">Ready to start?</h3>
          <p className="text-[#64748b] mb-10 max-w-md mx-auto relative z-10 leading-relaxed">
            Take the first step towards financial freedom today. It only takes 2 minutes to set up.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Link to="/register" className="inline-flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#dc89e1] to-[#ff9eff] px-10 font-extrabold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(255,158,255,0.4)]">
              Create free account
            </Link>
            <button
              onClick={onBack}
              className="inline-flex h-[56px] items-center justify-center rounded-2xl border border-white/15 px-10 font-bold text-white transition-all hover:bg-white/5 cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
