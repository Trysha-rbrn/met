import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, CheckSquare, Download, Edit2, FileUp, Plus, Search, Scissors, Tag, Trash2, WalletCards, Gem, Sparkles, ShieldCheck, BookmarkPlus, X, Repeat2 } from 'lucide-react'
import type { CellValue } from 'exceljs'
import * as api from '../api/transactionsApi'
import * as accountsApi from '../api/accountsApi'
import * as categoriesApi from '../api/categoriesApi'
import * as dataTransferApi from '../api/dataTransferApi'
import type { Category } from '../api/categoriesApi'
import type { RecurringTransaction, RecurringTransactionPayload, Transaction, TransactionPayload } from '../api/transactionsApi'
import type { Account } from '../api/accountsApi'
import RecurringTransactionsPanel from '../components/RecurringTransactionsPanel'
import TransactionModal from '../components/TransactionModal'
import { extractApiError, notify } from '../lib/toast'
import { renderCategoryIcon } from '../lib/categoryIcons'

type UserRole = 'BASIC' | 'PREMIUM' | 'ADMIN'
type SavedFilterType = 'ALL' | 'INCOME' | 'EXPENSE'

type SavedFilter = {
  id: string
  name: string
  searchTerm: string
  typeFilter: SavedFilterType
}

interface TransactionsPageProps {
  userRole: UserRole
}

