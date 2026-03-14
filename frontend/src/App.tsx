import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { Sun, Moon, Wallet, Settings, LayoutDashboard, LogOut, User, BarChart, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import CategoriesPage from './pages/CategoriesPage'
import Dashboard from './pages/Dashboard'
import TransactionsPage from './pages/TransactionsPage'
import AuthPage from './pages/AuthPage'
import SettingsPage from './pages/SettingsPage'
import * as authApi from './api/authApi'
import type { AuthUser } from './api/authApi'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: BarChart },
  { path: '/categories', label: 'Categories', icon: Settings },
  { path: '/settings', label: 'Settings', icon: User },
]

function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('met_theme') === 'dark')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('met_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('met_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('met_theme', 'light')
    }
  }, [darkMode])

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('met_token')
  }

  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('met_token')
      if (storedToken) {
        try {
          const userData = await authApi.getMe()
          setUser(userData)
        } catch {
          handleLogout()
        }
      }
      setLoading(false)
    }
    verifyUser()
  }, [token])

  const handleLogin = (userData: AuthUser, userToken: string) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('met_token', userToken)
  }

  if (loading) {
    return <div className="fixed inset-0 bg-background flex items-center justify-center">
      <Wallet size={48} className="animate-pulse text-blue-500" />
    </div>
  }

  return (
    <Router>
      <div className="min-h-screen bg-muted/40 font-sans antialiased">
        {!token ? (
          <AuthPage onLogin={handleLogin} />
        ) : (
          <div className="min-h-screen">
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onToggleTheme={() => setDarkMode(!darkMode)}
              isDark={darkMode}
            />
            <div className={`flex min-h-screen flex-col ${isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-64'}`}>
              <Header user={user} onLogout={handleLogout} onToggleTheme={() => setDarkMode(!darkMode)} isDark={darkMode} />
              <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<Dashboard isSidebarCollapsed={isSidebarCollapsed} />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </AnimatePresence>
              </main>
            </div>
            <MobileNav />
          </div>
        )}
      </div>
    </Router>
  )
}

function Sidebar({
  isCollapsed,
  onToggle,
  onToggleTheme,
  isDark
}: {
  isCollapsed: boolean
  onToggle: () => void
  onToggleTheme: () => void
  isDark: boolean
}) {
  const location = useLocation()
  
  return (
    <aside className={`hidden lg:flex flex-col border-r bg-background fixed top-0 left-0 h-screen z-40 transition-[width] duration-200 ease-out will-change-[width] ${isCollapsed ? 'w-24' : 'w-64'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="absolute -right-5 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full border bg-background shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
      <div className={`flex items-center h-20 px-6 border-b ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
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
      <div className={`border-t p-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <motion.button
          onClick={onToggleTheme}
          whileTap={{ scale: 0.9, rotate: 90 }}
          className={`rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${isCollapsed ? 'p-2.5' : 'w-full px-3 py-2.5 flex items-center gap-2'}`}
        >
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.div key="sun" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}>
                <Sun size={18} className="text-yellow-400" />
              </motion.div>
            ) : (
              <motion.div key="moon" initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: -90 }}>
                <Moon size={18} />
              </motion.div>
            )}
          </AnimatePresence>
          {!isCollapsed && <span className="text-sm font-semibold">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </motion.button>
      </div>
    </aside>
  )
}

interface HeaderProps {
  user: AuthUser | null
  onLogout: () => void
  onToggleTheme: () => void
  isDark: boolean
}

function Header({ user, onLogout, onToggleTheme, isDark }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-background/80 backdrop-blur-lg px-6">
       <div className="flex-1">
         {/* Can add breadcrumbs or page title here */}
       </div>
       <div className="flex items-center gap-4">
        <motion.button
          onClick={onToggleTheme}
          whileTap={{ scale: 0.9, rotate: 90 }}
          className="lg:hidden p-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
        </motion.button>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-foreground">{user?.name || 'User'}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
          <motion.button 
            onClick={onLogout}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <LogOut size={20} />
          </motion.button>
        </div>
       </div>
    </header>
  )
}

function MobileNav() {
  const location = useLocation()

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="grid grid-cols-4 px-2 py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
              location.pathname === item.path
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default App
