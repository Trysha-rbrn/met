import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Sun, Moon, Wallet, Settings, LayoutDashboard } from 'lucide-react'
import CategoriesPage from './pages/CategoriesPage'
import Dashboard from './pages/Dashboard'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <Router>
      <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        {/* Header */}
        <nav className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                <Wallet size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight">MET</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
              <Link to="/categories" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                <Settings size={18} />
                Categories
              </Link>
            </div>
          </div>
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600 dark:text-slate-400" />}
          </button>
        </nav>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/categories" element={<CategoriesPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
