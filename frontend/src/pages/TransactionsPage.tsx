import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, CheckSquare, Download, Edit2, FileUp, Plus, Search, Scissors, Tag, Trash2, Sparkles, BookmarkPlus, X, Repeat2 } from 'lucide-react'
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
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to load transactions.'))
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
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to load recurring templates.'))
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
      } catch (error: unknown) {
        notify.error(extractApiError(error, 'Failed to initialize transactions workspace.'))
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
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to save transaction.'))
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
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Excel export failed. Please try again.'))
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

  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((tx) => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0)
    const expense = filteredTransactions
      .filter((tx) => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + tx.amount, 0)
    return { income, expense, net: income - expense }
  }, [filteredTransactions])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#64748b]">Finance</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Transactions</h1>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-2 transition focus-within:border-[#ff9eff]/40 focus-within:bg-white/[0.05]">
            <Search className="mr-2 h-4 w-4 shrink-0 text-[#64748b]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search merchants..."
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-[#64748b] md:w-56"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'INCOME' | 'EXPENSE')}
            className="rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-[#64748b] transition hover:bg-white/[0.04] hover:text-white"
          >
            <option value="ALL">All</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
          <button type="button" onClick={exportExcel} className="flex items-center gap-2 rounded-[10px] border border-white/10 px-4 py-2 text-xs font-bold text-[#64748b] transition hover:bg-white/[0.04] hover:text-white">
            <Download size={14} />
            Export
          </button>
          <button type="button" onClick={exportPdf} className="flex items-center gap-2 rounded-[10px] border border-white/10 px-4 py-2 text-xs font-bold text-[#64748b] transition hover:bg-white/[0.04] hover:text-white">
            <Download size={14} />
            PDF
          </button>
          <button type="button" onClick={handleImportExcelClick} className="flex items-center gap-2 rounded-[10px] border border-white/10 px-4 py-2 text-xs font-bold text-[#64748b] transition hover:bg-white/[0.04] hover:text-white">
            <FileUp size={14} />
            Import
          </button>
          <motion.button
            onClick={() => { setSelectedTransaction(null); setIsModalOpen(true) }}
            className="rounded-[10px] bg-[#ff9eff] px-4 py-2 text-xs font-extrabold text-black"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!selectedAccountId}
          >
            <span className="inline-flex items-center gap-1">
              <Plus size={14} />
              New
            </span>
          </motion.button>
          <input ref={importInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportExcel} />
        </div>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div>
            <p className="mb-1 text-[10px] font-medium text-[#64748b]">Total In</p>
            <p className="text-base font-extrabold text-emerald-400">+{formatCurrency(totals.income)}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10">
            <ArrowDown className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div>
            <p className="mb-1 text-[10px] font-medium text-[#64748b]">Total Out</p>
            <p className="text-base font-extrabold text-red-400">-{formatCurrency(totals.expense)}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10">
            <ArrowUp className="h-4 w-4 text-red-400" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div>
            <p className="mb-1 text-[10px] font-medium text-[#64748b]">Net</p>
            <p className="text-base font-extrabold text-[#ff9eff]">{totals.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totals.net))}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff9eff]/10">
            <Sparkles className="h-4 w-4 text-[#ff9eff]" />
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-[#64748b]">
          {selectedAccount ? `Account: ${selectedAccount.name}` : 'No account selected'} · Plan: {userRole}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id="transactions-account"
            name="accountId"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="min-h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreateAccount}
            className="min-h-10 rounded-xl border border-white/10 px-3 text-sm font-semibold hover:bg-white/10"
            disabled={accounts.length >= maxAccounts}
          >
            {accounts.length >= maxAccounts ? 'Account limit reached' : 'Create Account'}
          </button>
          {isPremiumUser ? (
            <>
              <select
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
                className="min-h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm"
              >
                <option value="">Choose category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.type} - {category.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleBulkAssignCategory} className="min-h-10 rounded-xl border border-white/10 px-3 text-sm font-semibold hover:bg-white/10">
                <CheckSquare size={14} className="mr-1 inline" />
                Apply {selectedTransactionIds.length}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {isPremiumUser && savedFilters.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {savedFilters.map((filter) => (
            <div
              key={filter.id}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                activeSavedFilterId === filter.id
                  ? 'border-[#ff9eff]/35 bg-[#ff9eff]/12 text-[#ff9eff]'
                  : 'border-white/12 bg-white/5 text-slate-300'
              }`}
            >
              <button type="button" onClick={() => handleApplySavedFilter(filter)} className="font-semibold">
                {filter.name}
              </button>
              <button type="button" onClick={() => handleDeleteSavedFilter(filter.id)} className="rounded-full p-0.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-[#64748b]">
              <tr>
                <th className="px-6 py-4 font-semibold">#</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Merchant</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {loading ? (
                [...Array(6)].map((_, i) => <TemplateTransactionSkeleton key={i} />)
              ) : displayedTransactions.length > 0 ? (
                displayedTransactions.map((t) => (
                  <TemplateTransactionRow
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
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center italic text-slate-400">
                    No transactions yet for this account. Add your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <p className="text-xs text-[#64748b]">
          Showing <span className="font-bold text-[#f1f5f9]">{displayedTransactions.length === 0 ? 0 : 1}–{displayedTransactions.length}</span> of{' '}
          <span className="font-bold text-[#f1f5f9]">{filteredTransactions.length}</span> transactions
        </p>
        <div className="flex items-center gap-2">
          <button className="cursor-not-allowed rounded-[10px] border border-white/10 px-3 py-1.5 text-xs font-bold opacity-40">← Prev</button>
          <div className="flex gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff9eff] text-[11px] font-bold text-black">1</div>
          </div>
          <button className="rounded-[10px] border border-white/10 px-3 py-1.5 text-xs font-bold text-[#64748b] hover:bg-white/[0.04] hover:text-white">Next →</button>
        </div>
      </footer>

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

      {isPremiumUser ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={handleSaveCurrentFilter}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            <BookmarkPlus size={14} />
            Save Current View
          </button>
          <p className="mt-2 text-xs text-slate-400">Premium account limit: {maxAccounts}. Search and type filters are active.</p>
          <div ref={loadMoreRef} className="h-1" />
          {hasMoreTransactions && loadingMore ? <p className="mt-2 text-xs text-slate-400">Loading older transactions...</p> : null}
        </div>
      ) : null}

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

const TemplateTransactionRow = ({
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
  <tr className="border-b border-white/5 text-xs transition hover:bg-[#ff9eff]/[0.025]">
    <td className="px-6 py-4 font-medium text-[#64748b]">{t.id.slice(-4)}</td>
    <td className="px-6 py-4">
      <div className="inline-flex items-center gap-2">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="h-3.5 w-3.5" />
        {t.type === 'INCOME' ? <ArrowDown size={15} className="text-emerald-400" /> : <ArrowUp size={15} className="text-red-400" />}
      </div>
    </td>
    <td className="px-6 py-4 font-bold text-[#f1f5f9]">{t.description || 'Transaction'}</td>
    <td className="px-6 py-4">
      <span className="inline-flex items-center gap-1 rounded-full border border-[#ff9eff]/30 bg-[#ff9eff]/10 px-2 py-1 text-[10px] font-bold text-[#ffc8ff]">
        {renderCategoryIcon(t.category?.icon, 11)}
        {t.category?.name || 'Uncategorized'}
      </span>
    </td>
    <td className="px-6 py-4 text-[#64748b]">{new Date(t.date).toLocaleDateString()}</td>
    <td className={`px-6 py-4 font-bold ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
      {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
    </td>
    <td className="px-6 py-4">
      {isRecurring ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#ff9eff]/45 bg-[#ff9eff]/14 px-2 py-0.5 text-[10px] font-semibold text-[#ffc8ff]">
          <Repeat2 size={10} />
          Recurring
        </span>
      ) : isImported ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Tag size={10} />
          Imported
        </span>
      ) : (
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
          Cleared
        </span>
      )}
    </td>
    <td className="px-6 py-4 text-right">
      <div className="flex justify-end gap-2 text-[#64748b]">
        {onSplit ? <button onClick={onSplit} className="rounded p-1 hover:text-[#ff9eff]"><Scissors size={14} /></button> : null}
        <button onClick={onEdit} className="rounded p-1 hover:text-white"><Edit2 size={14} /></button>
        <button onClick={onDelete} className="rounded p-1 hover:text-red-400"><Trash2 size={14} /></button>
      </div>
    </td>
  </tr>
)

const TemplateTransactionSkeleton = () => (
  <tr className="animate-pulse border-b border-white/5">
    <td className="px-6 py-4"><div className="h-3 w-8 rounded bg-white/10" /></td>
    <td className="px-6 py-4"><div className="h-3 w-10 rounded bg-white/10" /></td>
    <td className="px-6 py-4"><div className="h-3 w-40 rounded bg-white/10" /></td>
    <td className="px-6 py-4"><div className="h-3 w-24 rounded bg-white/10" /></td>
    <td className="px-6 py-4"><div className="h-3 w-20 rounded bg-white/10" /></td>
    <td className="px-6 py-4"><div className="h-3 w-20 rounded bg-white/10" /></td>
    <td className="px-6 py-4"><div className="h-3 w-16 rounded bg-white/10" /></td>
    <td className="px-6 py-4"><div className="ml-auto h-3 w-14 rounded bg-white/10" /></td>
  </tr>
)

export default TransactionsPage




