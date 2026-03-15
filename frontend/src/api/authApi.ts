import axios from 'axios';
import { API_BASE_URL } from './baseUrl'
import type { CurrencyCode } from '../lib/currencies'

const API_URL = `${API_BASE_URL}/auth`;

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
  token: string
}

export interface AuthPayload {
  email: string
  password: string
  name?: string
}

export interface UpdateProfilePayload {
  name?: string
  preferredCurrency?: AuthUser['preferredCurrency']
  currentPassword?: string
  newPassword?: string
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('met_token');
  return { Authorization: `Bearer ${token}` };
};

export const register = async (data: AuthPayload) => {
  const response = await axios.post<AuthResponse>(`${API_URL}/register`, data);
  return response.data;
};

export const login = async (data: AuthPayload) => {
  const response = await axios.post<AuthResponse>(`${API_URL}/login`, data);
  return response.data;
};

export const getMe = async () => {
  const response = await axios.get<AuthUser>(`${API_URL}/me`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const updateProfile = async (data: UpdateProfilePayload) => {
  const response = await axios.put<AuthUser>(`${API_URL}/profile`, data, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const deleteAccount = async (password: string) => {
  const response = await axios.delete(`${API_URL}/profile`, {
    data: { password },
    headers: getAuthHeaders()
  });
  return response.data;
};

export const resetUserData = async (password: string) => {
  const response = await axios.post(`${API_URL}/reset-data`, { password }, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const activatePremium = async (code: string) => {
  const response = await axios.post<AuthUser>(`${API_URL}/activate-premium`, { code }, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const getSubscription = async () => {
  const response = await axios.get<SubscriptionResponse>(`${API_URL}/subscription`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const upgradeSubscription = async (billingInterval: 'MONTHLY' | 'YEARLY', code?: string) => {
  const response = await axios.post<SubscriptionResponse>(`${API_URL}/subscription/upgrade`, { billingInterval, code }, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const downgradeSubscription = async (immediate = false) => {
  const response = await axios.post<SubscriptionResponse>(`${API_URL}/subscription/downgrade`, { immediate }, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const resumeSubscription = async () => {
  const response = await axios.post<SubscriptionResponse>(`${API_URL}/subscription/resume`, {}, {
    headers: getAuthHeaders()
  })
  return response.data
}

export const updateBenchmarkPreference = async (benchmarkOptOut: boolean) => {
  const response = await axios.patch<AuthUser>(`${API_URL}/benchmark-preference`, { benchmarkOptOut }, {
    headers: getAuthHeaders()
  })
  return response.data
}
