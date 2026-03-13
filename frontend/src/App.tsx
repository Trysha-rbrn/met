import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Sun, Moon, Wallet, Settings, LayoutDashboard, Github, Linkedin, Cpu } from 'lucide-react'
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
      <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col">
        {/* Header */}
        <nav className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
                <Wallet size={24} />
              </div>
              <span className="text-xl font-black tracking-tighter">MET</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-colors">
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
              <Link to="/categories" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-colors">
                <Settings size={18} />
                Categories
              </Link>
            </div>
          </div>
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600 dark:text-slate-400" />}
          </button>
        </nav>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-6 flex-grow w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/categories" element={<CategoriesPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tighter">MET - Micro Economics Tool</span>
                <span className="text-xs text-slate-400 font-medium">© Since 2026</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                Built with <Cpu size={12} className="text-blue-500" /> <span className="font-bold">Gemini AI Technology</span>
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Author</span>
              <span className="text-sm font-bold">Trysha-rbrn</span>
            </div>

            <div className="flex items-center gap-4">
              <a 
                href="https://github.com/Trysha-rbrn" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 transition-all border border-slate-200 dark:border-slate-700"
              >
                <Github size={20} />
              </a>
              <a 
                href="https://linkedin.com/in/YOUR_LINKEDIN_HERE" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 transition-all border border-slate-200 dark:border-slate-700"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
