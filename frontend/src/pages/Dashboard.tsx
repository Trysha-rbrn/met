import { useState, useEffect } from 'react'
import { DollarSign, ArrowUp, ArrowDown, Plus, Edit2, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
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
  
  const currencyCode = localStorage.getItem('met_currency') || 'USD'

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
      throw error // Re-throw to show error in modal
    }
  }
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      await api.deleteTransaction(id)
      fetchData()
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currencyCode,
    }).format(val)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Dashboard</h1>
          <p className="text-muted-foreground font-medium">An overview of your financial health.</p>
        </div>
        <motion.button 
          onClick={() => { setSelectedTransaction(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={20} />
          New Transaction
        </motion.button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Balance" 
          amount={formatCurrency(summary.totalBalance)} 
          icon={DollarSign}
          color="text-blue-500"
        />
        <StatCard 
          title="Income" 
          amount={formatCurrency(summary.totalIncome)} 
          icon={ArrowUp}
          color="text-emerald-500"
        />
        <StatCard 
          title="Expenses" 
          amount={formatCurrency(summary.totalExpenses)} 
          icon={ArrowDown}
          color="text-rose-500"
        />
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody className="divide-y">
              {loading && transactions.length === 0 ? (
                 [...Array(3)].map((_, i) => <TransactionSkeleton key={i} />)
              ) : transactions.length > 0 ? transactions.map((t) => (
                <TransactionRow key={t.id} transaction={t} formatCurrency={formatCurrency} onEdit={() => { setSelectedTransaction(t); setIsModalOpen(true); }} onDelete={() => handleDelete(t.id)} />
              )) : (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-muted-foreground italic">
                    No transactions yet. Add your first one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        initialData={selectedTransaction}
      />
    </motion.div>
  )
}

const StatCard = ({ title, amount, icon: Icon, color }: any) => (
  <motion.div 
    className="bg-card border rounded-2xl p-6 flex flex-col justify-between gap-4 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
    whileHover={{ y: -5 }}
  >
    <div className="flex items-center justify-between text-muted-foreground">
      <span className="font-bold text-sm uppercase tracking-widest">{title}</span>
      <Icon size={24} className={color} />
    </div>
    <span className={`text-4xl font-black tracking-tighter ${color}`}>{amount}</span>
  </motion.div>
)

const TransactionRow = ({ transaction: t, formatCurrency, onEdit, onDelete }: any) => (
  <tr className="hover:bg-muted/50 transition-colors group">
    <td className="p-4 md:p-6 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
      }`}>
        {t.type === 'INCOME' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
      </div>
      <div>
        <p className="font-bold">{t.description || 'Transaction'}</p>
        <p className="text-sm text-muted-foreground">{t.category.name}</p>
      </div>
    </td>
    <td className="p-4 md:p-6 text-right">
      <p className={`font-bold text-lg ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
      </p>
      <p className="text-sm text-muted-foreground">{new Date(t.date).toLocaleDateString()}</p>
    </td>
    <td className="p-4 md:p-6 w-24">
      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-2 text-muted-foreground hover:text-foreground"><Edit2 size={16} /></button>
        <button onClick={onDelete} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
      </div>
    </td>
  </tr>
)

const TransactionSkeleton = () => (
  <tr className="animate-pulse">
    <td className="p-4 md:p-6 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-muted" />
      <div>
        <div className="h-4 w-32 bg-muted rounded-md" />
        <div className="h-3 w-20 bg-muted rounded-md mt-2" />
      </div>
    </td>
    <td className="p-4 md:p-6 text-right">
      <div className="h-6 w-24 bg-muted rounded-md ml-auto" />
      <div className="h-3 w-16 bg-muted rounded-md mt-2 ml-auto" />
    </td>
    <td className="p-4 md:p-6 w-24" />
  </tr>
)

export default Dashboard
