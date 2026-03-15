import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Wallet, Settings, LayoutDashboard, LogOut, User, BarChart, PanelLeftClose, PanelLeftOpen, Sparkles, ShieldCheck, Smartphone, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ToastContainer } from 'react-toastify'

import AuthPage from './pages/AuthPage'
import NotFoundPage from './pages/NotFoundPage'
import * as authApi from './api/authApi'
import type { AuthUser } from './api/authApi'
import { notify } from './lib/toast'
import PremiumComparisonModal from './components/PremiumComparisonModal'

const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

const baseNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: BarChart },
  { path: '/categories', label: 'Categories', icon: Settings },
  { path: '/settings', label: 'Settings', icon: User },
  { path: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
]

type ThemeMode = 'light' | 'dark' | 'system'
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
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('met_theme_mode')
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    return 'system'
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('met_token'))
  const [loading, setLoading] = useState(true)
  const [showPremiumOfferModal, setShowPremiumOfferModal] = useState(false)
  const hadConnectionDropRef = useRef(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const shouldUseDark = themeMode === 'dark' || (themeMode === 'system' && media.matches)
      if (shouldUseDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    applyTheme()
    localStorage.setItem('met_theme_mode', themeMode)

    if (themeMode === 'system') {
      const listener = () => applyTheme()
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    } else {
      return undefined
    }
  }, [themeMode])

  useEffect(() => {
    if (!user) return
    localStorage.setItem('met_user_role', user.role)
    localStorage.setItem('met_currency', user.preferredCurrency || 'USD')
  }, [user])

  const handleLogout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('met_token')
    localStorage.removeItem('met_user_role')
  }, [])

  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('met_token')
      if (storedToken) {
        try {
          const userData = await authApi.getMe()
          setUser(userData)
          localStorage.setItem('met_user_role', userData.role)
        } catch {
          handleLogout()
        }
      }
      setLoading(false)
    }
    verifyUser()
  }, [token, handleLogout])

  useEffect(() => {
    const onOffline = () => {
      hadConnectionDropRef.current = true
    }

    const onOnline = () => {
      if (!hadConnectionDropRef.current) return
      hadConnectionDropRef.current = false
      if (localStorage.getItem('met_token')) {
        notify.info('Connection changed. Please log in again.')
      }
      handleLogout()
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [handleLogout])

  useEffect(() => {
    if (!token) return

    const interval = window.setInterval(async () => {
      try {
        await authApi.getMe()
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          notify.info('Session expired. Please log in again.')
          handleLogout()
        }
      }
    }, 15000)

    return () => window.clearInterval(interval)
  }, [token, handleLogout])

  useEffect(() => {
    if (!token || !user || user.role !== 'BASIC') return

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
  }, [token, user])

  useEffect(() => {
    if (!token || !user || user.role !== 'BASIC') return

    const interval = window.setInterval(() => {
      if (document.hidden) return
      const usage = readJsonStorage<ActiveUsageState>(ACTIVE_USAGE_STORAGE_KEY, { totalMinutes: 0, activeDays: [] })
      usage.totalMinutes += 1
      localStorage.setItem(ACTIVE_USAGE_STORAGE_KEY, JSON.stringify(usage))
    }, 60000)

    return () => window.clearInterval(interval)
  }, [token, user])

  useEffect(() => {
    if (!token || !user || user.role !== 'BASIC') return

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
  }, [token, user])

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

  const handleLogin = (userData: AuthUser, userToken: string) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('met_token', userToken)
    localStorage.setItem('met_user_role', userData.role)
    localStorage.setItem('met_currency', userData.preferredCurrency || 'USD')
  }

  if (loading) {
    return <div className="fixed inset-0 bg-background flex items-center justify-center">
      <Wallet size={48} className="animate-pulse text-primary" />
    </div>
  }

  return (
    <Router>
      <div className="min-h-screen overflow-x-hidden bg-muted/40 font-sans antialiased">
        {!token ? (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<AuthPage onLogin={handleLogin} />} />
                <Route path="*" element={<NotFoundPage isAuthenticated={false} />} />
              </Routes>
            </div>
            <AppFooter />
          </div>
        ) : (
          <div className="min-h-screen">
            <Sidebar
              user={user}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
            <div className={`flex min-h-screen min-w-0 flex-col ${isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-64'}`}>
              <Header user={user} onLogout={handleLogout} />
              <main className="flex-1 min-w-0 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
                <Suspense fallback={<PageLoader />}>
                  <AnimatePresence mode="wait">
                    <Routes>
                      <Route path="/" element={<Dashboard isSidebarCollapsed={isSidebarCollapsed} userRole={user?.role || 'BASIC'} />} />
                      <Route path="/transactions" element={<TransactionsPage userRole={user?.role || 'BASIC'} />} />
                      <Route path="/categories" element={<CategoriesPage userRole={user?.role || 'BASIC'} />} />
                      <Route path="/settings" element={<SettingsPage user={user} onUserUpdate={setUser} themeMode={themeMode} onThemeModeChange={setThemeMode} />} />
                      <Route path="/admin" element={user?.role === 'ADMIN' ? <AdminPage /> : <NotFoundPage isAuthenticated />} />
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
      <PremiumComparisonModal
        isOpen={showPremiumOfferModal}
        title="Premium opcija"
        subtitle="Kako aktivno koristiš platformu, ovo je pregled šta dobijaš sa Premium planom."
        ctaLabel="Idi na Premium opciju"
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
  onToggle
}: {
  user: AuthUser | null
  isCollapsed: boolean
  onToggle: () => void
}) {
  const location = useLocation()
  const navItems = baseNavItems.filter((item) => !item.adminOnly || user?.role === 'ADMIN')
  
  return (
    <aside className={`hidden lg:flex flex-col border-r bg-background fixed top-0 left-0 h-screen z-40 transition-[width] duration-200 ease-out will-change-[width] ${isCollapsed ? 'w-24' : 'w-64'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="absolute -right-5 top-1/2 -translate-y-1/2 z-50 h-11 w-11 rounded-full border bg-background shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
      <div className={`flex items-center h-20 px-6 border-b ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="p-2.5 bg-gradient-to-tr from-[#a569b0] to-[#6a4d8b] rounded-xl text-white shadow-lg shadow-[#a569b0]/25">
          <Wallet size={24} />
        </div>
        {!isCollapsed && <span className="text-2xl font-black tracking-tighter">MET</span>}
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            title={item.label}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all duration-200 ${
              location.pathname === item.path
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            <item.icon size={20} />
            {!isCollapsed && item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

interface HeaderProps {
  user: AuthUser | null
  onLogout: () => void
}

function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-background/80 backdrop-blur-lg px-6">
       <div className="flex-1">
         {/* Can add breadcrumbs or page title here */}
       </div>
       <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-foreground">{user?.name || 'User'}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
          <motion.button 
            onClick={onLogout}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-primary/15 text-primary hover:bg-primary/25 transition-colors border border-primary/25"
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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 overflow-hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className={`grid px-2 py-2 ${navItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl min-h-11 px-1 py-2 text-[10px] font-semibold transition-colors ${
              location.pathname === item.path
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
    <footer className="mt-auto border-t-2 border-[#dc89e1]/35 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-[#fce3f7]/70 via-background to-[#ff9eff]/20 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#a569b0] to-[#6a4d8b] text-white shadow-sm">
                  <Wallet size={17} />
                </div>
                <p className="text-sm font-black tracking-tight text-foreground">MET Finance Tracker</p>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Copyright © 2026 MET. Crafted with AI assistance (OpenAI, Gemini, Claude).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3 sm:gap-3 sm:text-sm">
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-muted-foreground">
                <ShieldCheck size={15} className="text-primary" />
                <span>Secure by design</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-muted-foreground">
                <Smartphone size={15} className="text-primary" />
                <span>Mobile optimized</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-muted-foreground">
                <Sparkles size={15} className="text-primary" />
                <span>Modern UI experience</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default App
