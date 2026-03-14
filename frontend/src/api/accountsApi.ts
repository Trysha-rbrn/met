import axios from 'axios'
import { API_BASE_URL } from './baseUrl'

const API_URL = `${API_BASE_URL}/accounts`

export interface Account {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('met_token')
  return { Authorization: `Bearer ${token}` }
}

export const getAccounts = async () => {
  const response = await axios.get<Account[]>(API_URL, { headers: getAuthHeaders() })
  return response.data
}

export const createAccount = async (name?: string) => {
  const response = await axios.post<Account>(API_URL, { name }, { headers: getAuthHeaders() })
  return response.data
}
