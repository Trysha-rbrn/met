import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import categoryRoutes from './routes/categoryRoutes.ts'
import transactionRoutes from './routes/transactionRoutes.ts'
import authRoutes from './routes/authRoutes.ts'
import accountRoutes from './routes/accountRoutes.ts'
import dataTransferRoutes from './routes/dataTransferRoutes.ts'
import adminRoutes from './routes/adminRoutes.ts'
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.ts'
import { env } from './config/env.ts'
import { prisma } from './lib/prisma.ts'
import { resolveCurrencySuggestion } from './lib/currency.ts'

const app = express()
const PORT = env.port
const HOST = env.host
const DEFAULT_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data: https:",
  "connect-src 'self'"
].join('; ')
const normalizeOrigin = (value: string) => {
  try {
    const parsed = new URL(value.trim())
    const protocol = parsed.protocol.toLowerCase()
    const hostname = parsed.hostname.toLowerCase()
    const port = parsed.port
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`
  } catch {
    return null
  }
}

const allowedOrigins = new Set(
  env.corsOrigins
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin))
)
const privateNetworkOriginRegex = /^https?:\/\/((localhost|127\.0\.0\.1)|((10|192\.168)\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}))(:\d+)?$/i

const isOriginAllowed = (origin: string) => {
  const normalized = normalizeOrigin(origin)
  if (normalized && allowedOrigins.has(normalized)) return true
  if (env.nodeEnv === 'development' && env.allowPrivateNetworkOrigins) {
    return privateNetworkOriginRegex.test(origin)
  }
  return false
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    if (isOriginAllowed(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('CORS origin denied'))
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-billing-hook-secret'],
  exposedHeaders: ['X-CSRF-Token']
}))
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', DEFAULT_CSP)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  if (env.nodeEnv === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/data-transfer', dataTransferRoutes)
app.use('/api/admin', adminRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'API is running' })
})

app.get('/api/public/stats', async (_req, res) => {
  try {
    const [
      totalUsers,
      premiumUsers,
      totalTransactions,
      totalIncomeAgg,
      totalExpenseAgg,
      monthlyTransactions,
      monthlyIncomeAgg,
      monthlyExpenseAgg,
      reviewAggregate,
      countryGroups
    ] = await Promise.all([
      prisma.user.count({ where: { isBanned: false } }),
      prisma.user.count({ where: { role: 'PREMIUM', isBanned: false } }),
      prisma.transaction.count({ where: { user: { isBanned: false } } }),
      prisma.transaction.aggregate({
        where: { type: 'INCOME', user: { isBanned: false } },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { type: 'EXPENSE', user: { isBanned: false } },
        _sum: { amount: true }
      }),
      prisma.transaction.count({
        where: {
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          user: { isBanned: false }
        }
      }),
      prisma.transaction.aggregate({
        where: {
          type: 'INCOME',
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          user: { isBanned: false }
        },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: {
          type: 'EXPENSE',
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          user: { isBanned: false }
        },
        _sum: { amount: true }
      }),
      prisma.userReview.aggregate({
        where: {
          isPublic: true,
          user: { isBanned: false }
        },
        _avg: { rating: true }
      }),
      prisma.user.groupBy({
        by: ['countryCode'],
        where: {
          isBanned: false,
          countryCode: { not: null }
        }
      })
    ])

    const minUsersForFinancialStats = 10
    const totalIncome = totalIncomeAgg._sum.amount ?? 0
    const totalExpense = totalExpenseAgg._sum.amount ?? 0
    const monthlyIncome = monthlyIncomeAgg._sum.amount ?? 0
    const monthlyExpense = monthlyExpenseAgg._sum.amount ?? 0
    const net = totalIncome - totalExpense
    const avgBalanceUsd = totalUsers > 0 ? net / totalUsers : 0
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.min(100, (net / totalIncome) * 100)) : 0
    const avgMonthlyTransactions = totalUsers > 0 ? monthlyTransactions / totalUsers : 0
    const premiumRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0
    const averageUserRating = reviewAggregate._avg.rating ?? null
    const countriesCount = countryGroups.length

    res.json({
      totalUsers,
      totalTransactions,
      averageUserRating,
      countriesCount,
      premiumUsers,
      premiumRate,
      avgBalanceUsd: totalUsers >= minUsersForFinancialStats ? avgBalanceUsd : null,
      savingsRate: totalUsers >= minUsersForFinancialStats ? savingsRate : null,
      avgMonthlyTransactions: totalUsers >= minUsersForFinancialStats ? avgMonthlyTransactions : null,
      monthlyIncome: totalUsers >= minUsersForFinancialStats ? monthlyIncome : null,
      monthlyExpense: totalUsers >= minUsersForFinancialStats ? monthlyExpense : null
    })
  } catch {
    res.status(500).json({ error: 'Failed to load public stats.' })
  }
})

app.get('/api/public/currency-suggestion', (req, res) => {
  const suggestion = resolveCurrencySuggestion(req)
  res.json(suggestion)
})

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`)
})
