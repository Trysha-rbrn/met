import { useState } from 'react'
import { User, Lock, Trash2, Save, AlertCircle, Coins } from 'lucide-react'
import * as api from '../api/authApi'

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: 'EUR' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'RUB', name: 'Russian Ruble', symbol: 'RUB' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'din' },
  { code: 'TRY', name: 'Turkish Lira', symbol: 'TRY' }
]

function SettingsPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState(localStorage.getItem('met_currency') || 'USD')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await api.updateProfile({ name: name || undefined, password: password || undefined })
      localStorage.setItem('met_currency', currency)
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
      setPassword('')
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (window.confirm('This will permanently delete your account and all financial data. Continue?')) {
      try {
        await api.deleteAccount()
        localStorage.removeItem('met_token')
        window.location.href = '/'
      } catch {
        alert('Failed to delete account.')
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tighter">Settings</h1>
        <p className="text-muted-foreground font-medium">Manage your profile, currency and security.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleUpdate} className="lg:col-span-2 bg-card border rounded-2xl overflow-hidden">
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
                  placeholder="Enter new name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                />
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

            <section className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-foreground">
                <Lock size={18} />
                <h2 className="text-lg font-bold">Password</h2>
              </div>

              <div className="space-y-2">
                <label htmlFor="settings-password" className="text-sm font-semibold text-muted-foreground">New password</label>
                <input
                  id="settings-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-background border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </section>

            {message.text && (
              <div className={`p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
              }`}>
                <AlertCircle size={16} />
                {message.text}
              </div>
            )}
          </div>

          <div className="px-6 md:px-8 py-4 border-t bg-muted/30 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <aside className="bg-card border rounded-2xl p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertCircle size={18} />
            <h2 className="text-lg font-bold">Danger Zone</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Deleting your account permanently removes all transactions and cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors"
          >
            <Trash2 size={18} />
            Delete Account
          </button>
        </aside>
      </div>
    </div>
  )
}

export default SettingsPage
