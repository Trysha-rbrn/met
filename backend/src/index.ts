import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import categoryRoutes from './routes/categoryRoutes.ts'
import transactionRoutes from './routes/transactionRoutes.ts'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/categories', categoryRoutes)
app.use('/api/transactions', transactionRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'API is running' })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
