import { Router } from 'express'
import { auth } from '../middleware/authMiddleware.ts'
import { getAccounts, createAccount } from '../controllers/accountController.ts'

const router = Router()

router.use(auth)

router.get('/', getAccounts)
router.post('/', createAccount)

export default router
