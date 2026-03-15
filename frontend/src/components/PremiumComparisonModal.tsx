import { Check, X } from 'lucide-react'

type PremiumComparisonModalProps = {
  isOpen: boolean
  title: string
  subtitle: string
  ctaLabel: string
  onClose: () => void
  onConfirm: () => void
}

const PREMIUM_FEATURES = [
  'Do 10 naloga (BASIC: 3)',
  'Napredni filteri transakcija (search + type)',
  'Recurring transactions panel',
  'Dashboard insights i preporuke',
  'Benchmarking (anonimizovano, uz opt-out)',
  'Period analiza: 90D'
]

const BASIC_FEATURES = [
  'Do 3 naloga',
  'Osnovni pregled transakcija',
  'Standard dashboard periodi',
  'Bez premium benchmark/insights modula'
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-3xl rounded-2xl border bg-card shadow-xl">
        <div className="border-b px-5 py-4">
          <h3 className="text-xl font-black tracking-tight">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">BASIC</p>
            <ul className="mt-3 space-y-2">
              {BASIC_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <X size={14} className="mt-0.5 text-rose-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">PREMIUM</p>
            <ul className="mt-3 space-y-2">
              {PREMIUM_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check size={14} className="mt-0.5 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Kasnije
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-95"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PremiumComparisonModal
