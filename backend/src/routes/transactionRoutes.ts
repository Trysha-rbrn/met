import { Router } from 'express'
import { 
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  getSummary
} from '../controllers/transactionController.ts'

const router = Router()

router.get('/', getTransactions)
router.get('/summary', getSummary)
router.post('/', createTransaction)
router.put('/:id', updateTransaction)
router.delete('/:id', deleteTransaction)

export default router
