import { useState } from 'react'
import { User, Lock, Trash2, Save, AlertCircle, Coins } from 'lucide-react'
import * as api from '../api/authApi'

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'din' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' }
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
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setPassword('')
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (window.confirm('WARNING: This will permanently delete your account and all financial data. This action cannot be undone. Are you sure?')) {
      try {
        await api.deleteAccount()
        localStorage.removeItem('met_token')
        window.location.href = '/'
      } catch (err) {
        alert('Failed to delete account.')
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your account preferences and security.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile & Currency Settings */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleUpdate} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 text-blue-600 mb-2">
                <User size={24} strokeWidth={3} />
                <h2 className="text-xl font-black uppercase tracking-tight">Profile Information</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400 pl-1">New Display Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter new name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400 pl-1 text-blue-500 flex items-center gap-2">
                    <Coins size={14} /> Preferred Currency
                  </label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} - {c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 text-indigo-600 mb-2">
                    <Lock size={20} strokeWidth={3} />
                    <h2 className="text-lg font-black uppercase tracking-tight">Change Password</h2>
                  </div>
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400 pl-1">New Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
                  />
                  <p className="text-xs text-slate-400 italic font-medium pl-1">Leave blank to keep current password.</p>
                </div>
              </div>

              {message.text && (
                <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-800'
                }`}>
                  <AlertCircle size={18} />
                  {message.text}
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-blue-500/25 active:scale-95 disabled:opacity-50"
              >
                <Save size={20} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="space-y-6">
          <div className="bg-rose-50/50 dark:bg-rose-900/10 rounded-[2rem] border border-rose-100 dark:border-rose-900/30 p-8 space-y-6">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle size={24} strokeWidth={3} />
              <h2 className="text-xl font-black uppercase tracking-tight text-rose-600">Danger Zone</h2>
            </div>
            <p className="text-sm text-rose-600/70 font-bold leading-relaxed">
              Once you delete your account, there is no going back. All your data will be wiped from our servers.
            </p>
            <button 
              onClick={handleDeleteAccount}
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-4 rounded-2xl font-black transition-all shadow-lg shadow-rose-500/20 active:scale-95"
            >
              <Trash2 size={20} />
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
