import { ArrowRight, Check, Shield, Sparkles, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import MetLogo from '../components/MetLogo'

function HomePage() {
  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <MetLogo compact />
          <div className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
            <a href="#features" className="hover:text-slate-100">Features</a>
            <a href="#pricing" className="hover:text-slate-100">Pricing</a>
            <a href="#testimonials" className="hover:text-slate-100">Reviews</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5">
              Sign in
            </Link>
            <Link to="/register" className="rounded-xl bg-gradient-to-r from-[#dc89e1] to-[#ff9eff] px-4 py-2 text-sm font-bold text-black hover:opacity-95">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pb-24 pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,158,255,0.08),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50" />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center">
          <a href="#features" className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-4 py-2 text-xs font-bold text-[#ff9eff]">
            <Sparkles size={12} />
            Now with AI budget insights
          </a>
          <h1 className="max-w-4xl text-center text-[clamp(44px,6.5vw,84px)] font-extrabold leading-[1.05] tracking-[-0.04em]">
            Your finances, finally <span className="bg-gradient-to-r from-[#ff9eff] to-[#dc89e1] bg-clip-text text-transparent">clear.</span>
          </h1>
          <p className="mt-6 max-w-[540px] text-center text-lg leading-[1.75] text-slate-400">
            Track every transaction, set smart budgets, and grow your net worth in one simple dashboard.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link to="/register" className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#dc89e1] to-[#ff9eff] px-8 text-[15px] font-extrabold text-black">
              Get started free
              <ArrowRight size={16} className="ml-2" />
            </Link>
            <a href="#features" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 px-8 text-[15px] font-medium text-slate-100 hover:bg-white/5">
              See how it works
            </a>
          </div>
          <p className="mt-7 text-[12px] text-slate-500">Trusted by <span className="font-semibold text-slate-100">1,284</span> members</p>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1100px] px-6 py-24">
        <div className="mb-10 text-center">
          <span className="rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#ff9eff]">Features</span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight">Everything you need to manage money</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FeatureCard icon={TrendingUp} title="Net Worth Tracking" text="See your balance evolution and trends with clean visual analytics." />
          <FeatureCard icon={Shield} title="Secure by Default" text="Protected sessions, account-level controls and resilient auth flow." />
          <FeatureCard icon={Check} title="Smart Budgets" text="Category-level budgets with alerts and progress monitoring." />
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[900px] px-6 py-24 text-center">
        <span className="rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#ff9eff]">Pricing</span>
        <h2 className="mt-4 text-4xl font-extrabold tracking-tight">Simple, transparent pricing</h2>
        <p className="mt-3 text-slate-400">Start free and upgrade when you need premium analytics and automation.</p>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/12 bg-white/5 p-6 text-left">
            <p className="text-sm font-bold text-slate-300">Basic</p>
            <p className="mt-2 text-3xl font-extrabold">Free</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              <li>Up to 3 accounts</li>
              <li>Core dashboard and transactions</li>
              <li>Budget categories</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[#ff9eff]/35 bg-[#ff9eff]/10 p-6 text-left">
            <p className="text-sm font-bold text-[#ffc8ff]">Premium</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-100">$9/mo</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Advanced filters and recurring engine</li>
              <li>Insights and benchmark tools</li>
              <li>Higher account limits</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="testimonials" className="mx-auto max-w-[1100px] px-6 py-24">
        <div className="mb-8 text-center">
          <span className="rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#ff9eff]">Reviews</span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight">Used daily by people who care about clarity</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Testimonial name="Alex R." quote="Best balance between clean design and practical finance tracking." />
          <Testimonial name="Sara K." quote="I finally have categories and budgets that make sense every month." />
          <Testimonial name="Emil L." quote="The dashboard is exactly what I need to make faster money decisions." />
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, text }: { icon: typeof TrendingUp; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-white/12 bg-white/5 p-5 transition hover:border-[#ff9eff]/25">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff9eff]/12 text-[#ff9eff]">
        <Icon size={18} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </article>
  )
}

function Testimonial({ name, quote }: { name: string; quote: string }) {
  return (
    <article className="rounded-2xl border border-white/12 bg-white/5 p-5">
      <p className="text-sm text-slate-300">"{quote}"</p>
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">{name}</p>
    </article>
  )
}

export default HomePage
