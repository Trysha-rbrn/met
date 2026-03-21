import { Check, Crown, Sparkles, X } from 'lucide-react'

type PremiumComparisonModalProps = {
  isOpen: boolean
  title: string
  subtitle: string
  ctaLabel: string
  onClose: () => void
  onConfirm: () => void
}

const PREMIUM_FEATURES = [
  'Up to 10 accounts (BASIC: 3)',
  'Advanced transaction filters (search + type)',
  'Recurring transactions panel',
  'Smart dashboard insights',
  'Anonymous benchmarking with opt-out',
  'Extended 90D analytics range'
]

const BASIC_FEATURES = [
  'Up to 3 accounts',
  'Core transaction tracking',
  'Standard dashboard ranges',
  'No premium benchmark/insight modules'
]

function PremiumComparisonModal({
  isOpen,
  title,
  subtitle,
  ctaLabel,
  onClose,
  onConfirm
}: PremiumComparisonModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/15 bg-slate-950 text-slate-100 shadow-2xl shadow-black/40">
        <div className="relative border-b border-white/10 px-6 py-6 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,158,255,0.25),transparent_45%),radial-gradient(circle_at_top_left,rgba(165,105,176,0.2),transparent_40%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#ff9eff]/35 bg-[#ff9eff]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff9eff]">
                <Sparkles size={13} />
                Premium Plan
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">{title}</h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{subtitle}</p>
            </div>
            <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-[#ff9eff]/35 bg-[#ff9eff]/10 text-[#ff9eff] md:flex">
              <Crown size={22} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 md:p-8">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Basic</p>
            <ul className="mt-4 space-y-2.5">
              {BASIC_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                  <X size={14} className="mt-0.5 text-rose-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#ff9eff]/40 bg-[linear-gradient(145deg,rgba(255,158,255,0.2),rgba(165,105,176,0.16),rgba(15,23,42,0.85))] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff9eff]">Premium</p>
            <ul className="mt-4 space-y-2.5">
              {PREMIUM_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-100">
                  <Check size={14} className="mt-0.5 text-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-end md:px-8">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Maybe Later
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-[#ff9eff] px-4 py-2 text-sm font-black text-[#1c0d32] transition hover:opacity-95"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PremiumComparisonModal
