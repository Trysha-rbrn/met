import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import axios from 'axios'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import * as api from '../api/authApi'
import type { AuthUser } from '../api/authApi'
import MetLogo from '../components/MetLogo'
import { getPublicStats, type PublicStats } from '../api/publicApi'

interface AuthPageProps {
  onLogin: (user: AuthUser, token: string) => void
  initialMode?: 'login' | 'register'
}

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

function AuthPage({ onLogin, initialMode = 'login' }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    setIsLogin(initialMode === 'login')
    setError('')
  }, [initialMode])

  useEffect(() => {
    const load = async () => {
      try {
        const nextStats = await getPublicStats()
        setStats(nextStats)
      } catch {
        setStats(null)
      }
    }
    void load()
  }, [])

  const safeStats = stats || fallbackStats
  const trustedUsers = useMemo(() => new Intl.NumberFormat('en-US').format(safeStats.totalUsers), [safeStats.totalUsers])
  const avgBalanceLabel = useMemo(() => `${formatUsdCompact(safeStats.avgBalanceUsd ?? fallbackStats.avgBalanceUsd)} avg balance`, [safeStats.avgBalanceUsd])
  const savingsRateLabel = useMemo(() => `${Math.round(safeStats.savingsRate ?? fallbackStats.savingsRate)}% savings rate`, [safeStats.savingsRate])
  const txRateLabel = useMemo(() => `${Math.round(safeStats.avgMonthlyTransactions ?? fallbackStats.avgMonthlyTransactions)} tx per month`, [safeStats.avgMonthlyTransactions])
  const currentHost = typeof window !== 'undefined' ? window.location.host : 'met.app'

  const passwordStrength = useMemo(() => {
    if (password.length < 6) return 1
    if (password.length < 10) return 2
    return 3
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')

    if (!isLogin && password !== confirmPassword) {
      setError('Password and confirm password must match.')
      return
    }

    setLoading(true)
    try {
      const data = isLogin
        ? await api.login({ email, password })
        : await api.register({ email, password, name })
      onLogin(data.user, data.token)
    } catch (err: unknown) {
      if (axios.isAxiosError<{ error?: string }>(err)) {
        if (!err.response) {
          setError('Cannot reach server. Check backend, CORS and network.')
        } else {
          setError(err.response.data?.error || 'An unexpected error occurred.')
        }
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="relative hidden w-[45%] flex-shrink-0 flex-col justify-between overflow-hidden bg-[linear-gradient(150deg,#0f0618_0%,#1c0d32_50%,#2e1255_100%)] p-12 md:flex">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
        <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,158,255,0.08)_0%,transparent_70%)]" />
        <div className="absolute -bottom-[60px] -left-[60px] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(106,77,139,0.15)_0%,transparent_70%)]" />

        <div className="relative z-10 flex items-center gap-3">
          <MetLogo compact />
          <span className="text-xl font-extrabold tracking-tighter text-[#f1f5f9]">MET</span>
        </div>

        <div className="relative z-10 max-w-sm">
          <h1 className="mb-4 text-[36px] font-[800] leading-[1.2] tracking-[-0.03em]">Your finances, clearly tracked.</h1>
          <p className="mb-8 text-[14px] text-slate-400">Join {trustedUsers} people who manage their wealth smarter.</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-200">{avgBalanceLabel}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-200">{savingsRateLabel}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-200">{txRateLabel}</span>
          </div>
        </div>

        <p className="relative z-10 text-[11px] font-mono text-slate-500">{currentHost}</p>
      </aside>

      <main className="flex w-full flex-col items-center justify-center bg-[#0a0a0a] px-6 py-10 md:w-[55%]">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-5 rounded-[14px] border border-[#ff9eff]/25 bg-[linear-gradient(150deg,#1c0d32_0%,#2e1850_50%,#5c2878_100%)] p-3 shadow-[0_0_24px_rgba(255,158,255,0.18)]">
              <MetLogo compact />
            </div>
            <h2 className="text-[26px] font-[800] tracking-tight">{isLogin ? 'Welcome back' : 'Create account'}</h2>
            <p className="mt-1.5 text-[13px] text-slate-400">{isLogin ? 'Sign in to your account' : 'Create your MET account'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin ? (
              <Field label="Full name">
                <IconInput id="auth-name" name="name" type="text" autoComplete="name" placeholder="Enter your name" value={name} onChange={setName} icon={User} required />
              </Field>
            ) : null}

            <Field label="Email address">
              <IconInput id="auth-email" name="email" type="email" autoComplete="email" placeholder="name@company.com" value={email} onChange={setEmail} icon={Mail} required />
            </Field>

            <Field label="Password">
              <IconInput
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder="********"
                value={password}
                onChange={setPassword}
                icon={Lock}
                required
                trailingButton={
                  <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="text-slate-400 hover:text-slate-100">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </Field>

            {!isLogin ? (
              <>
                <div className="flex gap-1.5">
                  <div className={`h-1 flex-1 rounded ${passwordStrength >= 1 ? 'bg-rose-500' : 'bg-white/10'}`} />
                  <div className={`h-1 flex-1 rounded ${passwordStrength >= 2 ? 'bg-amber-400' : 'bg-white/10'}`} />
                  <div className={`h-1 flex-1 rounded ${passwordStrength >= 3 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                </div>
                <Field label="Confirm password">
                  <IconInput
                    id="auth-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="********"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    icon={Lock}
                    required
                    trailingButton={
                      <button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="text-slate-400 hover:text-slate-100">
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </Field>
              </>
            ) : null}

            {error ? <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-center text-sm font-semibold text-rose-300">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#dc89e1] to-[#ff9eff] text-sm font-extrabold text-black transition hover:opacity-95 disabled:opacity-70"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign in ->' : 'Create account ->'}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-slate-400">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button onClick={() => { setIsLogin((prev) => !prev); setError('') }} className="ml-1 font-bold text-[#ff9eff] hover:underline">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <p className="mt-8 text-center text-xs text-slate-500">
            Need the public site? <Link to="/" className="text-[#ff9eff] hover:underline">Go to homepage</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 ml-0.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function IconInput({
  id,
  name,
  type,
  autoComplete,
  placeholder,
  value,
  onChange,
  icon: Icon,
  trailingButton,
  required = false
}: {
  id: string
  name: string
  type: React.HTMLInputTypeAttribute
  autoComplete?: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  icon: React.ComponentType<{ size?: number; className?: string }>
  trailingButton?: ReactNode
  required?: boolean
}) {
  return (
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`h-12 w-full rounded-xl border border-white/12 bg-white/5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#ff9eff]/50 focus:ring-4 focus:ring-[#ff9eff]/10 ${trailingButton ? 'pl-11 pr-11' : 'px-4 pl-11'}`}
      />
      {trailingButton ? <div className="absolute right-4 top-1/2 -translate-y-1/2">{trailingButton}</div> : null}
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

export default AuthPage
