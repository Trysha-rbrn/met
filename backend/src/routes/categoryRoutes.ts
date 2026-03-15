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
router.post('/', validateCreateCategory, createCategory)
router.put('/:id', validateUpdateCategory, updateCategory)
router.delete('/:id', validateCategoryIdParam, deleteCategory)
router.get('/rules', premiumOrAdminOnly, getCategoryRules)
router.post('/rules', premiumOrAdminOnly, validateCreateCategoryRule, createCategoryRule)
router.patch('/rules/:id', premiumOrAdminOnly, validateUpdateCategoryRule, updateCategoryRule)
router.delete('/rules/:id', premiumOrAdminOnly, validateCategoryIdParam, deleteCategoryRule)
router.get('/budgets', premiumOrAdminOnly, validateBudgetMonthQuery, getBudgetGoals)
router.post('/budgets', premiumOrAdminOnly, validateCreateBudgetGoal, createBudgetGoal)
router.patch('/budgets/:id', premiumOrAdminOnly, validateUpdateBudgetGoal, updateBudgetGoal)
router.delete('/budgets/:id', premiumOrAdminOnly, validateBudgetGoalIdParam, deleteBudgetGoal)

export default router
