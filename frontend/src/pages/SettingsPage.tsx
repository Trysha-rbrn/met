import { useEffect, useRef, useState } from 'react'
import { User, Lock, Trash2, AlertCircle, Coins, Palette } from 'lucide-react'
import * as api from '../api/authApi'
import type { AuthUser } from '../api/authApi'
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
  const [currency, setCurrency] = useState(localStorage.getItem('met_currency') || 'USD')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground font-medium">Manage your profile, theme, currency and security.</p>
        <p className="text-xs text-muted-foreground">
          {isSavingProfile ? 'Saving profile changes...' : isSavingPassword ? 'Updating password...' : 'Changes are saved automatically.'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border rounded-2xl overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <User size={18} />
                <h2 className="text-lg font-bold">Profile</h2>
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
            </section>

            <section className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-foreground">
                <Palette size={18} />
                <h2 className="text-lg font-bold">Theme</h2>
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

            <section className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-foreground">
                <Coins size={18} />
                <h2 className="text-lg font-bold">Currency</h2>
              </div>

              <div className="space-y-2">
                <label htmlFor="settings-currency" className="text-sm font-semibold text-muted-foreground">Preferred currency</label>
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
            </section>

            <form
              className="space-y-4 pt-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-2 text-foreground">
                <Lock size={18} />
                <h2 className="text-lg font-bold">Password</h2>
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

            <div className="p-3 rounded-xl text-sm font-semibold flex items-center gap-2 bg-muted/40 border border-border text-muted-foreground">
              <AlertCircle size={16} />
              Settings are auto-saved and status is shown via toast notifications.
            </div>
          </div>
        </div>

        <aside className="bg-card border rounded-2xl p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertCircle size={18} />
            <h2 className="text-lg font-bold">Danger Zone</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your password and confirm to permanently delete your account and all financial data.
          </p>
          <form onSubmit={handleDeleteAccount} className="space-y-3">
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

export default SettingsPage
