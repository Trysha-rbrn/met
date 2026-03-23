import { http } from './http'

const API_URL = '/public'

export interface PublicStats {
  totalUsers: number
  totalTransactions: number
  averageUserRating: number | null
  countriesCount: number
  premiumUsers: number
  premiumRate: number
  avgBalanceUsd: number | null
  savingsRate: number | null
  avgMonthlyTransactions: number | null
  monthlyIncome: number | null
  monthlyExpense: number | null
}

export const getPublicStats = async () => {
  const response = await http.get<PublicStats>(`${API_URL}/stats`)
  return response.data
}
