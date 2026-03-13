import { useState, useEffect } from 'react'
import { Sun, Moon, DollarSign, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react'

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
    <div className="min-h-screen font-sans">
      {/* Header */}
      <nav className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Wallet size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">MET</span>
        </div>
        
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
        </button>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome to <span className="text-blue-600">MET</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Your personal micro economics tool for tracking inflows and outflows.
          </p>
        </header>

        {/* Stats Cards Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            title="Total Balance" 
            amount="$0.00" 
            icon={<DollarSign size={24} />} 
            color="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
          />
          <Card 
            title="Total Income" 
            amount="$0.00" 
            icon={<ArrowUpCircle size={24} />} 
            color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
          />
          <Card 
            title="Total Expenses" 
            amount="$0.00" 
            icon={<ArrowDownCircle size={24} />} 
            color="bg-rose-100 text-rose-600 dark:bg-rose-900/30"
          />
        </div>

        {/* Feature List Preview */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
          <h2 className="text-2xl font-bold">What's coming next?</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FeatureItem text="Secure Registration & Login" />
            <FeatureItem text="Transaction Categories" />
            <FeatureItem text="Interactive Spending Charts" />
            <FeatureItem text="Detailed Monthly Reports" />
          </ul>
        </section>
      </main>
    </div>
  )
}

function Card({ title, amount, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <span className="text-slate-500 dark:text-slate-400 font-medium">{title}</span>
        <div className={`p-2 rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold">{amount}</div>
    </div>
  )
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-blue-600" />
      <span className="text-slate-600 dark:text-slate-300">{text}</span>
    </li>
  )
}

export default App
