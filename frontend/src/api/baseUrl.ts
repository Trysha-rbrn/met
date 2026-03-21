const explicitBase = import.meta.env.VITE_API_BASE_URL?.trim()
const vercelFallbackBase = import.meta.env.VITE_VERCEL_FALLBACK_API_BASE_URL?.trim()

const getRuntimeBase = () => {
  if (explicitBase) return explicitBase

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host.endsWith('.vercel.app')) {
      return vercelFallbackBase || 'https://ekonomija-backend.onrender.com/api'
    }
    if (host) return `http://${host}:3000/api`
  }

  return 'http://localhost:3000/api'
}

export const API_BASE_URL = getRuntimeBase()
