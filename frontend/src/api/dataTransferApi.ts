import { http } from './http'

const API_URL = '/data-transfer'

export type TransferAction = 'IMPORT' | 'EXPORT'
export type TransferFormat = 'EXCEL' | 'PDF'

export interface TransferLog {
  id: string
  action: TransferAction
  format: TransferFormat
  rows: number
  createdAt: string
}

export const getTransferLogs = async () => {
  const response = await http.get<TransferLog[]>(API_URL)
  return response.data
}

export const createTransferLog = async (payload: { action: TransferAction; format: TransferFormat; rows: number }) => {
  const response = await http.post<TransferLog>(API_URL, payload)
  return response.data
}
