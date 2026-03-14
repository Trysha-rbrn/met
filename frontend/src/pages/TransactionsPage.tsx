import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Download, Edit2, FileUp, Plus, Trash2, WalletCards } from 'lucide-react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as api from '../api/transactionsApi'
import * as accountsApi from '../api/accountsApi'
import * as categoriesApi from '../api/categoriesApi'
import * as dataTransferApi from '../api/dataTransferApi'
import type { Transaction, TransactionPayload } from '../api/transactionsApi'
import type { Account } from '../api/accountsApi'
import TransactionModal from '../components/TransactionModal'
import { extractApiError, notify } from '../lib/toast'
import { renderCategoryIcon } from '../lib/categoryIcons'

const MAX_ACCOUNTS = 3

function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

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
      notify.error('Failed to load transactions.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    if (accounts.length >= MAX_ACCOUNTS) {
      notify.warning('Maximum 3 accounts allowed.')
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
      notify.error(extractApiError(error, 'Failed to create account.'))
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
        notify.success('Transaction updated.')
      } else {
        await api.createTransaction(payload)
        notify.success('Transaction created.')
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
      notify.success('Transaction deleted.')
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

  const exportExcel = async () => {
    if (!transactions.length) {
      notify.info('No transactions to export.')
      return
    }

    const rows = transactions.map((tx) => ({
      Date: new Date(tx.date).toLocaleDateString(),
      Type: tx.type,
      Category: tx.category?.name || '',
      Account: tx.account?.name || '',
      Description: tx.description || '',
      Amount: tx.amount
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')
    XLSX.writeFile(workbook, `transactions-${new Date().toISOString().slice(0, 10)}.xlsx`)

    try {
      await dataTransferApi.createTransferLog({ action: 'EXPORT', format: 'EXCEL', rows: rows.length })
    } catch {
      // logging should not block export UX
    }

    notify.success('Excel export completed.')
  }

  const exportPdf = async () => {
    if (!transactions.length) {
      notify.info('No transactions to export.')
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Transactions Export', 14, 14)

    autoTable(doc, {
      startY: 22,
      head: [['Date', 'Type', 'Category', 'Account', 'Description', 'Amount']],
      body: transactions.map((tx) => [
        new Date(tx.date).toLocaleDateString(),
        tx.type,
        tx.category?.name || '',
        tx.account?.name || '',
        tx.description || '',
        tx.amount.toFixed(2)
      ])
    })

    doc.save(`transactions-${new Date().toISOString().slice(0, 10)}.pdf`)

    try {
      await dataTransferApi.createTransferLog({ action: 'EXPORT', format: 'PDF', rows: transactions.length })
    } catch {
      // logging should not block export UX
    }

    notify.success('PDF export completed.')
  }

  const handleImportExcelClick = () => {
    importInputRef.current?.click()
  }

  const parseTransactionType = (value: unknown): 'INCOME' | 'EXPENSE' | null => {
    const normalized = String(value || '').trim().toUpperCase()
    if (normalized === 'INCOME' || normalized === 'EXPENSE') return normalized
    return null
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheet = workbook.SheetNames[0]
      const sheet = workbook.Sheets[firstSheet]
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

      if (!rawRows.length) {
        notify.warning('Excel file has no rows.')
        return
      }

      const categories = await categoriesApi.getCategories()
      const flatCategories = categories.flatMap((cat) => [cat, ...(cat.subcategories || [])])
      let importedCount = 0

      for (const row of rawRows) {
        const amount = Number(row.Amount ?? row.amount ?? row.Value ?? row.value)
        const type = parseTransactionType(row.Type ?? row.type)
        const categoryName = String(row.Category ?? row.category ?? '').trim()
        const description = String(row.Description ?? row.description ?? '').trim()
        const dateValue = String(row.Date ?? row.date ?? '').trim()

        if (!Number.isFinite(amount) || amount <= 0 || !type || !categoryName) {
          continue
        }

        const category = flatCategories.find(
          (c) => c.type === type && c.name.toLowerCase() === categoryName.toLowerCase()
        )
        if (!category) continue

        await api.createTransaction({
          amount: amount.toString(),
          description,
          date: dateValue || new Date().toISOString().slice(0, 10),
          type,
          categoryId: category.id,
          accountId: selectedAccountId
        })
        importedCount += 1
      }

      await fetchTransactions(selectedAccountId)

      try {
        await dataTransferApi.createTransferLog({ action: 'IMPORT', format: 'EXCEL', rows: importedCount })
      } catch {
        // logging should not block import UX
      }

      notify.success(`Excel import completed. Imported ${importedCount} transaction(s).`)
    } catch (error) {
      notify.error(extractApiError(error, 'Failed to import Excel file.'))
    } finally {
      e.target.value = ''
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 sm:space-y-8"
    >
      <header className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">Transactions</h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium">All your income and expense records for selected account.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={exportExcel}
              className="min-h-11 px-4 py-2.5 rounded-xl border font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted"
            >
              <Download size={16} />
              Export Excel
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="min-h-11 px-4 py-2.5 rounded-xl border font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted"
            >
              <Download size={16} />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleImportExcelClick}
              className="min-h-11 px-4 py-2.5 rounded-xl border font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted"
            >
              <FileUp size={16} />
              Import Excel
            </button>
            <motion.button
              onClick={() => { setSelectedTransaction(null); setIsModalOpen(true) }}
              className="sm:col-span-3 min-h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!selectedAccountId}
            >
              <Plus size={20} />
              New Transaction
            </motion.button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportExcel}
            />
          </div>
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
              className="w-full sm:min-w-52 min-h-11 px-4 py-2.5 border rounded-xl bg-background"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCreateAccount}
              className="w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-xl border font-semibold hover:bg-muted transition-colors"
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
        <div className="hidden md:block overflow-x-auto">
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
        <div className="md:hidden p-3 space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => <MobileTransactionSkeleton key={i} />)
          ) : transactions.length > 0 ? transactions.map((t) => (
            <MobileTransactionCard
              key={t.id}
              transaction={t}
              formatCurrency={formatCurrency}
              onEdit={() => { setSelectedTransaction(t); setIsModalOpen(true) }}
              onDelete={() => handleDelete(t.id)}
            />
          )) : (
            <p className="text-center text-sm text-muted-foreground italic py-8">
              No transactions yet for this account. Add your first one.
            </p>
          )}
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
        <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <CategoryBadge icon={t.category?.icon} name={t.category?.name || 'Uncategorized'} />
          <span>-</span>
          <span>{t.account?.name || 'No account'}</span>
        </p>
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

const MobileTransactionCard = ({
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
  <div className="rounded-xl border bg-background p-4 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-bold truncate">{t.description || 'Transaction'}</p>
        <p className="text-xs text-muted-foreground truncate inline-flex items-center gap-2">
          <CategoryBadge icon={t.category?.icon} name={t.category?.name || 'Uncategorized'} />
          <span>-</span>
          <span>{t.account?.name || 'No account'}</span>
        </p>
      </div>
      <div className={`text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
      </div>
    </div>
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</p>
      <div className="flex items-center gap-2">
        <button onClick={onEdit} className="h-11 w-11 rounded-lg border text-muted-foreground hover:text-foreground flex items-center justify-center">
          <Edit2 size={15} />
        </button>
        <button onClick={onDelete} className="h-11 w-11 rounded-lg border text-muted-foreground hover:text-destructive flex items-center justify-center">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  </div>
)

const CategoryBadge = ({ icon, name }: { icon?: string; name: string }) => {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-4 w-4 rounded-full bg-muted inline-flex items-center justify-center">
        {renderCategoryIcon(icon, 10)}
      </span>
      <span>{name}</span>
    </span>
  )
}

const MobileTransactionSkeleton = () => (
  <div className="rounded-xl border p-4 space-y-3 animate-pulse">
    <div className="h-4 w-1/2 bg-muted rounded" />
    <div className="h-3 w-2/3 bg-muted rounded" />
    <div className="h-3 w-1/3 bg-muted rounded" />
  </div>
)

export default TransactionsPage
