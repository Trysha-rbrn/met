import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Edit2, Plus, Trash2, WalletCards } from 'lucide-react'
import * as api from '../api/transactionsApi'
import * as accountsApi from '../api/accountsApi'
import type { Transaction, TransactionPayload } from '../api/transactionsApi'
import type { Account } from '../api/accountsApi'
import TransactionModal from '../components/TransactionModal'

const MAX_ACCOUNTS = 3

function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  const currencyCode = localStorage.getItem('met_currency') || 'USD'

  useEffect(() => {
    void initialize()
  }, [])

  useEffect(() => {
    if (!selectedAccountId) return
    localStorage.setItem('met_account_id', selectedAccountId)
    void fetchTransactions(selectedAccountId)
  }, [selectedAccountId])

  const initialize = async () => {
    try {
      setLoading(true)
      const fetchedAccounts = await accountsApi.getAccounts()
      setAccounts(fetchedAccounts)

      const storedId = localStorage.getItem('met_account_id')
      const defaultAccountId = fetchedAccounts.find((acc) => acc.id === storedId)?.id || fetchedAccounts[0]?.id || ''
      setSelectedAccountId(defaultAccountId)

      if (defaultAccountId) {
        const txs = await api.getTransactions(defaultAccountId)
        setTransactions(txs)
      }
    } catch (error) {
      console.error('Error initializing transactions page:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (accountId: string) => {
    try {
      setLoading(true)
      const data = await api.getTransactions(accountId)
      setTransactions(data)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    if (accounts.length >= MAX_ACCOUNTS) {
      alert('Maximum 3 accounts allowed.')
      return
    }

    const suggestedNames = ['Primary', 'Savings', 'Reserve']
    const suggestedName = suggestedNames[accounts.length] || `Account ${accounts.length + 1}`
    const input = window.prompt('Enter account name', suggestedName)
    if (input === null) return

    const name = input.trim() || suggestedName

    try {
      const created = await accountsApi.createAccount(name)
      const updatedAccounts = [...accounts, created]
      setAccounts(updatedAccounts)
      setSelectedAccountId(created.id)
    } catch (error: unknown) {
      const fallback = 'Failed to create account.'
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { error?: string } } }).response
        alert(response?.data?.error || fallback)
      } else {
        alert(fallback)
      }
    }
  }

  const handleSaveTransaction = async (data: TransactionPayload) => {
    try {
      const payload = {
        ...data,
        accountId: data.accountId || selectedAccountId
      }

      if (selectedTransaction) {
        await api.updateTransaction(selectedTransaction.id, payload)
      } else {
        await api.createTransaction(payload)
      }
      await fetchTransactions(selectedAccountId)
    } catch (error) {
      console.error('Error saving transaction:', error)
      throw error
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      await api.deleteTransaction(id)
      await fetchTransactions(selectedAccountId)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(val)
  }

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <header className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">Transactions</h1>
            <p className="text-muted-foreground font-medium">All your income and expense records for selected account.</p>
          </div>
          <motion.button
            onClick={() => { setSelectedTransaction(null); setIsModalOpen(true) }}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!selectedAccountId}
          >
            <Plus size={20} />
            New Transaction
          </motion.button>
        </div>

        <div className="bg-card border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <WalletCards size={16} />
            Active account
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <select
              id="transactions-account"
              name="accountId"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="min-w-52 px-4 py-2.5 border rounded-xl bg-background"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCreateAccount}
              className="px-4 py-2.5 rounded-xl border font-semibold hover:bg-muted transition-colors"
              disabled={accounts.length >= MAX_ACCOUNTS}
            >
              {accounts.length >= MAX_ACCOUNTS ? 'Account limit reached' : 'Create Account'}
            </button>
          </div>
        </div>
      </header>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b bg-muted/30 text-sm font-semibold text-muted-foreground">
          {selectedAccount ? `Showing transactions for ${selectedAccount.name}` : 'No account selected'}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody className="divide-y">
              {loading ? (
                [...Array(6)].map((_, i) => <TransactionSkeleton key={i} />)
              ) : transactions.length > 0 ? transactions.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  formatCurrency={formatCurrency}
                  onEdit={() => { setSelectedTransaction(t); setIsModalOpen(true) }}
                  onDelete={() => handleDelete(t.id)}
                />
              )) : (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-muted-foreground italic">
                    No transactions yet for this account. Add your first one.
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
        accounts={accounts}
        defaultAccountId={selectedAccountId}
      />
    </motion.div>
  )
}

const TransactionRow = ({
  transaction: t,
  formatCurrency,
  onEdit,
  onDelete
}: {
  transaction: Transaction
  formatCurrency: (value: number) => string
  onEdit: () => void
  onDelete: () => void
}) => (
  <tr className="hover:bg-muted/50 transition-colors group">
    <td className="p-4 md:p-6 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
      }`}>
        {t.type === 'INCOME' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
      </div>
      <div>
        <p className="font-bold">{t.description || 'Transaction'}</p>
        <p className="text-sm text-muted-foreground">{t.category?.name || 'Uncategorized'} - {t.account?.name || 'No account'}</p>
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

export default TransactionsPage
