import axios from 'axios'
import { API_BASE_URL } from './baseUrl'

const CSRF_STORAGE_KEY = 'met_csrf_token'

export const getStoredCsrfToken = () => sessionStorage.getItem(CSRF_STORAGE_KEY) || ''

export const storeCsrfToken = (token: string | null | undefined) => {
  if (!token) {
    sessionStorage.removeItem(CSRF_STORAGE_KEY)
    return
  }

  sessionStorage.setItem(CSRF_STORAGE_KEY, token)
}

export const clearStoredCsrfToken = () => {
  sessionStorage.removeItem(CSRF_STORAGE_KEY)
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
})

http.interceptors.request.use((config) => {
  const csrfToken = getStoredCsrfToken()
  if (csrfToken) {
    config.headers.set('X-CSRF-Token', csrfToken)
  }
  return config
})

http.interceptors.response.use((response) => {
  const csrfToken = response.headers['x-csrf-token']
  if (typeof csrfToken === 'string') {
    storeCsrfToken(csrfToken)
  }
  return response
})
