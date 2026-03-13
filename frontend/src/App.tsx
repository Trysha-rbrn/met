import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { Sun, Moon, Wallet, Settings, LayoutDashboard, Github, Linkedin, Cpu, LogOut, User } from 'lucide-react'
import CategoriesPage from './pages/CategoriesPage'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('met_theme') === 'dark')
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
    const checkUser = async () => {
      const storedToken = localStorage.getItem('met_token')
      if (storedToken) {
        try {
          // Verify token and get user data
          // const userData = await authApi.getMe()
          // setUser(userData)
          setUser({ name: localStorage.getItem('met_user_name') || 'User' })
        } catch (err) {
          handleLogout()
        }
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  const handleLogin = (userData: any, userToken: string) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('met_token', userToken)
    localStorage.setItem('met_user_name', userData.name || 'User')
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('met_token')
    localStorage.removeItem('met_user_name')
  }

  if (loading) return null

  return (
    <Router>
      <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 flex flex-col">
        {!token ? (
          <AuthPage onLogin={handleLogin} />
        ) : (
          <>
            {/* Header */}
            <nav className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-8">
                <Link to="/" className="flex items-center gap-2 group">
                  <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-transform">
                    <Wallet size={24} />
                  </div>
                  <span className="text-xl font-black tracking-tighter">MET</span>
                </Link>
                
                <div className="hidden md:flex items-center gap-6">
                  <Link to="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-all hover:translate-y-[-1px]">
                    <LayoutDashboard size={18} />
                    Dashboard
                  </Link>
                  <Link to="/categories" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-all hover:translate-y-[-1px]">
                    <Settings size={18} />
                    Categories
                  </Link>
                  <Link to="/settings" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-all hover:translate-y-[-1px]">
                    <User size={18} />
                    Settings
                  </Link>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
                </button>

                <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

                <div className="flex items-center gap-3 pl-2">
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Session</span>
                    <span className="text-sm font-bold">{user?.name || 'User'}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all border border-rose-100 dark:border-rose-800/50"
                    title="Logout"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto p-6 flex-grow w-full">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </>
        )}

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tighter bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">MET - Micro Economics Tool</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                Professional Financial Management
              </p>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                <Cpu size={14} className="text-blue-500" /> Built with <span className="font-black text-slate-600 dark:text-slate-300">Gemini AI Technology</span>
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 group transition-all hover:border-blue-500/50">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <User size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Developed by</span>
                  <span className="text-sm font-black">Trysha-rbrn</span>
                </div>
              </div>
              <span className="text-[10px] font-black text-slate-400 tracking-[0.3em]">© SINCE 2026</span>
            </div>

            <div className="flex items-center justify-center md:justify-end gap-4">
              <a 
                href="https://github.com/Trysha-rbrn" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:shadow-blue-500/10"
              >
                <Github size={22} />
              </a>
              <a 
                href="https://linkedin.com/in/YOUR_LINKEDIN_HERE" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:shadow-blue-500/10"
              >
                <Linkedin size={22} />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
