import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import categoryRoutes from './routes/categoryRoutes.ts'
import transactionRoutes from './routes/transactionRoutes.ts'
import authRoutes from './routes/authRoutes.ts'
import accountRoutes from './routes/accountRoutes.ts'
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.ts'
import { env } from './config/env.ts'

const app = express()
const PORT = env.port
const HOST = env.host
const allowedOrigins = env.corsOrigins
const privateNetworkOriginRegex = /^https?:\/\/((localhost|127\.0\.0\.1)|((10|192\.168)\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}))(:\d+)?$/i

const isOriginAllowed = (origin: string) => {
  if (allowedOrigins.includes(origin)) return true
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

app.get('/health', (req, res) => {
  res.json({ status: 'API is running' })
})

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`)
})
