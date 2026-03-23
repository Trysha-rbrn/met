import { Router } from 'express'
import { 
  createCategoryRule,
  getCategories, 
  getCategoryRules,
  createCategory, 
  updateCategory, 
  deleteCategory,
  deleteCategoryRule,
  getBudgetGoals,
  createBudgetGoal,
  updateBudgetGoal,
  deleteBudgetGoal,
  updateCategoryRule
} from '../controllers/categoryController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import { csrfProtect } from '../middleware/csrfMiddleware.ts'
import { premiumOrAdminOnly } from '../middleware/premiumMiddleware.ts'
import {
  validateBudgetGoalIdParam,
  validateBudgetMonthQuery,
  validateCategoryIdParam,
  validateCreateBudgetGoal,
  validateCreateCategory,
  validateCreateCategoryRule,
  validateUpdateCategoryRule,
  validateUpdateBudgetGoal,
  validateUpdateCategory
} from '../middleware/validationMiddleware.ts'

const router = Router()

router.use(auth) // All category routes are protected

router.get('/', getCategories)
router.post('/', csrfProtect, validateCreateCategory, createCategory)
router.put('/:id', csrfProtect, validateUpdateCategory, updateCategory)
router.delete('/:id', csrfProtect, validateCategoryIdParam, deleteCategory)
router.get('/rules', premiumOrAdminOnly, getCategoryRules)
router.post('/rules', premiumOrAdminOnly, csrfProtect, validateCreateCategoryRule, createCategoryRule)
router.patch('/rules/:id', premiumOrAdminOnly, csrfProtect, validateUpdateCategoryRule, updateCategoryRule)
router.delete('/rules/:id', premiumOrAdminOnly, csrfProtect, validateCategoryIdParam, deleteCategoryRule)
router.get('/budgets', premiumOrAdminOnly, validateBudgetMonthQuery, getBudgetGoals)
router.post('/budgets', premiumOrAdminOnly, csrfProtect, validateCreateBudgetGoal, createBudgetGoal)
router.patch('/budgets/:id', premiumOrAdminOnly, csrfProtect, validateUpdateBudgetGoal, updateBudgetGoal)
router.delete('/budgets/:id', premiumOrAdminOnly, csrfProtect, validateBudgetGoalIdParam, deleteBudgetGoal)

export default router
