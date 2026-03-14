import { Router } from 'express'
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../controllers/categoryController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import { validateCategoryIdParam, validateCreateCategory, validateUpdateCategory } from '../middleware/validationMiddleware.ts'

const router = Router()

router.use(auth) // All category routes are protected

router.get('/', getCategories)
router.post('/', validateCreateCategory, createCategory)
router.put('/:id', validateUpdateCategory, updateCategory)
router.delete('/:id', validateCategoryIdParam, deleteCategory)

export default router
