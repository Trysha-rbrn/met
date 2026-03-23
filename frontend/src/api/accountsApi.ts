import { http } from './http'

const API_URL = '/accounts'

export interface Account {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

export const getAccounts = async () => {
  const response = await http.get<Account[]>(API_URL)
  return response.data
}

export const createAccount = async (name?: string) => {
  const response = await http.post<Account>(API_URL, { name })
  return response.data
}
