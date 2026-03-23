import { http } from './http'
import type { CurrencyCode } from '../lib/currencies'

const API_URL = '/auth'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'BASIC' | 'PREMIUM' | 'ADMIN'
  isBanned: boolean
  preferredCurrency: CurrencyCode
  benchmarkOptOut: boolean
}

export interface SubscriptionSummary {
  id: string
  userId: string
  plan: 'BASIC' | 'PREMIUM'
  status: 'ACTIVE' | 'PENDING' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED'
  billingInterval: 'MONTHLY' | 'YEARLY' | null
  source: 'SYSTEM' | 'PROMO_CODE' | 'BILLING' | 'BILLING_WEBHOOK' | 'ADMIN' | 'LEGACY_IMPORT'
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  externalCustomerId: string | null
  externalSubscriptionId: string | null
  lastWebhookEventId: string | null
  lastWebhookEventAt: string | null
  metadata: unknown
  createdAt: string
  updatedAt: string
}

export interface SubscriptionResponse {
  user: AuthUser
  subscription: SubscriptionSummary
  message?: string
}

export interface AuthResponse {
  user: AuthUser
}

export interface AuthPayload {
  email: string
  password: string
  name?: string
  preferredCurrency?: AuthUser['preferredCurrency']
}

export interface UpdateProfilePayload {
  name?: string
  preferredCurrency?: AuthUser['preferredCurrency']
  currentPassword?: string
  newPassword?: string
}

export const register = async (data: AuthPayload) => {
  const response = await http.post<AuthResponse>(`${API_URL}/register`, data)
  return response.data
}

export const login = async (data: AuthPayload) => {
  const response = await http.post<AuthResponse>(`${API_URL}/login`, data)
  return response.data
}

export const logout = async () => {
  const response = await http.post<{ message: string }>(`${API_URL}/logout`)
  return response.data
}

export const getMe = async () => {
  const response = await http.get<AuthUser>(`${API_URL}/me`)
  return response.data
}

export const updateProfile = async (data: UpdateProfilePayload) => {
  const response = await http.put<AuthUser>(`${API_URL}/profile`, data)
  return response.data
}

export const deleteAccount = async (password: string) => {
  const response = await http.delete(`${API_URL}/profile`, {
    data: { password }
  })
  return response.data
}

export const resetUserData = async (password: string) => {
  const response = await http.post(`${API_URL}/reset-data`, { password })
  return response.data
}

export const activatePremium = async (code: string) => {
  const response = await http.post<AuthUser>(`${API_URL}/activate-premium`, { code })
  return response.data
}

export const getSubscription = async () => {
  const response = await http.get<SubscriptionResponse>(`${API_URL}/subscription`)
  return response.data
}

export const upgradeSubscription = async (billingInterval: 'MONTHLY' | 'YEARLY', code?: string) => {
  const response = await http.post<SubscriptionResponse>(`${API_URL}/subscription/upgrade`, { billingInterval, code })
  return response.data
}

export const downgradeSubscription = async (immediate = false) => {
  const response = await http.post<SubscriptionResponse>(`${API_URL}/subscription/downgrade`, { immediate })
  return response.data
}

export const resumeSubscription = async () => {
  const response = await http.post<SubscriptionResponse>(`${API_URL}/subscription/resume`, {})
  return response.data
}

export const updateBenchmarkPreference = async (benchmarkOptOut: boolean) => {
  const response = await http.patch<AuthUser>(`${API_URL}/benchmark-preference`, { benchmarkOptOut })
  return response.data
}
