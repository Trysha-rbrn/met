import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { Sun, Moon, Wallet, Settings, LayoutDashboard, LogOut, User, BarChart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import CategoriesPage from './pages/CategoriesPage'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import SettingsPage from './pages/SettingsPage'
import * as authApi from './api/authApi'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: BarChart },
  { path: '/categories', label: 'Categories', icon: Settings },
  { path: '/settings', label: 'Settings', icon: User },
]

function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('met_theme') === 'dark')
  const [user, setUser] = useState<any>(null)
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

  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('met_token')
      if (storedToken) {
        try {
          const userData = await authApi.getMe()
          setUser(userData)
        } catch (err) {
          handleLogout()
        }
      }
      setLoading(false)
    }
    verifyUser()
  }, [token])

  const handleLogin = (userData: any, userToken: string) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('met_token', userToken)
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('met_token')
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
          <div className="flex">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Header user={user} onLogout={handleLogout} onToggleTheme={() => setDarkMode(!darkMode)} isDark={darkMode} />
              <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </AnimatePresence>
              </main>
            </div>
          </div>
        )}
      </div>
    </Router>
  )
}

function Sidebar() {
  const location = useLocation()
  
  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-background fixed h-full">
      <div className="flex items-center gap-3 h-20 px-6 border-b">
        <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
          <Wallet size={24} />
        </div>
        <span className="text-2xl font-black tracking-tighter">MET</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all duration-200 ${
              location.pathname === item.path
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

function Header({ user, onLogout, onToggleTheme, isDark }: any) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-background/80 backdrop-blur-lg px-6 lg:ml-64">
       <div className="flex-1">
         {/* Can add breadcrumbs or page title here */}
       </div>
       <div className="flex items-center gap-4">
        <motion.button 
          onClick={onToggleTheme}
          whileTap={{ scale: 0.9, rotate: 90 }}
          className="p-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.div key="sun" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}>
                <Sun size={20} className="text-yellow-400" />
              </motion.div>
            ) : (
              <motion.div key="moon" initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: -90 }}>
                <Moon size={20} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        <div className="h-8 w-px bg-border" />
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

export default App
