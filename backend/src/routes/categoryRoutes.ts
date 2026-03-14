import { Router } from 'express'
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  getBudgetGoals,
  createBudgetGoal,
  updateBudgetGoal,
  deleteBudgetGoal
} from '../controllers/categoryController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import { premiumOrAdminOnly } from '../middleware/premiumMiddleware.ts'
import {
  validateBudgetGoalIdParam,
  validateBudgetMonthQuery,
  validateCategoryIdParam,
  validateCreateBudgetGoal,
  validateCreateCategory,
  validateUpdateBudgetGoal,
  validateUpdateCategory
} from '../middleware/validationMiddleware.ts'

const router = Router()

router.use(auth) // All category routes are protected

router.get('/', getCategories)
router.post('/', validateCreateCategory, createCategory)
router.put('/:id', validateUpdateCategory, updateCategory)
router.delete('/:id', validateCategoryIdParam, deleteCategory)
router.get('/budgets', premiumOrAdminOnly, validateBudgetMonthQuery, getBudgetGoals)
router.post('/budgets', premiumOrAdminOnly, validateCreateBudgetGoal, createBudgetGoal)
router.patch('/budgets/:id', premiumOrAdminOnly, validateUpdateBudgetGoal, updateBudgetGoal)
router.delete('/budgets/:id', premiumOrAdminOnly, validateBudgetGoalIdParam, deleteBudgetGoal)

export default router
