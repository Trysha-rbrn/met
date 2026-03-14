import { randomUUID } from 'crypto'

const requireEnv = (key: string) => {
  const value = process.env[key]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export const env = {
  nodeEnv: process.env.NODE_ENV?.trim() || 'development',
  host: process.env.HOST?.trim() || '0.0.0.0',
  port: parsePositiveInt(process.env.PORT, 3000),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '7d',
  bcryptRounds: parsePositiveInt(process.env.BCRYPT_ROUNDS, 10),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  authRateLimitWindowMs: parsePositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  authRateLimitMax: parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
  allowPrivateNetworkOrigins: process.env.ALLOW_PRIVATE_NETWORK_ORIGINS === 'true',
  serverInstanceId: randomUUID(),
}
