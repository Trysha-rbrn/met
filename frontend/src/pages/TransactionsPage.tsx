import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Download, Edit2, FileUp, Plus, Tag, Trash2, WalletCards } from 'lucide-react'
import ExcelJS from 'exceljs/dist/exceljs.min.js'
import type { CellValue } from 'exceljs'
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState(20)

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
      setVisibleCount(20)
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

  const displayedTransactions = useMemo(
    () => transactions.slice(0, visibleCount),
    [transactions, visibleCount]
  )

  const hasMoreTransactions = displayedTransactions.length < transactions.length

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || loading || !hasMoreTransactions) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        setLoadingMore(true)
        window.setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + 20, transactions.length))
          setLoadingMore(false)
        }, 120)
      },
      { root: null, rootMargin: '320px 0px', threshold: 0.01 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMoreTransactions, loading, transactions.length])

  const exportExcel = async () => {
    if (!transactions.length) {
      notify.info('No transactions to export.')
      return
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Transactions')
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Account', key: 'account', width: 20 },
      { header: 'Description', key: 'description', width: 32 },
      { header: 'Amount', key: 'amount', width: 14 }
    ]

    transactions.forEach((tx) => {
      worksheet.addRow({
        date: new Date(tx.date).toISOString().slice(0, 10),
        type: tx.type,
        category: tx.category?.name || '',
        account: tx.account?.name || '',
        description: tx.description || '',
        amount: tx.amount
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `transactions-${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    try {
      await dataTransferApi.createTransferLog({ action: 'EXPORT', format: 'EXCEL', rows: transactions.length })
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

  const parseTransactionTypeFromAmount = (amount: number): 'INCOME' | 'EXPENSE' | null => {
    if (amount > 0) return 'INCOME'
    if (amount < 0) return 'EXPENSE'
    return null
  }

  const isValidImportDate = (value: string) => {
    if (!value) return false
    const date = new Date(value)
    return !Number.isNaN(date.getTime())
  }

  const parseImportedAmount = (value: string): number | null => {
    const raw = value.trim()
    if (!raw) return null

    const normalized = raw
      .replace(/\s+/g, '')
      .replace(/[A-Za-z\u00C0-\u024F]/g, '')
      .replace(/[^\d,.\-+()]/g, '')

    if (!normalized) return null

    const hasComma = normalized.includes(',')
    const hasDot = normalized.includes('.')
    let numeric = normalized

    if (hasComma && hasDot) {
      // Balkan/European style: 1.234,56
      numeric = numeric.replace(/\./g, '').replace(',', '.')
    } else if (hasComma) {
      numeric = numeric.replace(',', '.')
    }

    const parsed = Number(numeric)
    if (!Number.isFinite(parsed)) return null
    return parsed
  }

  const parseImportedDate = (value: string): string | null => {
    const raw = value.trim()
    if (!raw) return null

    const dmY = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (dmY) {
      const day = Number(dmY[1])
      const month = Number(dmY[2])
      const year = Number(dmY[3])
      const date = new Date(year, month - 1, day)
      if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
      return null
    }

    if (!isValidImportDate(raw)) return null
    return new Date(raw).toISOString().slice(0, 10)
  }

  const pickAutoCategory = (
    type: 'INCOME' | 'EXPENSE',
    description: string,
    categoryName: string,
    flatCategories: Array<{ id: string; name: string; type: 'INCOME' | 'EXPENSE' }>
  ) => {
    const byType = flatCategories.filter((c) => c.type === type)
    if (!byType.length) return null

    const normalizedCategory = categoryName.toLowerCase()
    const exactCategory = normalizedCategory
      ? byType.find((c) => c.name.toLowerCase() === normalizedCategory)
      : null
    if (exactCategory) return exactCategory

    const normalizedDescription = description.toLowerCase()
    if (normalizedDescription) {
      const keywordCategoryMap: Array<{ keywords: string[]; categoryHints: string[] }> = [
        { keywords: ['salary', 'payroll', 'wage'], categoryHints: ['salary'] },
        { keywords: ['bonus'], categoryHints: ['bonus'] },
        { keywords: ['rent', 'apartment'], categoryHints: ['rent'] },
        { keywords: ['market', 'grocery', 'supermarket'], categoryHints: ['groceries'] },
        { keywords: ['bus', 'taxi', 'fuel', 'gas'], categoryHints: ['transport'] },
        { keywords: ['movie', 'netflix', 'game', 'cinema'], categoryHints: ['entertainment'] }
      ]

      for (const mapEntry of keywordCategoryMap) {
        if (!mapEntry.keywords.some((keyword) => normalizedDescription.includes(keyword))) continue
        const hinted = byType.find((c) =>
          mapEntry.categoryHints.some((hint) => c.name.toLowerCase().includes(hint))
        )
        if (hinted) return hinted
      }
    }

    return byType[0]
  }

  const isImportedTransaction = (transaction: Transaction) => {
    if (!transaction.metadata || typeof transaction.metadata !== 'object') return false
    const importedValue = (transaction.metadata as Record<string, unknown>).imported
    return importedValue === true
  }

  const normalizeExcelCell = (value: CellValue) => {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    if (typeof value === 'object' && value !== null) {
      if ('text' in value && typeof value.text === 'string') return value.text
      if ('result' in value && typeof value.result !== 'undefined') return String(value.result)
    }
    return String(value ?? '').trim()
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(arrayBuffer)
      const sheet = workbook.worksheets[0]
      if (!sheet) {
        notify.warning('Excel file has no sheets.')
        return
      }

      const headerRow = sheet.getRow(1)
      const headerIndexMap = new Map<string, number>()
      headerRow.eachCell((cell, colNumber) => {
        const key = normalizeExcelCell(cell.value).toLowerCase()
        if (key) headerIndexMap.set(key, colNumber)
      })

      const headerAliases = {
        date: ['date', 'datum'],
        amount: ['amount', 'iznos', 'value', 'vrednost'],
        category: ['category', 'kategorija'],
        description: ['description', 'opis', 'note', 'details']
      }

      const hasAnyHeader = (aliases: string[]) => aliases.some((alias) => headerIndexMap.has(alias))
      const requiredHeaders = ['date', 'amount'] as const
      const hasRequiredHeaders = requiredHeaders.every((key) => hasAnyHeader(headerAliases[key]))
      if (!hasRequiredHeaders) {
        notify.warning('Excel format invalid. Required headers: Date/Datum, Amount/Iznos.')
        return
      }

      if (sheet.rowCount < 2) {
        notify.warning('Excel file has no rows.')
        return
      }

      const categories = await categoriesApi.getCategories()
      const flatCategories = categories.flatMap((cat) => [cat, ...(cat.subcategories || [])])
      let importedCount = 0
      let skippedCount = 0

      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
        const row = sheet.getRow(rowNumber)
        const getValueByAliases = (aliases: string[]) => {
          for (const alias of aliases) {
            const col = headerIndexMap.get(alias)
            if (!col) continue
            return normalizeExcelCell(row.getCell(col).value)
          }
          return ''
        }

        const rawAmountValue = getValueByAliases(headerAliases.amount)
        const rawAmount = parseImportedAmount(rawAmountValue)
        const type = typeof rawAmount === 'number' ? parseTransactionTypeFromAmount(rawAmount) : null
        const categoryName = getValueByAliases(headerAliases.category)
        const description = getValueByAliases(headerAliases.description)
        const dateValue = getValueByAliases(headerAliases.date)
        const parsedDate = parseImportedDate(dateValue)

        if (rawAmount === null || !type || !parsedDate) {
          skippedCount += 1
          continue
        }

        const category = pickAutoCategory(type, description, categoryName, flatCategories)
        if (!category) {
          skippedCount += 1
          continue
        }

        await api.createTransaction({
          amount: Math.abs(rawAmount).toString(),
          description,
          date: parsedDate,
          type,
          categoryId: category.id,
          accountId: selectedAccountId,
          metadata: {
            imported: true,
            importSource: file.name
          }
        })
        importedCount += 1
      }

      await fetchTransactions(selectedAccountId)

      try {
        await dataTransferApi.createTransferLog({ action: 'IMPORT', format: 'EXCEL', rows: importedCount })
      } catch {
        // logging should not block import UX
      }

      notify.success(`Excel import completed. Imported ${importedCount} transaction(s), skipped ${skippedCount}.`)
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
              accept=".xlsx"
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
              ) : displayedTransactions.length > 0 ? displayedTransactions.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  formatCurrency={formatCurrency}
                  isImported={isImportedTransaction(t)}
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
          ) : displayedTransactions.length > 0 ? displayedTransactions.map((t) => (
            <MobileTransactionCard
              key={t.id}
              transaction={t}
              formatCurrency={formatCurrency}
              isImported={isImportedTransaction(t)}
              onEdit={() => { setSelectedTransaction(t); setIsModalOpen(true) }}
              onDelete={() => handleDelete(t.id)}
            />
          )) : (
            <p className="text-center text-sm text-muted-foreground italic py-8">
              No transactions yet for this account. Add your first one.
            </p>
          )}
        </div>
        {!loading && (
          <div className="px-4 pb-4 pt-2 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Showing {displayedTransactions.length} of {transactions.length} transactions
            </p>
            {hasMoreTransactions ? (
              <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  {loadingMore ? 'Loading older transactions...' : 'Scroll down to load older transactions'}
                </span>
              </div>
            ) : transactions.length > 20 ? (
              <span className="text-xs text-muted-foreground">All transactions loaded.</span>
            ) : null}
          </div>
        )}
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
  isImported,
  onEdit,
  onDelete
}: {
  transaction: Transaction
  formatCurrency: (value: number) => string
  isImported: boolean
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
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold">{t.description || 'Transaction'}</p>
          {isImported && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Tag size={11} />
              Imported
            </span>
          )}
        </div>
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
  isImported,
  onEdit,
  onDelete
}: {
  transaction: Transaction
  formatCurrency: (value: number) => string
  isImported: boolean
  onEdit: () => void
  onDelete: () => void
}) => (
  <div className="rounded-xl border bg-background p-4 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold truncate">{t.description || 'Transaction'}</p>
          {isImported && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <Tag size={10} />
              Imported
            </span>
          )}
        </div>
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
