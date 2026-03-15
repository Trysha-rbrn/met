import axios from 'axios';
import { API_BASE_URL } from './baseUrl'

const API_URL = `${API_BASE_URL}/transactions`;

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

const getAuthHeaders = () => {
  const token = localStorage.getItem('met_token');
  return { Authorization: `Bearer ${token}` };
};

export const getTransactions = async (accountId?: string) => {
  const response = await axios.get<Transaction[]>(API_URL, {
    headers: getAuthHeaders(),
    params: accountId ? { accountId } : undefined
  });
  return response.data;
};

export const getSummary = async (accountId?: string) => {
  const response = await axios.get<TransactionSummary>(`${API_URL}/summary`, {
    headers: getAuthHeaders(),
    params: accountId ? { accountId } : undefined
  });
  return response.data;
};

export const createTransaction = async (data: TransactionPayload) => {
  const response = await axios.post<Transaction>(API_URL, data, { headers: getAuthHeaders() });
  return response.data;
};

export const updateTransaction = async (id: string, data: TransactionPayload) => {
  const response = await axios.put<Transaction>(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });
  return response.data;
};

export const deleteTransaction = async (id: string) => {
  const response = await axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });
  return response.data;
};

export const getRecurringTransactions = async () => {
  const response = await axios.get<RecurringTransaction[]>(`${API_URL}/recurring`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const createRecurringTransaction = async (data: RecurringTransactionPayload) => {
  const response = await axios.post<RecurringTransaction>(`${API_URL}/recurring`, data, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const updateRecurringTransaction = async (id: string, data: Partial<RecurringTransactionPayload>) => {
  const response = await axios.put<RecurringTransaction>(`${API_URL}/recurring/${id}`, data, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const deleteRecurringTransaction = async (id: string) => {
  const response = await axios.delete(`${API_URL}/recurring/${id}`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const runDueRecurringTransactions = async () => {
  const response = await axios.post<{ createdCount: number; transactions: Transaction[] }>(
    `${API_URL}/recurring/run-due`,
    {},
    { headers: getAuthHeaders() }
  )
  return response.data
}

export const bulkAssignCategory = async (transactionIds: string[], categoryId: string) => {
  const response = await axios.patch<{ updatedCount: number; skippedCount: number }>(
    `${API_URL}/bulk/category`,
    { transactionIds, categoryId },
    { headers: getAuthHeaders() }
  )
  return response.data
}

export const splitTransaction = async (
  id: string,
  splits: Array<{ amount: number; categoryId: string; description?: string }>
) => {
  const response = await axios.post<Transaction[]>(`${API_URL}/${id}/split`, { splits }, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const getInsights = async (accountId?: string) => {
  const response = await axios.get<TransactionInsightResponse>(`${API_URL}/insights`, {
    headers: getAuthHeaders(),
    params: accountId ? { accountId } : undefined
  })
  return response.data
}

export const getBenchmark = async (accountId?: string) => {
  const response = await axios.get<TransactionBenchmarkResponse>(`${API_URL}/benchmark`, {
    headers: getAuthHeaders(),
    params: accountId ? { accountId } : undefined
  })
  return response.data
}
