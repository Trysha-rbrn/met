import axios from 'axios'
import { API_BASE_URL } from './baseUrl'

const API_URL = `${API_BASE_URL}/admin`

const getAuthHeaders = () => {
  const token = localStorage.getItem('met_token')
  return { Authorization: `Bearer ${token}` }
}

export interface AdminUserListItem {
  id: string
  email: string
  name: string | null
  role: 'BASIC' | 'PREMIUM' | 'ADMIN'
  isBanned: boolean
  createdAt: string
  _count: {
    accounts: number
    categories: number
    transactions: number
    transferLogs: number
  }
}

export interface AdminUserDetails {
  id: string
  email: string
  name: string | null
  role: 'BASIC' | 'PREMIUM' | 'ADMIN'
  isBanned: boolean
  createdAt: string
  subscription: {
    plan: 'BASIC' | 'PREMIUM'
    status: 'ACTIVE' | 'PENDING' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED'
    billingInterval: 'MONTHLY' | 'YEARLY' | null
    cancelAtPeriodEnd: boolean
    currentPeriodEnd: string | null
    source: 'SYSTEM' | 'PROMO_CODE' | 'BILLING' | 'BILLING_WEBHOOK' | 'ADMIN' | 'LEGACY_IMPORT'
  } | null
  accounts: Array<{ id: string; name: string; createdAt: string }>
  categories: Array<{ id: string; name: string; type: 'INCOME' | 'EXPENSE'; createdAt: string }>
  transactions: Array<{
    id: string
    amount: number
    type: 'INCOME' | 'EXPENSE'
    description: string | null
    date: string
    account: { id: string; name: string } | null
    category: { id: string; name: string }
  }>
  transferLogs: Array<{ id: string; action: string; format: string; rows: number; createdAt: string }>
}

export interface AdminAuditLog {
  id: string
  action: string
  actorRole: 'BASIC' | 'PREMIUM' | 'ADMIN'
  createdAt: string
  details: unknown
  actorUser: { id: string; email: string; name: string | null; role: 'BASIC' | 'PREMIUM' | 'ADMIN' } | null
  targetUser: { id: string; email: string; name: string | null; role: 'BASIC' | 'PREMIUM' | 'ADMIN' } | null
}

export interface PromoCodeItem {
  id: string
  code: string
  expiresAt: string | null
  maxRedemptions: number | null
  redemptionCount: number
  remainingRedemptions: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdByAdmin: { id: string; email: string; name: string | null } | null
  stats: {
    totalRedemptions: number
    uniqueUsers: number
  }
  recentRedemptions: Array<{
    id: string
    createdAt: string
    user: { id: string; email: string; name: string | null }
  }>
}

export const getAdminUsers = async (params: {
  search?: string
  role?: 'BASIC' | 'PREMIUM' | 'ADMIN' | 'ALL'
  status?: 'active' | 'banned' | 'all'
  sortBy?: 'createdAt' | 'email' | 'name'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}) => {
  const response = await axios.get<{ users: AdminUserListItem[]; pagination: { page: number; totalPages: number; total: number } }>(
    `${API_URL}/users`,
    {
      params,
      headers: getAuthHeaders()
    }
  )
  return response.data
}

export const getAdminUserDetails = async (id: string) => {
  const response = await axios.get<AdminUserDetails>(`${API_URL}/users/${id}`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const setAdminUserBan = async (id: string, isBanned: boolean) => {
  const response = await axios.patch(`${API_URL}/users/${id}/ban`, { isBanned }, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const setAdminUserRole = async (id: string, role: 'BASIC' | 'PREMIUM') => {
  const response = await axios.patch(`${API_URL}/users/${id}/role`, { role }, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const deleteAdminUser = async (id: string) => {
  const response = await axios.delete(`${API_URL}/users/${id}`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const getAdminAuditLogs = async (params?: { action?: string; userId?: string; page?: number; pageSize?: number }) => {
  const response = await axios.get<{ logs: AdminAuditLog[]; pagination: { page: number; totalPages: number; total: number } }>(
    `${API_URL}/audit-logs`,
    {
      params,
      headers: getAuthHeaders()
    }
  )
  return response.data
}

export const getPromoCodes = async () => {
  const response = await axios.get<PromoCodeItem[]>(`${API_URL}/promo-codes`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const createPromoCode = async (payload: { code: string; expiresAt?: string; maxRedemptions?: number }) => {
  const response = await axios.post<PromoCodeItem>(`${API_URL}/promo-codes`, payload, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const setPromoCodeState = async (id: string, isActive: boolean) => {
  const response = await axios.patch<PromoCodeItem>(`${API_URL}/promo-codes/${id}/state`, { isActive }, {
    headers: getAuthHeaders()
  })
  return response.data
}
