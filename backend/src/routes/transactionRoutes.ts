import { Router } from 'express'
import { 
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  getSummary
} from '../controllers/transactionController.ts'
import { auth } from '../middleware/authMiddleware.ts'

const router = Router()

router.use(auth) // All transaction routes are protected

router.get('/', getTransactions)
router.get('/summary', getSummary)
router.post('/', createTransaction)
router.put('/:id', updateTransaction)
router.delete('/:id', deleteTransaction)

export default router
