import { Router } from 'express'
import { auth } from '../middleware/authMiddleware.ts'
import { csrfProtect } from '../middleware/csrfMiddleware.ts'
import { getAccounts, createAccount } from '../controllers/accountController.ts'
import { validateCreateAccount } from '../middleware/validationMiddleware.ts'

const router = Router()

router.use(auth)

router.get('/', getAccounts)
router.post('/', csrfProtect, validateCreateAccount, createAccount)

export default router
