import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { Wallet, LayoutDashboard, LogOut, User, PanelLeftClose, PanelLeftOpen, ArrowLeftRight, PieChart, TrendingUp, FileText, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ToastContainer } from 'react-toastify'

import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import * as authApi from './api/authApi'
import { clearStoredCsrfToken } from './api/http'
import type { AuthUser } from './api/authApi'
import { notify } from './lib/toast'
import PremiumComparisonModal from './components/PremiumComparisonModal'
import MetLoadingOverlay from './components/MetLoadingOverlay'
import MetLogo from './components/MetLogo'

const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const SecurityPage = lazy(() => import('./pages/SecurityPage'))
const StatusPage = lazy(() => import('./pages/StatusPage'))

const baseNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/categories', label: 'Budget', icon: PieChart },
  { path: '/settings', label: 'Investments', icon: TrendingUp, disabled: true },
  { path: '/settings', label: 'Reports', icon: FileText, disabled: true },
  { path: '/settings', label: 'Settings', icon: User },
  { path: '/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
]

const PREMIUM_OFFER_STORAGE_KEY = 'met_premium_offer_state'
const ACTIVE_USAGE_STORAGE_KEY = 'met_active_usage_state'

type PremiumOfferState = {
  nextPromptAt: number
  lastPromptAt: number | null
}

type ActiveUsageState = {
  totalMinutes: number
  activeDays: string[]
}

const randomPromptDelayDays = () => {
  const minDays = 10
  const maxDays = 15
  return Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays
}

