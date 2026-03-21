import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, ArrowRight, Coins, DatabaseZap, Gem, KeyRound, LineChart, Palette, ShieldCheck, Sparkles, Trash2, User, WalletCards } from 'lucide-react'
import * as api from '../api/authApi'
import * as dataTransferApi from '../api/dataTransferApi'
import type { AuthUser, SubscriptionSummary } from '../api/authApi'
import type { TransferLog } from '../api/dataTransferApi'
import { extractApiError, notify } from '../lib/toast'
import { CURRENCIES, type CurrencyCode } from '../lib/currencies'
import PremiumComparisonModal from '../components/PremiumComparisonModal'

type ThemeMode = 'light' | 'dark' | 'system'

interface SettingsPageProps {
  user: AuthUser | null
  onUserUpdate: (user: AuthUser) => void
  themeMode: ThemeMode
  onThemeModeChange: (mode: ThemeMode) => void
}

function SettingsPage({ user, onUserUpdate, themeMode, onThemeModeChange }: SettingsPageProps) {
  const [name, setName] = useState(user?.name || '')
  const [currency, setCurrency] = useState<CurrencyCode>(user?.preferredCurrency || 'USD')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [resetDataPassword, setResetDataPassword] = useState('')
  const [premiumCode, setPremiumCode] = useState('')
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [benchmarkOptOut, setBenchmarkOptOut] = useState(Boolean(user?.benchmarkOptOut))
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([])
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false)
  const [isSubmittingSubscription, setIsSubmittingSubscription] = useState(false)
  const [showPremiumComparisonModal, setShowPremiumComparisonModal] = useState(false)
  const didHydrateRef = useRef(false)
  const lastSavedRef = useRef({
    name: user?.name || '',
    currency: (user?.preferredCurrency || 'USD') as CurrencyCode,
    theme: themeMode as ThemeMode
  })
  const lastPasswordAttemptRef = useRef('')

  useEffect(() => {
    setName(user?.name || '')
    lastSavedRef.current.name = user?.name || ''
    const nextCurrency = (user?.preferredCurrency || 'USD') as CurrencyCode
    setCurrency(nextCurrency)
    lastSavedRef.current.currency = nextCurrency
  }, [user])

  useEffect(() => {
    setBenchmarkOptOut(Boolean(user?.benchmarkOptOut))
  }, [user?.benchmarkOptOut])

  useEffect(() => {
    const loadTransferLogs = async () => {
      try {
        const logs = await dataTransferApi.getTransferLogs()
        setTransferLogs(logs)
      } catch {
        // no-op
      }
    }
    void loadTransferLogs()
  }, [])

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      return
    }

    const loadSubscription = async () => {
      setIsLoadingSubscription(true)
      try {
        const response = await api.getSubscription()
        setSubscription(response.subscription)
        if (response.subscription.billingInterval) {
          setBillingInterval(response.subscription.billingInterval)
        }
      } catch {
        // no-op
      } finally {
        setIsLoadingSubscription(false)
      }
    }

    void loadSubscription()
  }, [user])

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true
      return
    }

    const nextName = name.trim()
    const hasProfileChanges =
      nextName !== (lastSavedRef.current.name || '') ||
      currency !== lastSavedRef.current.currency ||
      themeMode !== lastSavedRef.current.theme

    if (!hasProfileChanges) return

    const timer = window.setTimeout(async () => {
      setIsSavingProfile(true)
      try {
        const updatedUser = await api.updateProfile({
          name: nextName || undefined,
          preferredCurrency: currency
        })
        onUserUpdate(updatedUser)
        localStorage.setItem('met_currency', currency)
        lastSavedRef.current = { name: updatedUser.name || '', currency, theme: themeMode }
        notify.success('Settings saved.')
      } catch (error: unknown) {
        notify.error(extractApiError(error, 'Failed to save settings.'))
      } finally {
        setIsSavingProfile(false)
      }
    }, 700)

    return () => window.clearTimeout(timer)
  }, [name, currency, themeMode, onUserUpdate])

  useEffect(() => {
    if (!currentPassword && !newPassword) return
    if (!currentPassword || !newPassword) return

    const passwordKey = `${currentPassword}|${newPassword}`
    if (passwordKey === lastPasswordAttemptRef.current) return

    const timer = window.setTimeout(async () => {
      setIsSavingPassword(true)
      lastPasswordAttemptRef.current = passwordKey
      try {
        await api.updateProfile({ currentPassword, newPassword })
        notify.success('Password updated.')
        setCurrentPassword('')
        setNewPassword('')
        lastPasswordAttemptRef.current = ''
      } catch (error: unknown) {
        notify.error(extractApiError(error, 'Failed to update password.'))
      } finally {
        setIsSavingPassword(false)
      }
    }, 900)

    return () => window.clearTimeout(timer)
  }, [currentPassword, newPassword])

  const handleThemeModeChange = (mode: ThemeMode) => {
    onThemeModeChange(mode)
  }

  const handleBenchmarkPreferenceChange = async (nextOptOut: boolean) => {
    setBenchmarkOptOut(nextOptOut)
    try {
      const updated = await api.updateBenchmarkPreference(nextOptOut)
      onUserUpdate(updated)
      notify.success(nextOptOut ? 'Benchmarking disabled for this account.' : 'Benchmarking enabled for this account.')
    } catch (error: unknown) {
      setBenchmarkOptOut(Boolean(user?.benchmarkOptOut))
      notify.error(extractApiError(error, 'Failed to update benchmark preference.'))
    }
  }

  const handleResetData = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetDataPassword) {
      notify.warning('Please enter your password to clear data.')
      return
    }
    if (!window.confirm('This will delete transactions, categories and extra accounts. Only Primary account will remain. Continue?')) return
    try {
      await api.resetUserData(resetDataPassword)
      setResetDataPassword('')
      localStorage.removeItem('met_account_id')
      notify.success('Financial data cleared. Primary account preserved.')
      const logs = await dataTransferApi.getTransferLogs()
      setTransferLogs(logs)
      window.location.reload()
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to clear data.'))
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deletePassword) {
      notify.warning('Please enter your password to delete account.')
      return
    }
    if (!window.confirm('This will permanently delete your account and all financial data. Continue?')) return
    try {
      await api.deleteAccount(deletePassword)
      notify.success('Account deleted successfully.')
      localStorage.removeItem('met_token')
      window.location.href = '/'
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to delete account.'))
    }
  }

  const activatePremiumFlow = async () => {
    try {
      setIsSubmittingSubscription(true)
      const response = await api.upgradeSubscription(billingInterval, premiumCode.trim() || undefined)
      onUserUpdate(response.user)
      setSubscription(response.subscription)
      notify.success(response.message || 'Subscription updated.')
      setPremiumCode('')
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to update subscription.'))
    } finally {
      setIsSubmittingSubscription(false)
    }
  }

  const handleActivatePremium = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowPremiumComparisonModal(true)
  }

  const handleDowngradeSubscription = async (immediate: boolean) => {
    try {
      setIsSubmittingSubscription(true)
      const response = await api.downgradeSubscription(immediate)
      onUserUpdate(response.user)
      setSubscription(response.subscription)
      notify.success(response.message || 'Subscription updated.')
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to change subscription.'))
    } finally {
      setIsSubmittingSubscription(false)
    }
  }

  const handleResumeSubscription = async () => {
    try {
      setIsSubmittingSubscription(true)
      const response = await api.resumeSubscription()
      onUserUpdate(response.user)
      setSubscription(response.subscription)
      notify.success(response.message || 'Subscription resumed.')
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to resume subscription.'))
    } finally {
      setIsSubmittingSubscription(false)
    }
  }

  const isPremiumUser = user?.role === 'PREMIUM' || user?.role === 'ADMIN'
  const periodEndLabel = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null

  const saveStateLabel = isSavingProfile
    ? 'Saving profile changes...'
    : isSavingPassword
      ? 'Updating password...'
      : 'Auto-save enabled. Profile changes are applied automatically.'

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(120deg,rgba(12,74,110,0.9),rgba(30,64,175,0.85),rgba(15,23,42,0.95))] px-6 py-6 text-white shadow-xl sm:px-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Settings Workspace</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Account and Product Settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200 sm:text-base">
              Everything is grouped by purpose so users can update profile, security, subscription, and data controls without friction.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MembershipChip icon={LineChart} label="Insights" value={isPremiumUser ? 'Enabled' : 'Basic'} />
            <MembershipChip icon={Sparkles} label="90D Analytics" value={isPremiumUser ? 'Enabled' : 'Locked'} />
            <MembershipChip icon={WalletCards} label="Accounts" value={isPremiumUser ? (user?.role === 'ADMIN' ? '20' : '10') : '3'} />
            <MembershipChip icon={ShieldCheck} label="Plan" value={user?.role || 'BASIC'} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px,minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <div className="met-card met-card-hover rounded-2xl p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Quick Navigation</p>
            <nav className="mt-3 space-y-1.5">
              <SettingsNavLink href="#profile" label="Profile & Preferences" icon={User} />
              <SettingsNavLink href="#security" label="Security & Privacy" icon={KeyRound} />
              <SettingsNavLink href="#subscription" label="Subscription" icon={Gem} />
              <SettingsNavLink href="#data" label="Data Activity" icon={DatabaseZap} />
              <SettingsNavLink href="#danger" label="Danger Zone" icon={Trash2} danger />
            </nav>
          </div>

          <div className="met-card met-card-hover rounded-2xl p-4">
            <p className="text-sm font-bold text-foreground">Save Status</p>
            <p className="mt-2 text-xs text-muted-foreground">{saveStateLabel}</p>
          </div>
        </aside>

        <main className="space-y-6">
          <section id="profile" className="met-card met-card-hover rounded-2xl p-6 md:p-8">
            <SectionHeader icon={User} title="Profile & Preferences" subtitle="Core identity, default currency, and appearance settings." />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Display name" htmlFor="settings-display-name">
                <input id="settings-display-name" type="text" autoComplete="name" placeholder={user?.name || 'Enter your display name'} value={name} onChange={(e) => setName(e.target.value)} className="h-12 w-full rounded-xl border bg-background px-4 outline-none transition focus:ring-4 focus:ring-primary/15" />
              </Field>
              <Field label="Email" htmlFor="settings-email">
                <input id="settings-email" type="email" value={user?.email || ''} readOnly className="h-12 w-full rounded-xl border bg-muted/50 px-4 text-muted-foreground outline-none" />
              </Field>
              <Field label="Preferred currency" htmlFor="settings-currency">
                <div className="relative">
                  <Coins size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select id="settings-currency" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="h-12 w-full rounded-xl border bg-background pl-9 pr-4 outline-none transition focus:ring-4 focus:ring-primary/15">
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{`${c.symbol} - ${c.name} (${c.code})`}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="Theme mode" htmlFor="settings-theme">
                <div className="relative">
                  <Palette size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select id="settings-theme" value={themeMode} onChange={(e) => handleThemeModeChange(e.target.value as ThemeMode)} className="h-12 w-full rounded-xl border bg-background pl-9 pr-4 outline-none transition focus:ring-4 focus:ring-primary/15">
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </Field>
            </div>
          </section>

          <section id="security" className="met-card met-card-hover rounded-2xl p-6 md:p-8">
            <SectionHeader icon={KeyRound} title="Security & Privacy" subtitle="Password rotation and benchmarking privacy controls." />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm font-bold text-foreground">Password Update</p>
                <p className="mt-1 text-xs text-muted-foreground">Enter current + new password. Save runs automatically after brief pause.</p>
                <form className="mt-4 space-y-3" onSubmit={(e) => e.preventDefault()}>
                  <input type="text" name="username" autoComplete="username" value={user?.email || ''} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
                  <input id="settings-current-password" name="currentPassword" type="password" autoComplete="current-password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-12 w-full rounded-xl border bg-card px-4 outline-none transition focus:ring-4 focus:ring-primary/15" />
                  <input id="settings-password" name="newPassword" type="password" autoComplete="new-password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12 w-full rounded-xl border bg-card px-4 outline-none transition focus:ring-4 focus:ring-primary/15" />
                </form>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm font-bold text-foreground">Benchmark Privacy</p>
                <p className="mt-1 text-xs text-muted-foreground">Anonymous benchmarking compares your trends against similar users only if enabled.</p>
                <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
                  <span className="text-sm font-semibold">Opt out from anonymized benchmarking</span>
                  <input type="checkbox" checked={benchmarkOptOut} onChange={(e) => void handleBenchmarkPreferenceChange(e.target.checked)} className="h-4 w-4" />
                </label>
              </div>
            </div>
          </section>

          <section id="subscription" className="met-card met-card-hover rounded-2xl p-6 md:p-8">
            <SectionHeader icon={Gem} title="Subscription" subtitle="Modernized premium presentation with clear status and lifecycle controls." />
            {isLoadingSubscription ? (
              <p className="mt-6 text-sm text-muted-foreground">Loading subscription...</p>
            ) : user?.role === 'ADMIN' ? (
              <p className="mt-6 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300">Admin accounts already include premium capabilities. Billing lifecycle controls are intentionally disabled.</p>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-border bg-background p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warm">Plan: {subscription?.plan || user?.role || 'BASIC'}</Badge>
                    <Badge tone="neutral">Status: {subscription?.status || 'ACTIVE'}</Badge>
                    {subscription?.billingInterval && <Badge tone="neutral">{subscription.billingInterval}</Badge>}
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <SubscriptionMetric label="Plan posture" value={isPremiumUser ? 'Premium unlocked' : 'Basic active'} description={isPremiumUser ? 'Premium capabilities are enabled across the product.' : 'Upgrade for richer insights and automation.'} />
                    <SubscriptionMetric label="Billing cadence" value={subscription?.billingInterval || 'N/A'} description={subscription?.billingInterval ? 'Recurring billing interval currently in use.' : 'No recurring billing configured.'} />
                    <SubscriptionMetric label="Current period" value={periodEndLabel || 'Not started'} description={periodEndLabel ? 'Active period end date.' : 'Will appear after activation.'} />
                  </div>
                </div>
                {!isPremiumUser ? (
                  <form onSubmit={handleActivatePremium} className="rounded-2xl border border-border bg-background p-5">
                    <div className="mb-4">
                      <p className="text-lg font-black tracking-tight text-slate-100">Upgrade Path</p>
                      <p className="text-sm text-slate-300">Choose cadence and optionally apply a promo code.</p>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr),minmax(0,1.2fr),auto]">
                      <select value={billingInterval} onChange={(e) => setBillingInterval(e.target.value as 'MONTHLY' | 'YEARLY')} className="h-12 rounded-xl border border-border bg-background px-4 outline-none transition focus:ring-4 focus:ring-primary/15">
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                      <input id="settings-premium-code" name="premiumCode" type="text" autoComplete="off" value={premiumCode} onChange={(e) => setPremiumCode(e.target.value)} placeholder="Optional promo code" className="h-12 rounded-xl border border-border bg-background px-4 outline-none transition focus:ring-4 focus:ring-primary/15" />
                      <button type="submit" disabled={isSubmittingSubscription} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 font-black text-white transition hover:opacity-95 disabled:opacity-60">
                        {subscription?.status === 'PENDING' ? 'Request Again' : 'Upgrade'}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-border bg-background p-5">
                    <p className="text-lg font-black tracking-tight text-slate-100">Membership Actions</p>
                    <p className="mt-1 text-sm text-slate-300">Control renewal and downgrade behavior with explicit actions.</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {subscription?.cancelAtPeriodEnd ? (
                        <button type="button" onClick={handleResumeSubscription} disabled={isSubmittingSubscription} className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 font-black text-white transition hover:opacity-95 disabled:opacity-60">Resume Renewal</button>
                      ) : (
                        <button type="button" onClick={() => handleDowngradeSubscription(false)} disabled={isSubmittingSubscription} className="h-12 rounded-xl border border-white/15 bg-white/5 px-4 font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60">Cancel At Period End</button>
                      )}
                      <button type="button" onClick={() => handleDowngradeSubscription(true)} disabled={isSubmittingSubscription} className="h-12 rounded-xl border border-rose-300 bg-rose-50 px-4 font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60">Downgrade Now</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section id="data" className="met-card met-card-hover rounded-2xl p-6 md:p-8">
            <SectionHeader icon={DatabaseZap} title="Data Activity" subtitle="Import/export audit trail visible to the user for transparency." />
            <div className="mt-6 rounded-xl border bg-background">
              {transferLogs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No import/export activity yet.</p>
              ) : (
                <div className="divide-y">
                  {transferLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <p className="text-sm font-semibold">{log.action} • {log.format}<span className="ml-2 text-xs text-muted-foreground">Rows: {log.rows}</span></p>
                      <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <AlertCircle size={14} />
              Settings are auto-saved and confirmation appears via toast notifications.
            </p>
          </section>

          <section id="danger" className="rounded-2xl border border-rose-200/70 bg-rose-50/35 p-6 md:p-8 dark:border-rose-500/35 dark:bg-rose-950/20">
            <SectionHeader icon={Trash2} title="Danger Zone" subtitle="Sensitive operations protected by password confirmation." />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <form onSubmit={handleResetData} className="rounded-2xl border border-[#ff9eff]/35 bg-white/5 p-4">
                <input type="text" name="username" autoComplete="username" value={user?.email || ''} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
                <p className="flex items-center gap-2 text-sm font-bold text-foreground"><DatabaseZap size={16} />Reset Financial Data</p>
                <p className="mt-1 text-xs text-muted-foreground">Deletes transactions, categories, and extra accounts while preserving the primary account.</p>
                <input id="settings-reset-data-password" name="resetDataPassword" type="password" autoComplete="current-password" placeholder="Confirm password" value={resetDataPassword} onChange={(e) => setResetDataPassword(e.target.value)} className="mt-3 h-11 w-full rounded-xl border border-white/12 bg-white/5 px-4 outline-none transition focus:ring-4 focus:ring-[#ff9eff]/20" />
                <button type="submit" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff9eff] px-4 font-bold text-[#1c0d32] transition hover:opacity-90"><DatabaseZap size={16} />Clear User Data</button>
              </form>
              <form onSubmit={handleDeleteAccount} className="rounded-2xl border border-rose-400/45 bg-white/5 p-4">
                <input type="text" name="username" autoComplete="username" value={user?.email || ''} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
                <p className="text-sm font-bold text-foreground">Delete Account</p>
                <p className="mt-1 text-xs text-muted-foreground">Permanently removes your account and all related data.</p>
                <input id="settings-delete-password" name="deletePassword" type="password" autoComplete="current-password" placeholder="Confirm password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="mt-3 h-11 w-full rounded-xl border bg-background px-4 outline-none transition focus:ring-4 focus:ring-rose-500/20" />
                <button type="submit" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 font-bold text-white transition hover:bg-rose-700"><Trash2 size={16} />Delete Account</button>
              </form>
            </div>
          </section>
        </main>
      </div>

      <PremiumComparisonModal
        isOpen={showPremiumComparisonModal}
        title="Premium Plan Comparison"
        subtitle="Before activation, review exactly what changes between BASIC and PREMIUM so users can make informed decisions."
        ctaLabel={isSubmittingSubscription ? 'Activating...' : 'Continue Activation'}
        onClose={() => setShowPremiumComparisonModal(false)}
        onConfirm={() => {
          setShowPremiumComparisonModal(false)
          void activatePremiumFlow()
        }}
      />
    </div>
  )
}

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: typeof User; title: string; subtitle: string }) => (
  <div>
    <div className="inline-flex items-center gap-2 text-foreground">
      <Icon size={18} />
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
    </div>
    <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
  </div>
)

