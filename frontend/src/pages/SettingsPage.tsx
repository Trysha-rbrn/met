import { useEffect, useRef, useState } from 'react'
import { User, Lock, Trash2, AlertCircle, Coins, Palette, DatabaseZap, Gem, Sparkles, ShieldCheck, LineChart, WalletCards } from 'lucide-react'
import * as api from '../api/authApi'
import * as dataTransferApi from '../api/dataTransferApi'
import type { AuthUser, SubscriptionSummary } from '../api/authApi'
import type { TransferLog } from '../api/dataTransferApi'
import { extractApiError, notify } from '../lib/toast'

type ThemeMode = 'light' | 'dark' | 'system'

interface SettingsPageProps {
  user: AuthUser | null
  onUserUpdate: (user: AuthUser) => void
  themeMode: ThemeMode
  onThemeModeChange: (mode: ThemeMode) => void
}

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: 'EUR' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'RUB', name: 'Russian Ruble', symbol: 'RUB' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'din' },
  { code: 'TRY', name: 'Turkish Lira', symbol: 'TRY' }
]

function SettingsPage({ user, onUserUpdate, themeMode, onThemeModeChange }: SettingsPageProps) {
  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [resetDataPassword, setResetDataPassword] = useState('')
  const [premiumCode, setPremiumCode] = useState('')
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [currency, setCurrency] = useState(localStorage.getItem('met_currency') || 'USD')
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([])
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false)
  const [isSubmittingSubscription, setIsSubmittingSubscription] = useState(false)
  const didHydrateRef = useRef(false)
  const lastSavedRef = useRef({
    name: user?.name || '',
    currency: localStorage.getItem('met_currency') || 'USD',
    theme: themeMode as ThemeMode
  })
  const lastPasswordAttemptRef = useRef('')

  useEffect(() => {
    setName(user?.name || '')
    lastSavedRef.current.name = user?.name || ''
  }, [user])

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
        const updatedUser = await api.updateProfile({ name: nextName || undefined })
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

  const handleResetData = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetDataPassword) {
      notify.warning('Please enter your password to clear data.')
      return
    }

    if (!window.confirm('This will delete transactions, categories and extra accounts. Only Primary account will remain. Continue?')) {
      return
    }

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

    if (!window.confirm('This will permanently delete your account and all financial data. Continue?')) {
      return
    }

    try {
      await api.deleteAccount(deletePassword)
      notify.success('Account deleted successfully.')
      localStorage.removeItem('met_token')
      window.location.href = '/'
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to delete account.'))
    }
  }

  const handleActivatePremium = async (e: React.FormEvent) => {
    e.preventDefault()

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground font-medium">Manage your profile, theme, currency and security.</p>
        <p className="text-xs text-muted-foreground">
          {isSavingProfile ? 'Saving profile changes...' : isSavingPassword ? 'Updating password...' : 'Changes are saved automatically.'}
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="overflow-hidden rounded-[24px] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] p-6 md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black tracking-[0.24em] text-amber-800">
                  <Gem size={14} />
                  {isPremiumUser ? 'PREMIUM MEMBERSHIP' : 'PREMIUM PREVIEW'}
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    {isPremiumUser ? 'You are inside the premium lane.' : 'Premium should feel unmistakably better.'}
                  </h2>
                  <p className="max-w-2xl text-sm sm:text-base text-slate-600">
                    {isPremiumUser
                      ? 'Your workspace now has deeper analysis, longer range visibility and a more flexible transaction review flow.'
                      : 'Upgrade to unlock stronger visibility into trends, a wider analysis horizon and advanced filtering.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[31rem]">
                <MembershipChip icon={LineChart} label="Insights" value={isPremiumUser ? 'Enabled' : 'Locked'} />
                <MembershipChip icon={Sparkles} label="90D Range" value={isPremiumUser ? 'Enabled' : 'Locked'} />
                <MembershipChip icon={WalletCards} label="Accounts" value={isPremiumUser ? (user?.role === 'ADMIN' ? '20' : '10') : '3'} />
                <MembershipChip icon={ShieldCheck} label="Plan" value={user?.role || 'BASIC'} />
              </div>
            </div>
          </section>

          <section className="bg-card border rounded-2xl overflow-hidden">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-2 text-foreground">
                <User size={18} />
                <h2 className="text-lg font-bold">Account Profile</h2>
              </div>

              <div className="space-y-2">
                <label htmlFor="settings-display-name" className="text-sm font-semibold text-muted-foreground">Display name</label>
                <input
                  id="settings-display-name"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  placeholder={user?.name || 'Enter new name'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="settings-email" className="text-sm font-semibold text-muted-foreground">Email</label>
                <input
                  id="settings-email"
                  name="email"
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="w-full px-4 py-3 bg-muted/50 border rounded-xl outline-none text-muted-foreground"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Current plan: <span className="font-semibold text-foreground">{user?.role || 'BASIC'}</span>
              </div>

              <form className="space-y-4 pt-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={user?.email || ''}
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                />
                <div className="flex items-center gap-2 text-foreground">
                  <Lock size={18} />
                  <h3 className="text-base font-bold">Password</h3>
                </div>

                <div className="space-y-2">
                  <label htmlFor="settings-current-password" className="text-sm font-semibold text-muted-foreground">Current password</label>
                  <input
                    id="settings-current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Required to change password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-background border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="settings-password" className="text-sm font-semibold text-muted-foreground">New password</label>
                  <input
                    id="settings-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Leave blank to keep current password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-background border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </form>

              <div className="space-y-2">
                <label htmlFor="settings-currency" className="text-sm font-semibold text-muted-foreground inline-flex items-center gap-2">
                  <Coins size={15} /> Preferred currency
                </label>
                <select
                  id="settings-currency"
                  name="currency"
                  autoComplete="off"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-background border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.symbol} - {c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] p-6 md:p-8 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-amber-800">
              <Gem size={13} />
              SUBSCRIPTION CONTROL
            </div>
            {isLoadingSubscription ? (
              <p className="text-sm text-muted-foreground">Loading subscription...</p>
            ) : user?.role === 'ADMIN' ? (
              <p className="text-sm text-muted-foreground">
                Admin access already includes premium capabilities. Billing lifecycle controls are disabled for admin accounts.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/60 bg-white/90 p-5 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-900">
                      Plan: {subscription?.plan || user?.role || 'BASIC'}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
                      Status: {subscription?.status || (isPremiumUser ? 'ACTIVE' : 'ACTIVE')}
                    </span>
                    {subscription?.billingInterval && (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                        {subscription.billingInterval}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <SubscriptionInfoCard
                      label="Plan posture"
                      value={isPremiumUser ? 'Premium unlocked' : 'Basic active'}
                      description={isPremiumUser ? 'Your premium features are available across the product.' : 'Upgrade whenever you want stronger analysis tools.'}
                    />
                    <SubscriptionInfoCard
                      label="Billing cadence"
                      value={subscription?.billingInterval || 'N/A'}
                      description={subscription?.billingInterval ? 'Current billing interval on file.' : 'No recurring premium billing yet.'}
                    />
                    <SubscriptionInfoCard
                      label="Current period"
                      value={periodEndLabel || 'Not started'}
                      description={periodEndLabel ? 'Displayed as the active period end date.' : 'Will appear after activation or webhook confirmation.'}
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    {subscription?.status === 'PENDING'
                      ? 'Upgrade is waiting for a billing confirmation webhook.'
                      : isPremiumUser
                        ? `Premium features are enabled${periodEndLabel ? `. Current period ends on ${periodEndLabel}.` : '.'}`
                        : 'Unlock Premium features: advanced dashboard insights, smart transaction filters and higher account limits.'}
                  </p>
                  {subscription?.externalSubscriptionId && subscription.status === 'PENDING' && (
                    <p className="text-xs text-slate-500">
                      Checkout reference: <span className="font-mono">{subscription.externalSubscriptionId}</span>
                    </p>
                  )}
                </div>

                {!isPremiumUser ? (
                  <form onSubmit={handleActivatePremium} className="space-y-4 rounded-[24px] border border-dashed border-amber-300/80 bg-white/80 p-5">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black tracking-tight text-slate-900">Upgrade path</h3>
                      <p className="text-sm text-slate-600">Choose a billing interval or use a promo code for instant local activation.</p>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="settings-billing-interval" className="text-sm font-semibold text-slate-600">Billing interval</label>
                      <select
                        id="settings-billing-interval"
                        value={billingInterval}
                        onChange={(e) => setBillingInterval(e.target.value as 'MONTHLY' | 'YEARLY')}
                        className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-200/40"
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>
                    <input
                      id="settings-premium-code"
                      name="premiumCode"
                      type="text"
                      autoComplete="off"
                      value={premiumCode}
                      onChange={(e) => setPremiumCode(e.target.value)}
                      placeholder="Optional promo code for instant activation"
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-200/40"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingSubscription}
                      className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 py-3 font-black text-white shadow-lg shadow-amber-500/20 transition hover:opacity-95 disabled:opacity-60"
                    >
                      {subscription?.status === 'PENDING' ? 'Request Again' : 'Upgrade to Premium'}
                    </button>
                  </form>
                ) : (
                  <div className="rounded-[24px] border border-white/60 bg-white/80 p-5">
                    <div className="mb-4 space-y-1">
                      <h3 className="text-lg font-black tracking-tight text-slate-900">Membership actions</h3>
                      <p className="text-sm text-slate-600">Control renewal behavior while keeping the premium state clearly visible.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                    {subscription?.cancelAtPeriodEnd ? (
                      <button
                        type="button"
                        onClick={handleResumeSubscription}
                        disabled={isSubmittingSubscription}
                        className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 font-black text-white shadow-lg shadow-emerald-500/20 transition hover:opacity-95 disabled:opacity-60"
                      >
                        Resume Renewal
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDowngradeSubscription(false)}
                        disabled={isSubmittingSubscription}
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cancel At Period End
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDowngradeSubscription(true)}
                      disabled={isSubmittingSubscription}
                      className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3 font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      Downgrade Now
                    </button>
                    </div>
                  </div>
                )}
                {!isPremiumUser && (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-5">
                    <div className="mb-4 space-y-1">
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black tracking-[0.22em] text-slate-700">
                        <Lock size={13} />
                        LOCKED PREVIEW
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900">What unlocks with premium</h3>
                      <p className="text-sm text-slate-600">These features are already wired into the product and become visible once your subscription is active.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <SubscriptionInfoCard
                        label="Dashboard"
                        value="Insights"
                        description="Average daily net, forward projection and savings quality."
                      />
                      <SubscriptionInfoCard
                        label="Transactions"
                        value="Advanced filters"
                        description="Search by content and narrow by type without leaving the ledger."
                      />
                      <SubscriptionInfoCard
                        label="Workspace"
                        value="Higher limits"
                        description="More accounts for clearer separation of budgets, cash pools and goals."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="bg-card border rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <Palette size={18} />
              <h2 className="text-lg font-bold">Appearance</h2>
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-theme" className="text-sm font-semibold text-muted-foreground">Theme mode</label>
              <select
                id="settings-theme"
                name="theme"
                value={themeMode}
                onChange={(e) => handleThemeModeChange(e.target.value as ThemeMode)}
                className="w-full px-4 py-3 bg-background border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </section>

          <section className="bg-card border rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <DatabaseZap size={18} />
              <h2 className="text-lg font-bold">Import/Export Activity</h2>
            </div>
            {transferLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No import/export activity yet.</p>
            ) : (
              <div className="divide-y rounded-xl border bg-background">
                {transferLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {log.action} • {log.format}
                      <span className="text-xs text-muted-foreground ml-2">Rows: {log.rows}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="p-3 rounded-xl text-sm font-semibold flex items-center gap-2 bg-muted/40 border border-border text-muted-foreground">
            <AlertCircle size={16} />
            Settings are auto-saved and status is shown via toast notifications.
          </div>
        </div>

        <aside className="bg-card border rounded-2xl p-6 space-y-5 h-fit">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertCircle size={18} />
            <h2 className="text-lg font-bold">Danger Zone</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Sensitive actions require your password confirmation.
          </p>

          <form onSubmit={handleResetData} className="space-y-3 border rounded-xl p-4">
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={user?.email || ''}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DatabaseZap size={16} />
              Reset financial data
            </p>
            <p className="text-xs text-muted-foreground">
              Deletes transactions, categories and extra accounts. Keeps only Primary account.
            </p>
            <input
              id="settings-reset-data-password"
              name="resetDataPassword"
              type="password"
              autoComplete="current-password"
              placeholder="Confirm password"
              value={resetDataPassword}
              onChange={(e) => setResetDataPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors"
            >
              <DatabaseZap size={18} />
              Clear User Data
            </button>
          </form>

          <form onSubmit={handleDeleteAccount} className="space-y-3 border rounded-xl p-4">
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={user?.email || ''}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
            <p className="text-sm font-semibold text-foreground">Delete account</p>
            <p className="text-xs text-muted-foreground">
              Permanently deletes your account and all related data.
            </p>
            <input
              id="settings-delete-password"
              name="deletePassword"
              type="password"
              autoComplete="current-password"
              placeholder="Confirm password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors"
            >
              <Trash2 size={18} />
              Delete Account
            </button>
          </form>
        </aside>
      </div>
    </div>
  )
}

const MembershipChip = ({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Gem
  label: string
  value: string
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-900">
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-amber-600" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
    </div>
    <p className="mt-2 text-sm font-black tracking-tight">{value}</p>
  </div>
)

const SubscriptionInfoCard = ({
  label,
  value,
  description
}: {
  label: string
  value: string
  description: string
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{value}</p>
    <p className="mt-2 text-xs text-slate-500">{description}</p>
  </div>
)

export default SettingsPage
