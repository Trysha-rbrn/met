import axios from 'axios'
import { API_BASE_URL } from './baseUrl'

const API_URL = `${API_BASE_URL}/public`

export const getPublicStats = async () => {
  const response = await axios.get<{ totalUsers: number }>(`${API_URL}/stats`)
  return response.data
}
