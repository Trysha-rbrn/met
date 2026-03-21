import { useEffect, useMemo, useState } from 'react'
import { Check, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import MetLogo from '../components/MetLogo'
import { getPublicStats } from '../api/publicApi'

function HomePage() {
  const [isYearly, setIsYearly] = useState(false)
  const [totalUsers, setTotalUsers] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const stats = await getPublicStats()
        setTotalUsers(stats.totalUsers)
      } catch {
        setTotalUsers(null)
      }
    }
    void load()
  }, [])

  const proPrice = useMemo(() => (isYearly ? '$9.6' : '$12'), [isYearly])
  const trustedUsers = useMemo(() => {
    if (typeof totalUsers === 'number' && Number.isFinite(totalUsers) && totalUsers >= 0) {
      return new Intl.NumberFormat('en-US').format(totalUsers)
    }
    return '1,284'
  }, [totalUsers])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f1f5f9]">
      <nav className="fixed top-0 z-[100] h-16 w-full border-b border-white/10 bg-[#0a0a0a]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <MetLogo compact />
            <span className="text-xl font-extrabold tracking-tighter text-[#f1f5f9]">MET</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-[#64748b] md:flex">
            <a href="#features" className="hover:text-[#f1f5f9]">Features</a>
            <a href="#pricing" className="hover:text-[#f1f5f9]">Pricing</a>
            <a href="#testimonials" className="hover:text-[#f1f5f9]">Reviews</a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/auth" className="rounded-[10px] border border-white/15 px-[18px] py-2 text-[13px] font-semibold hover:border-white/20 hover:bg-white/5">
              Sign in
            </Link>
            <Link to="/register" className="rounded-[10px] bg-gradient-to-r from-[#dc89e1] to-[#ff9eff] px-[18px] py-2 text-[13px] font-extrabold text-black">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,158,255,0.08),transparent_45%)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center">
          <a href="#features" className="mb-10 inline-flex items-center gap-2 rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-4 py-1.5 text-[12px] font-bold text-[#ff9eff]">
            <Sparkles size={12} />
            Now with AI budget insights
          </a>
          <h1 className="max-w-4xl text-center text-[clamp(44px,6.5vw,84px)] font-extrabold leading-[1.05] tracking-[-0.04em]">
            Your finances,<br />finally <span className="bg-gradient-to-r from-[#ff9eff] to-[#dc89e1] bg-clip-text text-transparent">clear.</span>
          </h1>
          <p className="mt-6 max-w-[540px] text-center text-[18px] leading-[1.75] text-[#64748b]">
            Track every transaction, set smart budgets, and grow your net worth - all in one beautifully simple dashboard.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link to="/register" className="inline-flex h-[52px] items-center justify-center rounded-xl bg-gradient-to-r from-[#dc89e1] to-[#ff9eff] px-8 text-[15px] font-extrabold text-black">
              Get started free →
            </Link>
            <a href="#features" className="inline-flex h-[52px] items-center justify-center rounded-xl border border-white/15 px-8 text-[15px] font-medium text-white hover:bg-white/5">
              See how it works
            </a>
          </div>
          <p className="mt-7 text-[12px] text-[#64748b]">
            Trusted by <span className="font-semibold text-[#f1f5f9]">{trustedUsers}</span> members · No credit card required
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto w-full max-w-[980px] overflow-hidden rounded-[16px] border border-white/10 bg-black shadow-[0_40px_80px_rgba(0,0,0,0.65)]">
          <iframe title="MET motion preview" src="/gif.html" className="h-[450px] w-full border-0" loading="lazy" />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1100px] px-6 py-24">
        <div className="mb-14 flex flex-col items-center text-center">
          <span className="rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#ff9eff]">Features</span>
          <h2 className="mt-4 text-[40px] font-extrabold tracking-tight">Everything you need to grow</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <FeatureCard title="Transaction Intelligence" text="Advanced filters, split transactions, and recurring templates for cleaner ledgers." />
          <FeatureCard title="Budget Control" text="Category targets, budget health signals, and trend-aware dashboard analysis." />
          <FeatureCard title="Import & Export" text="Excel/PDF export plus Excel import with auto-categorization support." />
          <FeatureCard title="Premium Insights" text="AI-style recommendations, benchmark context, and plan-aware analytics." />
          <FeatureCard title="Multi-Account Tracking" text="Track cash flow across account groups with role-based account limits." />
          <FeatureCard title="Admin Controls" text="User moderation, promo codes, and audit logs for platform operations." />
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
            <Link to="/register" className="mt-8 block rounded-xl border border-white/15 py-3 text-center text-[14px] font-bold hover:bg-white/5">
              Get started free
            </Link>
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
            <Link to="/register" className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#dc89e1] to-[#ff9eff] py-3 text-[14px] font-extrabold text-black">
              Start Pro trial →
            </Link>
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
            <Link to="/register" className="inline-flex h-[52px] items-center justify-center rounded-xl bg-gradient-to-r from-[#dc89e1] to-[#ff9eff] px-8 text-[15px] font-extrabold text-black">Get started free →</Link>
            <a href="#features" className="inline-flex h-[52px] items-center rounded-xl border border-white/15 px-8 text-[15px] font-medium text-white hover:bg-white/5">
              See how it works
            </a>
          </div>
          <p className="relative z-10 mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">Free forever · No credit card · Cancel anytime</p>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-white/12 bg-white/5 p-5 transition hover:border-[#ff9eff]/25">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff9eff]/12 text-[#ff9eff]">
        <Check size={18} />
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
      <p className="mb-4 text-[16px] tracking-wider text-[#ff9eff]">★★★★★</p>
      <p className="text-[13px] leading-[1.75] text-[#f1f5f9]">"{quote}"</p>
      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-[13px] font-bold">{name}</p>
        <p className="text-[11px] text-[#64748b]">{role}</p>
      </div>
    </article>
  )
}

export default HomePage
