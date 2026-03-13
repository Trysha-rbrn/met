import { useState, useEffect } from 'react'
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Plus, Search, Filter, Edit2, Trash2 } from 'lucide-react'
import * as api from '../api/transactionsApi'
import TransactionModal from '../components/TransactionModal'

interface Transaction {
  id: string
  amount: number
  description: string | null
  date: string
  type: 'INCOME' | 'EXPENSE'
  category: {
    name: string
  }
}

function Dashboard() {
  const [summary, setSummary] = useState({ totalBalance: 0, totalIncome: 0, totalExpenses: 0 })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [summaryData, transactionsData] = await Promise.all([
        api.getSummary(),
        api.getTransactions()
      ])
      setSummary(summaryData)
      setTransactions(transactionsData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTransaction = async (data: any) => {
    try {
      if (selectedTransaction) {
        await api.updateTransaction(selectedTransaction.id, data)
      } else {
        await api.createTransaction(data)
      }
      fetchData()
    } catch (error) {
      console.error('Error saving transaction:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this transaction?')) {
      try {
        await api.deleteTransaction(id)
        fetchData()
      } catch (error) {
        console.error('Error deleting transaction:', error)
      }
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  if (loading && transactions.length === 0) return <div className="p-8 text-center">Loading dashboard...</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
            Welcome back, <span className="text-blue-600">Trysha-rbrn</span>. Here's your summary.
          </p>
        </div>
        <button 
          onClick={() => { setSelectedTransaction(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95"
        >
          <Plus size={20} />
          New Transaction
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          title="Total Balance" 
          amount={formatCurrency(summary.totalBalance)} 
          icon={<DollarSign size={24} />} 
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
          trend={summary.totalBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}
        />
        <Card 
          title="Total Income" 
          amount={formatCurrency(summary.totalIncome)} 
          icon={<ArrowUpCircle size={24} />} 
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
          trend="text-emerald-500"
        />
        <Card 
          title="Total Expenses" 
          amount={formatCurrency(summary.totalExpenses)} 
          icon={<ArrowDownCircle size={24} />} 
          color="bg-rose-100 text-rose-600 dark:bg-rose-900/30"
          trend="text-rose-500"
        />
      </div>

      {/* Transactions List */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Recent Transactions</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-blue-600 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.length > 0 ? transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {new Date(t.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">
                      {t.category.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    {t.description || '—'}
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setSelectedTransaction(t); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No transactions found. Add your first one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        initialData={selectedTransaction}
      />
    </div>
  )
}

function Card({ title, amount, icon, color, trend }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800">
      <div className="flex justify-between items-start mb-4">
        <span className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">{title}</span>
        <div className={`p-3 rounded-2xl ${color}`}>
          {icon}
        </div>
      </div>
      <div className={`text-3xl font-black ${trend}`}>{amount}</div>
    </div>
  )
}

export default Dashboard
