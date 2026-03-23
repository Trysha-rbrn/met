import { http } from './http'

const API_URL = '/transactions'

export type TransactionType = 'INCOME' | 'EXPENSE'
export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface Transaction {
  id: string
  amount: number
  description: string | null
  date: string
  type: TransactionType
  metadata?: Record<string, unknown> | null
  categoryId?: string
  category?: {
    id: string
    name: string
    icon?: string
    type: TransactionType
  }
  accountId?: string | null
  account?: {
    id: string
    name: string
  }
}

export interface TransactionSummary {
  totalBalance: number
  totalIncome: number
  totalExpenses: number
}

export interface RecurringTransaction {
  id: string
  amount: number
  description: string | null
  type: TransactionType
  frequency: RecurringFrequency
  startDate: string
  nextRunDate: string
  lastRunAt?: string | null
  endDate?: string | null
  isActive: boolean
  categoryId: string
  category?: {
    id: string
    name: string
    icon?: string
    type: TransactionType
  }
  accountId?: string | null
  account?: {
    id: string
    name: string
  } | null
}

export interface TransactionPayload {
  amount: string
  description: string
  date: string
  type: TransactionType
  categoryId?: string
  accountId?: string
  metadata?: Record<string, unknown>
}

export interface RecurringTransactionPayload {
  amount: string
  description: string
  type: TransactionType
  categoryId: string
  accountId?: string
  frequency: RecurringFrequency
  startDate: string
  endDate?: string
  isActive?: boolean
}

export interface TransactionInsightResponse {
  rangeDays: number
  insights: string[]
  metrics: {
    incomeTotal: number
    expenseTotal: number
    monthlyNet: number
    projectedSixMonths: number
    savingsRate: number
    topCategories: Array<{ name: string; amount: number }>
  }
}

export interface TransactionBenchmarkResponse {
  enabled: boolean
  available?: boolean
  reason?: string
  cohortSize?: number
  windowDays?: number
  message?: string
  comparisons?: Array<{
    category: string
    myAmount: number
    cohortAverage: number
    diffPercent: number
  }>
}

export const getTransactions = async (accountId?: string) => {
  const response = await http.get<Transaction[]>(API_URL, {
    params: accountId ? { accountId } : undefined
  })
  return response.data
}

export const getSummary = async (accountId?: string) => {
  const response = await http.get<TransactionSummary>(`${API_URL}/summary`, {
    params: accountId ? { accountId } : undefined
  })
  return response.data
}

export const createTransaction = async (data: TransactionPayload) => {
  const response = await http.post<Transaction>(API_URL, data)
  return response.data
}

export const updateTransaction = async (id: string, data: TransactionPayload) => {
  const response = await http.put<Transaction>(`${API_URL}/${id}`, data)
  return response.data
}

export const deleteTransaction = async (id: string) => {
  const response = await http.delete(`${API_URL}/${id}`)
  return response.data
}

export const getRecurringTransactions = async () => {
  const response = await http.get<RecurringTransaction[]>(`${API_URL}/recurring`)
  return response.data
}

export const createRecurringTransaction = async (data: RecurringTransactionPayload) => {
  const response = await http.post<RecurringTransaction>(`${API_URL}/recurring`, data)
  return response.data
}

export const updateRecurringTransaction = async (id: string, data: Partial<RecurringTransactionPayload>) => {
  const response = await http.put<RecurringTransaction>(`${API_URL}/recurring/${id}`, data)
  return response.data
}

export const deleteRecurringTransaction = async (id: string) => {
  const response = await http.delete(`${API_URL}/recurring/${id}`)
  return response.data
}

export const runDueRecurringTransactions = async () => {
  const response = await http.post<{ createdCount: number; transactions: Transaction[] }>(
    `${API_URL}/recurring/run-due`,
    {}
  )
  return response.data
}

export const bulkAssignCategory = async (transactionIds: string[], categoryId: string) => {
  const response = await http.patch<{ updatedCount: number; skippedCount: number }>(
    `${API_URL}/bulk/category`,
    { transactionIds, categoryId }
  )
  return response.data
}

export const splitTransaction = async (
  id: string,
  splits: Array<{ amount: number; categoryId: string; description?: string }>
) => {
  const response = await http.post<Transaction[]>(`${API_URL}/${id}/split`, { splits })
  return response.data
}

export const getInsights = async (accountId?: string) => {
  const response = await http.get<TransactionInsightResponse>(`${API_URL}/insights`, {
    params: accountId ? { accountId } : undefined
  })
  return response.data
}

export const getBenchmark = async (accountId?: string) => {
  const response = await http.get<TransactionBenchmarkResponse>(`${API_URL}/benchmark`, {
    params: accountId ? { accountId } : undefined
  })
  return response.data
}
