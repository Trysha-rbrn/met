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

const app = express()
const PORT = env.port
const HOST = env.host
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
  credentials: true
}))
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
    const [totalUsers, premiumUsers, totalIncomeAgg, totalExpenseAgg, monthlyTransactions, monthlyIncomeAgg, monthlyExpenseAgg] = await Promise.all([
      prisma.user.count({ where: { isBanned: false } }),
      prisma.user.count({ where: { role: 'PREMIUM', isBanned: false } }),
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

    res.json({
      totalUsers,
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

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`)
})
