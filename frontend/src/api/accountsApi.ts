import axios from 'axios'

const API_URL = 'http://localhost:3000/api/accounts'

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