const Field = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) => (
  <label htmlFor={htmlFor} className="space-y-2">
    <span className="text-sm font-semibold text-muted-foreground">{label}</span>
    {children}
  </label>
)

const SettingsNavLink = ({ href, label, icon: Icon, danger }: { href: string; label: string; icon: typeof User; danger?: boolean }) => (
  <a href={href} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${danger ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-border bg-background text-foreground hover:bg-muted'}`}>
    <Icon size={15} />
    <span>{label}</span>
  </a>
)

const MembershipChip = ({ icon: Icon, label, value }: { icon: typeof Gem; label: string; value: string }) => (
  <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 backdrop-blur">
    <div className="inline-flex items-center gap-1.5 text-cyan-100">
      <Icon size={13} />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
    </div>
    <p className="mt-1 text-sm font-black tracking-tight text-white">{value}</p>
  </div>
)

const SubscriptionMetric = ({ label, value, description }: { label: string; value: string; description: string }) => (
  <div className="rounded-xl border border-white/12 bg-white/5 p-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-lg font-black tracking-tight text-slate-100">{value}</p>
    <p className="mt-2 text-xs text-slate-400">{description}</p>
  </div>
)

const Badge = ({ children, tone }: { children: ReactNode; tone: 'warm' | 'neutral' }) => (
  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone === 'warm' ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200' : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}>{children}</span>
)

export default SettingsPage


