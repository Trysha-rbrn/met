import { Router } from 'express'
import { 
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  getSummary
} from '../controllers/transactionController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import {
  validateCreateTransaction,
  validateTransactionIdParam,
  validateTransactionListQuery,
  validateUpdateTransaction
} from '../middleware/validationMiddleware.ts'

const router = Router()

router.use(auth) // All transaction routes are protected

router.get('/', validateTransactionListQuery, getTransactions)
router.get('/summary', validateTransactionListQuery, getSummary)
router.post('/', validateCreateTransaction, createTransaction)
router.put('/:id', validateUpdateTransaction, updateTransaction)
router.delete('/:id', validateTransactionIdParam, deleteTransaction)

export default router
