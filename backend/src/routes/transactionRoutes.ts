import { Router } from 'express'
import { 
  bulkAssignTransactionCategory,
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  getBenchmark,
  getInsights,
  getSummary,
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  runDueRecurringTransactions,
  splitTransaction
} from '../controllers/transactionController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import { csrfProtect } from '../middleware/csrfMiddleware.ts'
import { premiumOrAdminOnly } from '../middleware/premiumMiddleware.ts'
import {
  validateCreateTransaction,
  validateCreateRecurringTransaction,
  validateRecurringTransactionIdParam,
  validateSplitTransaction,
  validateTransactionIdParam,
  validateTransactionListQuery,
  validateUpdateRecurringTransaction,
  validateUpdateTransaction,
  validateBulkAssignTransactionCategory
} from '../middleware/validationMiddleware.ts'

const router = Router()

router.use(auth) // All transaction routes are protected

router.get('/', validateTransactionListQuery, getTransactions)
router.get('/summary', validateTransactionListQuery, getSummary)
router.get('/insights', premiumOrAdminOnly, validateTransactionListQuery, getInsights)
router.get('/benchmark', premiumOrAdminOnly, validateTransactionListQuery, getBenchmark)
router.get('/recurring', premiumOrAdminOnly, getRecurringTransactions)
router.post('/recurring', premiumOrAdminOnly, csrfProtect, validateCreateRecurringTransaction, createRecurringTransaction)
router.post('/recurring/run-due', premiumOrAdminOnly, csrfProtect, runDueRecurringTransactions)
router.put('/recurring/:id', premiumOrAdminOnly, csrfProtect, validateUpdateRecurringTransaction, updateRecurringTransaction)
router.delete('/recurring/:id', premiumOrAdminOnly, csrfProtect, validateRecurringTransactionIdParam, deleteRecurringTransaction)
router.patch('/bulk/category', premiumOrAdminOnly, csrfProtect, validateBulkAssignTransactionCategory, bulkAssignTransactionCategory)
router.post('/:id/split', premiumOrAdminOnly, csrfProtect, validateSplitTransaction, splitTransaction)
router.post('/', csrfProtect, validateCreateTransaction, createTransaction)
router.put('/:id', csrfProtect, validateUpdateTransaction, updateTransaction)
router.delete('/:id', csrfProtect, validateTransactionIdParam, deleteTransaction)

export default router
