import { Router } from 'express'
import { 
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  getSummary,
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  runDueRecurringTransactions
} from '../controllers/transactionController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import { premiumOrAdminOnly } from '../middleware/premiumMiddleware.ts'
import {
  validateCreateTransaction,
  validateCreateRecurringTransaction,
  validateRecurringTransactionIdParam,
  validateTransactionIdParam,
  validateTransactionListQuery,
  validateUpdateRecurringTransaction,
  validateUpdateTransaction
} from '../middleware/validationMiddleware.ts'

const router = Router()

router.use(auth) // All transaction routes are protected

router.get('/', validateTransactionListQuery, getTransactions)
router.get('/summary', validateTransactionListQuery, getSummary)
router.get('/recurring', premiumOrAdminOnly, getRecurringTransactions)
router.post('/recurring', premiumOrAdminOnly, validateCreateRecurringTransaction, createRecurringTransaction)
router.post('/recurring/run-due', premiumOrAdminOnly, runDueRecurringTransactions)
router.put('/recurring/:id', premiumOrAdminOnly, validateUpdateRecurringTransaction, updateRecurringTransaction)
router.delete('/recurring/:id', premiumOrAdminOnly, validateRecurringTransactionIdParam, deleteRecurringTransaction)
router.post('/', validateCreateTransaction, createTransaction)
router.put('/:id', validateUpdateTransaction, updateTransaction)
router.delete('/:id', validateTransactionIdParam, deleteTransaction)

export default router