function TransactionsPage({ userRole }: TransactionsPageProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [recurringLoading, setRecurringLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([])
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('')

  const currencyCode = localStorage.getItem('met_currency') || 'USD'
  const isPremiumUser = userRole === 'PREMIUM' || userRole === 'ADMIN'
  const maxAccounts = userRole === 'ADMIN' ? 20 : userRole === 'PREMIUM' ? 10 : 3
  const savedFiltersStorageKey = `met_saved_filters_${userRole.toLowerCase()}`

  useEffect(() => {
    if (!isPremiumUser) {
      setSavedFilters([])
      return
    }

    const raw = localStorage.getItem(savedFiltersStorageKey)
    if (!raw) {
      setSavedFilters([])
      return
    }

    try {
      const parsed = JSON.parse(raw) as SavedFilter[]
      setSavedFilters(Array.isArray(parsed) ? parsed : [])
    } catch {
      setSavedFilters([])
    }
  }, [isPremiumUser, savedFiltersStorageKey])

  useEffect(() => {
    if (!isPremiumUser) return
    localStorage.setItem(savedFiltersStorageKey, JSON.stringify(savedFilters))
  }, [isPremiumUser, savedFilters, savedFiltersStorageKey])

  useEffect(() => {
    if (!selectedAccountId) return
    localStorage.setItem('met_account_id', selectedAccountId)
    void fetchTransactions(selectedAccountId)
  }, [selectedAccountId])

  const fetchTransactions = async (accountId: string) => {
    try {
      setLoading(true)
      const data = await api.getTransactions(accountId)
      setTransactions(data)
      setSelectedTransactionIds([])
      setVisibleCount(20)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      notify.error('Failed to load transactions.')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecurringTransactions = useCallback(async () => {
    if (!isPremiumUser) {
      setRecurringTransactions([])
      return
    }

    try {
      setRecurringLoading(true)
      const data = await api.getRecurringTransactions()
      setRecurringTransactions(data)
    } catch (error) {
      console.error('Error fetching recurring transactions:', error)
      notify.error('Failed to load recurring templates.')
    } finally {
      setRecurringLoading(false)
    }
  }, [isPremiumUser])

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const [fetchedAccounts, fetchedCategories] = await Promise.all([
          accountsApi.getAccounts(),
          categoriesApi.getCategories()
        ])
        setAccounts(fetchedAccounts)
        setCategories(fetchedCategories)

        const storedId = localStorage.getItem('met_account_id')
        const defaultAccountId = fetchedAccounts.find((acc) => acc.id === storedId)?.id || fetchedAccounts[0]?.id || ''
        setSelectedAccountId(defaultAccountId)

        const tasks: Array<Promise<unknown>> = []

        if (defaultAccountId) {
          tasks.push(
            api.getTransactions(defaultAccountId).then((txs) => {
              setTransactions(txs)
            })
          )
        }

        if (isPremiumUser) {
          tasks.push(fetchRecurringTransactions())
        }

        await Promise.all(tasks)
      } catch (error) {
        console.error('Error initializing transactions page:', error)
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [fetchRecurringTransactions, isPremiumUser])

  const handleCreateAccount = async () => {
    if (accounts.length >= maxAccounts) {
      notify.warning(`Maximum ${maxAccounts} accounts allowed for ${userRole} plan.`)
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

  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactionIds((prev) => (
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    ))
  }

  const handleBulkAssignCategory = async () => {
    if (!bulkCategoryId) {
      notify.warning('Pick a target category first.')
      return
    }
    if (selectedTransactionIds.length === 0) {
      notify.warning('Select at least one transaction.')
      return
    }

    try {
      const result = await api.bulkAssignCategory(selectedTransactionIds, bulkCategoryId)
      notify.success(`Updated ${result.updatedCount} transaction(s).`)
      setSelectedTransactionIds([])
      await fetchTransactions(selectedAccountId)
    } catch (error) {
      notify.error(extractApiError(error, 'Bulk category update failed.'))
    }
  }

  const handleSplitTransaction = async (transaction: Transaction) => {
    const categoryOptions = categories
      .filter((entry) => entry.type === transaction.type)
      .map((entry) => `${entry.id}:${entry.name}`)
      .join(', ')
    const defaultCategory = transaction.category?.id || categories.find((entry) => entry.type === transaction.type)?.id
    const firstCategory = window.prompt(`Split #1 categoryId (${categoryOptions})`, defaultCategory || '')
    if (!firstCategory) return
    const firstAmountInput = window.prompt('Split #1 amount', (transaction.amount / 2).toFixed(2))
    if (!firstAmountInput) return
    const firstAmount = Number(firstAmountInput)
    if (!Number.isFinite(firstAmount) || firstAmount <= 0 || firstAmount >= transaction.amount) {
      notify.warning('First split amount is invalid.')
      return
    }
    const secondCategory = window.prompt(`Split #2 categoryId (${categoryOptions})`, defaultCategory || '')
    if (!secondCategory) return

    const secondAmount = Number((transaction.amount - firstAmount).toFixed(2))
    try {
      await api.splitTransaction(transaction.id, [
        { amount: firstAmount, categoryId: firstCategory.trim(), description: `${transaction.description || 'Split'} (1/2)` },
        { amount: secondAmount, categoryId: secondCategory.trim(), description: `${transaction.description || 'Split'} (2/2)` }
      ])
      notify.success('Transaction split completed.')
      await fetchTransactions(selectedAccountId)
    } catch (error) {
      notify.error(extractApiError(error, 'Split transaction failed.'))
    }
  }

  const handleCreateRecurringTransaction = async (data: RecurringTransactionPayload) => {
    try {
      await api.createRecurringTransaction(data)
      notify.success('Recurring template created.')
      await fetchRecurringTransactions()
    } catch (error) {
      notify.error(extractApiError(error, 'Failed to create recurring template.'))
      throw error
    }
  }

  const handleUpdateRecurringTransaction = async (id: string, data: Partial<RecurringTransactionPayload>) => {
    try {
      await api.updateRecurringTransaction(id, data)
      notify.success('Recurring template updated.')
      await fetchRecurringTransactions()
      if (selectedAccountId) {
        await fetchTransactions(selectedAccountId)
      }
    } catch (error) {
      notify.error(extractApiError(error, 'Failed to update recurring template.'))
      throw error
    }
  }

  const handleDeleteRecurringTransaction = async (id: string) => {
    if (!window.confirm('Delete this recurring template? Future due items will no longer be generated.')) return

    try {
      await api.deleteRecurringTransaction(id)
      notify.success('Recurring template deleted.')
      await fetchRecurringTransactions()
    } catch (error) {
      notify.error(extractApiError(error, 'Failed to delete recurring template.'))
      throw error
    }
  }

  const handleRunDueRecurringTransactions = async () => {
    try {
      const result = await api.runDueRecurringTransactions()
      if (result.createdCount === 0) {
        notify.info('No recurring items are due right now.')
      } else {
        notify.success(`Generated ${result.createdCount} recurring transaction(s).`)
      }

      await Promise.all([
        fetchRecurringTransactions(),
        selectedAccountId ? fetchTransactions(selectedAccountId) : Promise.resolve()
      ])
    } catch (error) {
      notify.error(extractApiError(error, 'Failed to run due recurring items.'))
      throw error
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

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return transactions.filter((t) => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false
      if (!normalizedSearch) return true
      const description = (t.description || '').toLowerCase()
      const categoryName = (t.category?.name || '').toLowerCase()
      const accountName = (t.account?.name || '').toLowerCase()
      return description.includes(normalizedSearch) || categoryName.includes(normalizedSearch) || accountName.includes(normalizedSearch)
    })
  }, [transactions, searchTerm, typeFilter])

  const activeSavedFilterId = useMemo(() => {
    const normalizedSearch = searchTerm.trim()
    return savedFilters.find((filter) => filter.searchTerm === normalizedSearch && filter.typeFilter === typeFilter)?.id || null
  }, [savedFilters, searchTerm, typeFilter])

  useEffect(() => {
    setVisibleCount(20)
  }, [searchTerm, typeFilter, selectedAccountId])

  const displayedTransactions = useMemo(
    () => filteredTransactions.slice(0, visibleCount),
    [filteredTransactions, visibleCount]
  )

  const hasMoreTransactions = displayedTransactions.length < filteredTransactions.length

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || loading || !hasMoreTransactions) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        setLoadingMore(true)
        window.setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + 20, filteredTransactions.length))
          setLoadingMore(false)
        }, 120)
      },
      { root: null, rootMargin: '320px 0px', threshold: 0.01 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [filteredTransactions.length, hasMoreTransactions, loading])

  const exportExcel = async () => {
    if (!transactions.length) {
      notify.info('No transactions to export.')
      return
    }
    try {
      const ExcelJS = await import('exceljs')
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
    } catch (error) {
      console.error('Excel export failed:', error)
      notify.error('Excel export failed. Please try again.')
    }
  }

  const exportPdf = async () => {
    if (!transactions.length) {
      notify.info('No transactions to export.')
      return
    }

    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ])
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

  const isRecurringTransaction = (transaction: Transaction) => {
    if (!transaction.metadata || typeof transaction.metadata !== 'object') return false
    const recurringValue = (transaction.metadata as Record<string, unknown>).recurring
    return recurringValue === true
  }

  const normalizeExcelCell = (value: CellValue) => {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    if (typeof value === 'object' && value !== null) {
      if ('text' in value && typeof value.text === 'string') return value.text
      if ('result' in value && typeof value.result !== 'undefined') return String(value.result)
    }
    return String(value ?? '').trim()
  }

  const handleImportExcel = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js')
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

  const handleSaveCurrentFilter = () => {
    if (!isPremiumUser) return

    const normalizedSearch = searchTerm.trim()
    if (!normalizedSearch && typeFilter === 'ALL') {
      notify.info('Apply a search term or type filter before saving a smart view.')
      return
    }

    const suggestedName = normalizedSearch
      ? normalizedSearch.slice(0, 32)
      : typeFilter === 'ALL'
        ? 'All transactions'
        : `${typeFilter.toLowerCase()} only`
    const input = window.prompt('Name this smart view', suggestedName)
    if (input === null) return

    const name = input.trim()
    if (!name) {
      notify.warning('Smart view name is required.')
      return
    }

    const nextFilter: SavedFilter = {
      id: `view_${Date.now()}`,
      name,
      searchTerm: normalizedSearch,
      typeFilter
    }

    setSavedFilters((prev) => [nextFilter, ...prev].slice(0, 8))
    notify.success('Smart view saved.')
  }

  const handleApplySavedFilter = (filter: SavedFilter) => {
    setSearchTerm(filter.searchTerm)
    setTypeFilter(filter.typeFilter)
    notify.info(`Applied "${filter.name}".`)
  }

  const handleDeleteSavedFilter = (filterId: string) => {
    setSavedFilters((prev) => prev.filter((filter) => filter.id !== filterId))
    notify.success('Smart view removed.')
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

        {isPremiumUser && (
        <section className="overflow-hidden rounded-[24px] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black tracking-[0.24em] text-amber-800">
                <Gem size={14} />
                PREMIUM FLOW
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Filter faster. Scan less. Find patterns sooner.
                </h2>
                <p className="max-w-2xl text-sm sm:text-base text-slate-600">
                  Advanced search and type filtering are active, with a higher account cap for segmented budgets and cleaner ledgers.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[30rem]">
              <PremiumSignal icon={Search} label="Search" value="Enabled" />
              <PremiumSignal icon={Sparkles} label="Type Filter" value="Advanced" />
              <PremiumSignal icon={WalletCards} label="Account Limit" value={String(maxAccounts)} />
              <PremiumSignal icon={ShieldCheck} label="Plan" value={userRole} />
            </div>
          </div>
        </section>
        )}

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
              disabled={accounts.length >= maxAccounts}
            >
              {accounts.length >= maxAccounts ? 'Account limit reached' : 'Create Account'}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Plan: <span className="font-semibold">{userRole}</span> • Account limit: {maxAccounts}
        </p>
        {isPremiumUser && (
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold">Bulk assign category</p>
                <p className="text-xs text-muted-foreground">Select transactions and update category in one action.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <select
                  value={bulkCategoryId}
                  onChange={(e) => setBulkCategoryId(e.target.value)}
                  className="w-full sm:min-w-60 min-h-11 rounded-xl border bg-background px-3"
                >
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.type} - {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkAssignCategory}
                  className="min-h-11 rounded-xl border px-4 font-semibold hover:bg-muted"
                >
                  <CheckSquare size={14} className="inline mr-1" />
                  Apply to {selectedTransactionIds.length}
                </button>
              </div>
            </div>
          </div>
        )}
        {isPremiumUser ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-[24px] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-amber-800">
                    <Gem size={13} />
                    PREMIUM FILTERS
                  </div>
                  <p className="text-sm font-semibold text-slate-800">Refine by text, category context and transaction type without leaving the ledger.</p>
                  <p className="text-xs text-slate-500">Search hits check description, category and account labels.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <label className="relative block w-full sm:min-w-80">
                    <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-700" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search description, category, account..."
                      className="w-full min-h-12 rounded-2xl border border-amber-200 bg-white/90 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-200/40"
                    />
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'INCOME' | 'EXPENSE')}
                    className="w-full sm:w-44 min-h-12 rounded-2xl border border-amber-200 bg-white/90 px-4 text-sm font-semibold shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-200/40"
                  >
                    <option value="ALL">All types</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border bg-card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-slate-700">
                    <BookmarkPlus size={13} />
                    SMART VIEWS
                  </div>
                  <p className="text-sm font-semibold text-slate-800">Save your current premium filter setup and reuse it instantly.</p>
                  <p className="text-xs text-slate-500">Best for recurring reviews like payroll, groceries or expense-only scans.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCurrentFilter}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                >
                  <BookmarkPlus size={15} />
                  Save Current View
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {savedFilters.length === 0 ? (
                  <p className="text-sm text-slate-500">No saved views yet. Build one with search or type filter, then save it.</p>
                ) : (
                  savedFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                        activeSavedFilterId === filter.id
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleApplySavedFilter(filter)}
                        className="font-semibold"
                      >
                        {filter.name}
                      </button>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {filter.typeFilter}{filter.searchTerm ? ` / ${filter.searchTerm}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedFilter(filter.id)}
                        className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`Delete ${filter.name}`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <RecurringTransactionsPanel
        accounts={accounts}
        categories={categories}
        currencyCode={currencyCode}
        isPremiumUser={isPremiumUser}
        loading={recurringLoading}
        recurringTransactions={recurringTransactions}
        userRole={userRole}
        onCreate={handleCreateRecurringTransaction}
        onDelete={handleDeleteRecurringTransaction}
        onRunDue={handleRunDueRecurringTransactions}
        onUpdate={handleUpdateRecurringTransaction}
      />

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
                  isSelected={selectedTransactionIds.includes(t.id)}
                  isImported={isImportedTransaction(t)}
                  isRecurring={isRecurringTransaction(t)}
                  onToggleSelect={() => toggleTransactionSelection(t.id)}
                  onEdit={() => { setSelectedTransaction(t); setIsModalOpen(true) }}
                  onSplit={isPremiumUser ? () => handleSplitTransaction(t) : undefined}
                  onDelete={() => handleDelete(t.id)}
                />
              )) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground italic">
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
              isSelected={selectedTransactionIds.includes(t.id)}
              isImported={isImportedTransaction(t)}
              isRecurring={isRecurringTransaction(t)}
              onToggleSelect={() => toggleTransactionSelection(t.id)}
              onEdit={() => { setSelectedTransaction(t); setIsModalOpen(true) }}
              onSplit={isPremiumUser ? () => handleSplitTransaction(t) : undefined}
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
              Showing {displayedTransactions.length} of {filteredTransactions.length} transaction(s)
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
  isSelected,
  isImported,
  isRecurring,
  onToggleSelect,
  onEdit,
  onSplit,
  onDelete
}: {
  transaction: Transaction
  formatCurrency: (value: number) => string
  isSelected: boolean
  isImported: boolean
  isRecurring: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onSplit?: () => void
  onDelete: () => void
}) => (
  <tr className="hover:bg-muted/50 transition-colors group">
    <td className="p-4 md:p-6">
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="h-4 w-4" />
      </div>
    </td>
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
          {isRecurring && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              <Repeat2 size={11} />
              Recurring
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
        {onSplit ? <button onClick={onSplit} className="p-2 text-muted-foreground hover:text-amber-600"><Scissors size={16} /></button> : null}
        <button onClick={onEdit} className="p-2 text-muted-foreground hover:text-foreground"><Edit2 size={16} /></button>
        <button onClick={onDelete} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
      </div>
    </td>
  </tr>
)

const TransactionSkeleton = () => (
  <tr className="animate-pulse">
    <td className="p-4 md:p-6">
      <div className="h-4 w-4 bg-muted rounded-sm" />
    </td>
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
  isSelected,
  isImported,
  isRecurring,
  onToggleSelect,
  onEdit,
  onSplit,
  onDelete
}: {
  transaction: Transaction
  formatCurrency: (value: number) => string
  isSelected: boolean
  isImported: boolean
  isRecurring: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onSplit?: () => void
  onDelete: () => void
}) => (
  <div className="rounded-xl border bg-background p-4 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="h-4 w-4" />
        Select
      </label>
    </div>
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
          {isRecurring && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              <Repeat2 size={10} />
              Recurring
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
        {onSplit ? (
          <button onClick={onSplit} className="h-11 w-11 rounded-lg border text-muted-foreground hover:text-amber-600 flex items-center justify-center">
            <Scissors size={15} />
          </button>
        ) : null}
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

const PremiumSignal = ({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Search
  label: string
  value: string
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-900">
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-amber-600" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
    </div>
    <p className="mt-2 text-sm font-black tracking-tight">{value}</p>
  </div>
)

