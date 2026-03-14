import axios from 'axios'
import { API_BASE_URL } from './baseUrl'

const API_URL = `${API_BASE_URL}/data-transfer`

export type TransferAction = 'IMPORT' | 'EXPORT'
export type TransferFormat = 'EXCEL' | 'PDF'

export interface TransferLog {
  id: string
  action: TransferAction
  format: TransferFormat
  rows: number
  createdAt: string
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('met_token')
  return { Authorization: `Bearer ${token}` }
}

export const getTransferLogs = async () => {
  const response = await axios.get<TransferLog[]>(API_URL, { headers: getAuthHeaders() })
  return response.data
}

export const createTransferLog = async (payload: { action: TransferAction; format: TransferFormat; rows: number }) => {
  const response = await axios.post<TransferLog>(API_URL, payload, { headers: getAuthHeaders() })
  return response.data
}
