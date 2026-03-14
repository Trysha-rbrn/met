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
  role: 'BASIC' | 'ADMIN'
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
  role: 'BASIC' | 'ADMIN'
  isBanned: boolean
  createdAt: string
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
  actorRole: 'BASIC' | 'ADMIN'
  createdAt: string
  details: unknown
  actorUser: { id: string; email: string; name: string | null; role: 'BASIC' | 'ADMIN' } | null
  targetUser: { id: string; email: string; name: string | null; role: 'BASIC' | 'ADMIN' } | null
}

export const getAdminUsers = async (params: {
  search?: string
  role?: 'BASIC' | 'ADMIN' | 'ALL'
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
