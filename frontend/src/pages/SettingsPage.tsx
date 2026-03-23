import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, ArrowRight, ChevronDown, Coins, DatabaseZap, Gem, KeyRound, Trash2, User } from 'lucide-react'
import * as api from '../api/authApi'
import { clearStoredCsrfToken } from '../api/http'
import * as dataTransferApi from '../api/dataTransferApi'
import type { AuthUser, SubscriptionSummary } from '../api/authApi'
import type { TransferLog } from '../api/dataTransferApi'
import { extractApiError, notify } from '../lib/toast'
import { CURRENCIES, type CurrencyCode } from '../lib/currencies'
import PremiumComparisonModal from '../components/PremiumComparisonModal'

interface SettingsPageProps {
  user: AuthUser | null
  onUserUpdate: (user: AuthUser) => void
}

function SettingsPage({ user, onUserUpdate }: SettingsPageProps) {
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
  const [openSection, setOpenSection] = useState<'profile' | 'security' | 'subscription' | 'data' | 'danger'>('profile')
  const didHydrateRef = useRef(false)
  const lastSavedRef = useRef({
    name: user?.name || '',
    currency: (user?.preferredCurrency || 'USD') as CurrencyCode
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
      currency !== lastSavedRef.current.currency

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
        lastSavedRef.current = { name: updatedUser.name || '', currency }
        notify.success('Settings saved.')
      } catch (error: unknown) {
        notify.error(extractApiError(error, 'Failed to save settings.'))
      } finally {
        setIsSavingProfile(false)
      }
    }, 700)

    return () => window.clearTimeout(timer)
  }, [name, currency, onUserUpdate])

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
      clearStoredCsrfToken()
      localStorage.removeItem('met_account_id')
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
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="px-1 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-100">Settings</h1>
        <p className="mt-2 text-sm text-slate-400">Manage your preferences, security, and account details.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px,minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <div className="met-card met-card-hover rounded-2xl p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Quick Navigation</p>
            <nav className="mt-3 space-y-1.5">
              <SettingsNavLink href="#profile" label="Profile & Preferences" icon={User} />
              <SettingsNavLink href="#security" label="Security & Privacy" icon={KeyRound} />
              <SettingsNavLink href="#subscription" label="Subscription" icon={Gem} />
              <SettingsNavLink href="#data" label="Data Activity" icon={DatabaseZap} />
              <SettingsNavLink href="#danger" label="Danger Zone" icon={Trash2} danger />
            </nav>
          </div>

          <div className="met-card met-card-hover rounded-2xl p-4">
            <p className="text-sm font-bold text-slate-100">Save Status</p>
            <p className="mt-2 text-xs text-slate-400">{saveStateLabel}</p>
          </div>
        </aside>

        <main className="space-y-6">
          <section id="profile" className="met-card met-card-hover rounded-2xl p-6 md:p-8">
            <CollapsibleHeader
              icon={User}
              title="Profile"
              subtitle="Core identity and default currency settings."
              open={openSection === 'profile'}
              onToggle={() => setOpenSection(openSection === 'profile' ? 'security' : 'profile')}
            />
            {openSection === 'profile' ? <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Display name" htmlFor="settings-display-name">
                <input id="settings-display-name" type="text" autoComplete="name" placeholder={user?.name || 'Enter your display name'} value={name} onChange={(e) => setName(e.target.value)} className="h-12 w-full rounded-xl border border-white/12 bg-white/5 px-4 text-slate-100 outline-none transition focus:border-[#ff9eff]/45 focus:ring-4 focus:ring-[#ff9eff]/15" />
              </Field>
              <Field label="Email" htmlFor="settings-email">
                <input id="settings-email" type="email" value={user?.email || ''} readOnly className="h-12 w-full rounded-xl border border-white/12 bg-white/5 px-4 text-slate-400 outline-none" />
              </Field>
              <Field label="Preferred currency" htmlFor="settings-currency">
                <div className="relative">
                  <Coins size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select id="settings-currency" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="h-12 w-full rounded-xl border border-white/12 bg-white/5 pl-9 pr-4 text-slate-100 outline-none transition focus:border-[#ff9eff]/45 focus:ring-4 focus:ring-[#ff9eff]/15">
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{`${c.symbol} - ${c.name} (${c.code})`}</option>)}
                  </select>
                </div>
              </Field>
            </div> : null}
          </section>

          <section id="security" className="met-card met-card-hover rounded-2xl p-6 md:p-8">
            <CollapsibleHeader
              icon={KeyRound}
              title="Security"
              subtitle="Password rotation and benchmarking privacy controls."
              open={openSection === 'security'}
              onToggle={() => setOpenSection(openSection === 'security' ? 'subscription' : 'security')}
            />
            {openSection === 'security' ? <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                <p className="text-sm font-bold text-slate-100">Password Update</p>
                <p className="mt-1 text-xs text-slate-400">Enter current + new password. Save runs automatically after brief pause.</p>
                <form className="mt-4 space-y-3" onSubmit={(e) => e.preventDefault()}>
                  <input type="text" name="username" autoComplete="username" value={user?.email || ''} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
                  <input id="settings-current-password" name="currentPassword" type="password" autoComplete="current-password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-12 w-full rounded-xl border border-white/12 bg-white/5 px-4 outline-none transition focus:border-[#ff9eff]/45 focus:ring-4 focus:ring-[#ff9eff]/15" />
                  <input id="settings-password" name="newPassword" type="password" autoComplete="new-password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12 w-full rounded-xl border border-white/12 bg-white/5 px-4 outline-none transition focus:border-[#ff9eff]/45 focus:ring-4 focus:ring-[#ff9eff]/15" />
                </form>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                <p className="text-sm font-bold text-slate-100">Benchmark Privacy</p>
                <p className="mt-1 text-xs text-slate-400">Anonymous benchmarking compares your trends against similar users only if enabled.</p>
                <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-white/12 bg-white/5 px-4 py-3">
                  <span className="text-sm font-semibold">Opt out from anonymized benchmarking</span>
                  <input type="checkbox" checked={benchmarkOptOut} onChange={(e) => void handleBenchmarkPreferenceChange(e.target.checked)} className="h-4 w-4" />
                </label>
              </div>
            </div> : null}
          </section>

          <section id="subscription" className="met-card met-card-hover rounded-2xl p-6 md:p-8">
            <CollapsibleHeader
              icon={Gem}
              title="Subscription"
              subtitle="Plan status and lifecycle controls."
              open={openSection === 'subscription'}
              onToggle={() => setOpenSection(openSection === 'subscription' ? 'data' : 'subscription')}
            />
            {openSection !== 'subscription' ? null : isLoadingSubscription ? (
              <p className="mt-6 text-sm text-slate-400">Loading subscription...</p>
            ) : user?.role === 'ADMIN' ? (
              <p className="mt-6 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300">Admin accounts already include premium capabilities. Billing lifecycle controls are intentionally disabled.</p>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
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
                  <form onSubmit={handleActivatePremium} className="rounded-2xl border border-white/12 bg-white/5 p-5">
                    <div className="mb-4">
                      <p className="text-lg font-black tracking-tight text-slate-100">Upgrade Path</p>
                      <p className="text-sm text-slate-300">Choose cadence and optionally apply a promo code.</p>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr),minmax(0,1.2fr),auto]">
                      <select value={billingInterval} onChange={(e) => setBillingInterval(e.target.value as 'MONTHLY' | 'YEARLY')} className="h-12 rounded-xl border border-white/12 bg-white/5 px-4 outline-none transition focus:border-[#ff9eff]/45 focus:ring-4 focus:ring-[#ff9eff]/15">
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                      <input id="settings-premium-code" name="premiumCode" type="text" autoComplete="off" value={premiumCode} onChange={(e) => setPremiumCode(e.target.value)} placeholder="Optional promo code" className="h-12 rounded-xl border border-white/12 bg-white/5 px-4 outline-none transition focus:border-[#ff9eff]/45 focus:ring-4 focus:ring-[#ff9eff]/15" />
                      <button type="submit" disabled={isSubmittingSubscription} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff9eff] via-[#dc89e1] to-[#a569b0] px-5 font-black text-[#1c0d32] transition hover:opacity-95 disabled:opacity-60">
                        {subscription?.status === 'PENDING' ? 'Request Again' : 'Upgrade'}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
                    <p className="text-lg font-black tracking-tight text-slate-100">Membership Actions</p>
                    <p className="mt-1 text-sm text-slate-300">Control renewal and downgrade behavior with explicit actions.</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {subscription?.cancelAtPeriodEnd ? (
                        <button type="button" onClick={handleResumeSubscription} disabled={isSubmittingSubscription} className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 font-black text-white transition hover:opacity-95 disabled:opacity-60">Resume Renewal</button>
                      ) : (
                        <button type="button" onClick={() => handleDowngradeSubscription(false)} disabled={isSubmittingSubscription} className="h-12 rounded-xl border border-white/15 bg-white/5 px-4 font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60">Cancel At Period End</button>
                      )}
                      <button type="button" onClick={() => handleDowngradeSubscription(true)} disabled={isSubmittingSubscription} className="h-12 rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 font-bold text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-60">Downgrade Now</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section id="data" className="met-card met-card-hover rounded-2xl p-6 md:p-8">
            <CollapsibleHeader
              icon={DatabaseZap}
              title="Data Activity"
              subtitle="Import/export audit trail visible to the user for transparency."
              open={openSection === 'data'}
              onToggle={() => setOpenSection(openSection === 'data' ? 'danger' : 'data')}
            />
            {openSection === 'data' ? <>
            <div className="mt-6 rounded-xl border border-white/12 bg-white/5">
              {transferLogs.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">No import/export activity yet.</p>
              ) : (
                <div className="divide-y">
                  {transferLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <p className="text-sm font-semibold">{log.action} - {log.format}<span className="ml-2 text-xs text-slate-400">Rows: {log.rows}</span></p>
                      <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400">
              <AlertCircle size={14} />
              Settings are auto-saved and confirmation appears via toast notifications.
            </p>
            </> : null}
          </section>

          <section id="danger" className="rounded-2xl border border-rose-400/35 bg-rose-500/10 p-6 md:p-8">
            <CollapsibleHeader
              icon={Trash2}
              title="Danger Zone"
              subtitle="Sensitive operations protected by password confirmation."
              open={openSection === 'danger'}
              onToggle={() => setOpenSection(openSection === 'danger' ? 'profile' : 'danger')}
            />
            {openSection === 'danger' ? <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <form onSubmit={handleResetData} className="rounded-2xl border border-[#ff9eff]/35 bg-white/5 p-4">
                <input type="text" name="username" autoComplete="username" value={user?.email || ''} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
                <p className="flex items-center gap-2 text-sm font-bold text-slate-100"><DatabaseZap size={16} />Reset Financial Data</p>
                <p className="mt-1 text-xs text-slate-400">Deletes transactions, categories, and extra accounts while preserving the primary account.</p>
                <input id="settings-reset-data-password" name="resetDataPassword" type="password" autoComplete="current-password" placeholder="Confirm password" value={resetDataPassword} onChange={(e) => setResetDataPassword(e.target.value)} className="mt-3 h-11 w-full rounded-xl border border-white/12 bg-white/5 px-4 outline-none transition focus:ring-4 focus:ring-[#ff9eff]/20" />
                <button type="submit" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff9eff] px-4 font-bold text-[#1c0d32] transition hover:opacity-90"><DatabaseZap size={16} />Clear User Data</button>
              </form>
              <form onSubmit={handleDeleteAccount} className="rounded-2xl border border-rose-400/45 bg-white/5 p-4">
                <input type="text" name="username" autoComplete="username" value={user?.email || ''} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
                <p className="text-sm font-bold text-slate-100">Delete Account</p>
                <p className="mt-1 text-xs text-slate-400">Permanently removes your account and all related data.</p>
                <input id="settings-delete-password" name="deletePassword" type="password" autoComplete="current-password" placeholder="Confirm password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="mt-3 h-11 w-full rounded-xl border border-white/12 bg-white/5 px-4 outline-none transition focus:ring-4 focus:ring-rose-500/20" />
                <button type="submit" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 font-bold text-white transition hover:bg-rose-700"><Trash2 size={16} />Delete Account</button>
              </form>
            </div>
            : null}
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
    <div className="inline-flex items-center gap-3 text-slate-100">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff9eff]/12">
        <Icon size={15} className="text-[#ff9eff]" />
      </span>
      <h2 className="text-sm font-bold tracking-tight text-slate-100">{title}</h2>
    </div>
    <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
  </div>
)

const CollapsibleHeader = ({
  icon,
  title,
  subtitle,
  open,
  onToggle
}: {
  icon: typeof User
  title: string
  subtitle: string
  open: boolean
  onToggle: () => void
}) => (
  <button type="button" onClick={onToggle} className="flex w-full items-center justify-between text-left">
    <SectionHeader icon={icon} title={title} subtitle={subtitle} />
    <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
  </button>
)

const Field = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) => (
  <label htmlFor={htmlFor} className="space-y-2">
    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</span>
    {children}
  </label>
)

const SettingsNavLink = ({ href, label, icon: Icon, danger }: { href: string; label: string; icon: typeof User; danger?: boolean }) => (
  <a href={href} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${danger ? 'border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15' : 'border-white/12 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-slate-100'}`}>
    <Icon size={15} />
    <span>{label}</span>
  </a>
)

const SubscriptionMetric = ({ label, value, description }: { label: string; value: string; description: string }) => (
  <div className="rounded-xl border border-white/12 bg-white/5 p-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-lg font-black tracking-tight text-slate-100">{value}</p>
    <p className="mt-2 text-xs text-slate-400">{description}</p>
  </div>
)

const Badge = ({ children, tone }: { children: ReactNode; tone: 'warm' | 'neutral' }) => (
  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone === 'warm' ? 'border-[#ff9eff]/40 bg-[#ff9eff]/14 text-[#ffc8ff]' : 'border-white/15 bg-white/5 text-slate-300'}`}>{children}</span>
)

export default SettingsPage


