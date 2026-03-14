const explicitBase = import.meta.env.VITE_API_BASE_URL?.trim()

const getRuntimeBase = () => {
  if (explicitBase) return explicitBase

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host) return `http://${host}:3000/api`
  }

  return 'http://localhost:3000/api'
}

export const API_BASE_URL = getRuntimeBase()