const readJsonStorage = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPremiumOfferModal, setShowPremiumOfferModal] = useState(false)
  const [showWorkspaceTransition, setShowWorkspaceTransition] = useState(false)
  const hadConnectionDropRef = useRef(false)

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  useEffect(() => {
    if (!user) return
    localStorage.setItem('met_currency', user.preferredCurrency || 'USD')
  }, [user])

  const clearLocalSessionState = useCallback(() => {
    setUser(null)
    clearStoredCsrfToken()
    localStorage.removeItem('met_account_id')
    localStorage.removeItem(PREMIUM_OFFER_STORAGE_KEY)
    localStorage.removeItem(ACTIVE_USAGE_STORAGE_KEY)
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      notify.warning('We could not confirm server logout, but local session was cleared.')
    } finally {
      clearLocalSessionState()
    }
  }, [clearLocalSessionState])

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const userData = await authApi.getMe()
        setUser(userData)
      } catch {
        clearStoredCsrfToken()
        setUser(null)
      }
      setLoading(false)
    }
    void verifyUser()
  }, [])

  useEffect(() => {
    const onOffline = () => {
      hadConnectionDropRef.current = true
    }

    const onOnline = () => {
      if (!hadConnectionDropRef.current) return
      hadConnectionDropRef.current = false
      if (user) {
        notify.info('Connection changed. Please log in again.')
      }
      void handleLogout()
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [handleLogout, user])

  useEffect(() => {
    if (!user) return

    const interval = window.setInterval(async () => {
      try {
        await authApi.getMe()
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          notify.info('Session expired. Please log in again.')
          void handleLogout()
        }
      }
    }, 15000)

    return () => window.clearInterval(interval)
  }, [user, handleLogout])

  useEffect(() => {
    if (!user || user.role !== 'BASIC') return

    const now = Date.now()
    const offerState = readJsonStorage<PremiumOfferState>(PREMIUM_OFFER_STORAGE_KEY, {
      nextPromptAt: now + randomPromptDelayDays() * 24 * 60 * 60 * 1000,
      lastPromptAt: null
    })
    localStorage.setItem(PREMIUM_OFFER_STORAGE_KEY, JSON.stringify(offerState))

    const usage = readJsonStorage<ActiveUsageState>(ACTIVE_USAGE_STORAGE_KEY, { totalMinutes: 0, activeDays: [] })
    const today = new Date().toISOString().slice(0, 10)
    if (!usage.activeDays.includes(today)) {
      usage.activeDays = [...usage.activeDays, today].slice(-45)
      localStorage.setItem(ACTIVE_USAGE_STORAGE_KEY, JSON.stringify(usage))
    }
  }, [user])

  useEffect(() => {
    if (!user || user.role !== 'BASIC') return

    const interval = window.setInterval(() => {
      if (document.hidden) return
      const usage = readJsonStorage<ActiveUsageState>(ACTIVE_USAGE_STORAGE_KEY, { totalMinutes: 0, activeDays: [] })
      usage.totalMinutes += 1
      localStorage.setItem(ACTIVE_USAGE_STORAGE_KEY, JSON.stringify(usage))
    }, 60000)

    return () => window.clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (!user || user.role !== 'BASIC') return

    const usage = readJsonStorage<ActiveUsageState>(ACTIVE_USAGE_STORAGE_KEY, { totalMinutes: 0, activeDays: [] })
    const offerState = readJsonStorage<PremiumOfferState>(PREMIUM_OFFER_STORAGE_KEY, {
      nextPromptAt: Date.now() + randomPromptDelayDays() * 24 * 60 * 60 * 1000,
      lastPromptAt: null
    })

    const isActiveUser = usage.totalMinutes >= 90 && usage.activeDays.length >= 4
    const isDue = Date.now() >= offerState.nextPromptAt

    if (isActiveUser && isDue) {
      const timer = window.setTimeout(() => {
        setShowPremiumOfferModal(true)
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [user])

  const scheduleNextPremiumOfferPrompt = useCallback(() => {
    const now = Date.now()
    const nextPromptAt = now + randomPromptDelayDays() * 24 * 60 * 60 * 1000
    const nextState: PremiumOfferState = {
      lastPromptAt: now,
      nextPromptAt
    }
    localStorage.setItem(PREMIUM_OFFER_STORAGE_KEY, JSON.stringify(nextState))
    setShowPremiumOfferModal(false)
  }, [])

  const handleLogin = (userData: AuthUser) => {
    setUser(userData)
    localStorage.setItem('met_currency', userData.preferredCurrency || 'USD')
    setShowWorkspaceTransition(true)
  }

  useEffect(() => {
    if (!showWorkspaceTransition) return
    const timer = window.setTimeout(() => {
      setShowWorkspaceTransition(false)
    }, 520)

    return () => window.clearTimeout(timer)
  }, [showWorkspaceTransition])

  if (loading) {
    return <div className="fixed inset-0 bg-background flex items-center justify-center">
      <Wallet size={48} className="animate-pulse text-primary" />
    </div>
  }

  return (
    <Router>
      <div className="met-app-bg min-h-screen overflow-x-hidden antialiased">
        {!user ? (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage onLogin={handleLogin} initialMode="login" />} />
            <Route path="/register" element={<AuthPage onLogin={handleLogin} initialMode="register" />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="*" element={<NotFoundPage isAuthenticated={false} />} />
          </Routes>
        ) : (
          <div className="min-h-screen">
            <Sidebar
              user={user}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onLogout={() => void handleLogout()}
            />
            <div className={`flex min-h-screen min-w-0 flex-col ${isSidebarCollapsed ? 'lg:pl-[110px]' : 'lg:pl-[240px]'}`}>
              <Header user={user} onLogout={handleLogout} />
              <main className="flex-1 min-w-0 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
                <Suspense fallback={<PageLoader />}>
                  <AnimatePresence mode="wait">
                    <Routes>
                      <Route path="/" element={<Dashboard isSidebarCollapsed={isSidebarCollapsed} userRole={user?.role || 'BASIC'} userName={user?.name || 'there'} />} />
                      <Route path="/transactions" element={<TransactionsPage userRole={user?.role || 'BASIC'} />} />
                      <Route path="/categories" element={<CategoriesPage userRole={user?.role || 'BASIC'} />} />
                      <Route path="/settings" element={<SettingsPage user={user} onUserUpdate={setUser} />} />
                      <Route path="/admin" element={user?.role === 'ADMIN' ? <AdminPage /> : <NotFoundPage isAuthenticated />} />
                      <Route path="/privacy" element={<PrivacyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/security" element={<SecurityPage />} />
                      <Route path="/status" element={<StatusPage />} />
                      <Route path="/auth" element={<Navigate to="/" replace />} />
                      <Route path="/register" element={<Navigate to="/" replace />} />
                      <Route path="*" element={<NotFoundPage isAuthenticated />} />
                    </Routes>
                  </AnimatePresence>
                </Suspense>
              </main>
              <AppFooter />
            </div>
            <MobileNav user={user} />
          </div>
        )}
      </div>
      <MetLoadingOverlay
        isOpen={showWorkspaceTransition}
        statusMessages={['Opening your dashboard...', 'Syncing your workspace...', 'Ready.']}
      />
      <PremiumComparisonModal
        isOpen={showPremiumOfferModal}
        title="Upgrade Your Finance Workspace"
        subtitle="You are an active user, so here is a clear side-by-side overview of what Premium unlocks for your workflow."
        ctaLabel="Open Premium Settings"
        onClose={scheduleNextPremiumOfferPrompt}
        onConfirm={() => {
          scheduleNextPremiumOfferPrompt()
          window.location.assign('/settings')
        }}
      />
      <ToastContainer
        newestOnTop
        limit={4}
        toastClassName="!rounded-xl !border !border-border !bg-card !text-card-foreground"
      />
    </Router>
  )
}

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-border/70 bg-background/90">
      <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
        <Wallet size={18} className="animate-pulse text-primary" />
        Loading workspace...
      </div>
    </div>
  )
}

function Sidebar({
  user,
  isCollapsed,
  onToggle,
  onLogout
}: {
  user: AuthUser | null
  isCollapsed: boolean
  onToggle: () => void
  onLogout: () => void
}) {
  const location = useLocation()
  const navItems = baseNavItems.filter((item) => !item.adminOnly || user?.role === 'ADMIN')
  const primaryNavItems = navItems.filter((item) => !item.adminOnly && item.label !== 'Settings')
  const secondaryNavItems = navItems.filter((item) => item.adminOnly || item.label === 'Settings')
  const initials = (user?.name || 'User')
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
  
  return (
    <aside className={`hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col border-r border-white/[0.08] bg-[#0a0a0a] px-4 py-6 transition-[width] duration-200 ease-out ${isCollapsed ? 'w-[110px]' : 'w-[240px]'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="absolute -right-5 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#111114] text-slate-400 shadow-md transition-colors hover:bg-[#1a1a20] hover:text-slate-100"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
      <div className={`mb-10 flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 px-2'}`}>
        <MetLogo compact />
        {!isCollapsed ? <span className="text-xl font-bold tracking-tighter text-[#f1f5f9]">MET</span> : null}
      </div>

      <nav className="flex-1 space-y-1">
        {primaryNavItems.map((item) => (
          <Link
            key={`${item.path}-${item.label}`}
            to={item.path}
            title={item.label}
            className={`met-sidebar-item flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              location.pathname === item.path
                ? 'met-sidebar-item-active'
                : 'text-slate-500'
            } ${isCollapsed ? 'justify-center rounded-xl border-l-0' : ''} ${item.disabled ? 'pointer-events-none opacity-55' : ''}`}
          >
            <item.icon size={20} />
            {!isCollapsed ? item.label : null}
          </Link>
        ))}

        {!isCollapsed ? (
          <div className="px-3 pb-1 pt-6">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#64748b]">Administration</p>
          </div>
        ) : null}

        {secondaryNavItems.map((item) => (
          <Link
            key={`${item.path}-${item.label}`}
            to={item.path}
            title={item.label}
            className={`met-sidebar-item flex items-center ${item.label === 'Admin' && !isCollapsed ? 'justify-between' : 'gap-3'} px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              location.pathname === item.path
                ? 'met-sidebar-item-active'
                : 'text-slate-500'
            } ${isCollapsed ? 'justify-center rounded-xl border-l-0' : ''}`}
          >
            <span className="flex items-center gap-3">
              <item.icon size={20} />
              {!isCollapsed ? item.label : null}
            </span>
            {!isCollapsed && item.label === 'Admin' ? (
              <span className="rounded border border-[#ff9eff]/25 bg-[#ff9eff]/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#ff9eff]">
                ADMIN
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      <div className={`mt-auto border-t border-white/[0.08] pt-6 ${isCollapsed ? 'flex justify-center' : 'flex items-center justify-between'}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#6a4d8b] to-[#dc89e1] text-[10px] font-bold">
            {initials || 'U'}
          </div>
          {!isCollapsed ? (
            <div>
              <p className="text-xs font-bold text-slate-100">{user?.name || 'User'}</p>
              <p className="text-[10px] text-[#64748b]">{user?.role === 'ADMIN' ? 'Super Admin' : user?.role === 'PREMIUM' ? 'Premium Member' : 'Basic Member'}</p>
            </div>
          ) : null}
        </div>
        <button type="button" onClick={onLogout} className="text-[#64748b] transition-colors hover:text-white" aria-label="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}

interface HeaderProps {
  user: AuthUser | null
  onLogout: () => void
}

function Header({ user, onLogout }: HeaderProps) {
  const location = useLocation()
  const title = location.pathname === '/'
    ? 'Dashboard'
    : location.pathname.replace('/', '').replace('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase())

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-white/10 bg-[#0a0a0a]/70 backdrop-blur-lg px-6">
       <div className="flex-1 space-y-1">
         <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase">MET Workspace</p>
         <p className="text-sm font-bold tracking-wide text-slate-100">{title}</p>
       </div>
       <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-slate-100">{user?.name || 'User'}</span>
            <span className="text-xs text-slate-400">{user?.email}</span>
          </div>
          <motion.button 
            onClick={onLogout}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-[#ff9eff]/12 text-[#ff9eff] hover:bg-[#ff9eff]/20 transition-colors border border-[#ff9eff]/30"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </motion.button>
        </div>
       </div>
    </header>
  )
}

function MobileNav({ user }: { user: AuthUser | null }) {
  const location = useLocation()
  const navItems = baseNavItems.filter((item) => !item.adminOnly || user?.role === 'ADMIN')

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 overflow-hidden border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0a]/80">
      <div className={`grid px-2 py-2 ${navItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl min-h-11 px-1 py-2 text-[10px] font-semibold transition-colors ${
              location.pathname === item.path
                ? 'text-[#ff9eff] bg-[#ff9eff]/10'
                : 'text-slate-500 hover:text-slate-100 hover:bg-white/5'
            }`}
          >
            <item.icon size={18} />
            <span className="block max-w-full truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

function AppFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0a0a0a]/85">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <MetLogo />
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">Finance Tracker</p>
          </div>
          <p className="text-sm text-slate-400">
            Analyze spending, shape budgets, and operate from one clean financial workspace.
          </p>
        </div>
        <div className="mt-6 border-t border-white/10 pt-5 text-xs text-slate-500">
          © 2026 MET. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default App


