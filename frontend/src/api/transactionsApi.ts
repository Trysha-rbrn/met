import axios from 'axios';
import { API_BASE_URL } from './baseUrl'

const API_URL = `${API_BASE_URL}/transactions`;

export type TransactionType = 'INCOME' | 'EXPENSE'

export interface Transaction {
  id: string
  amount: number
  description: string | null
  date: string
  type: TransactionType
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

export interface TransactionPayload {
  amount: string
  description: string
  date: string
  type: TransactionType
  categoryId: string
  accountId?: string
  metadata?: Record<string, unknown>
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
