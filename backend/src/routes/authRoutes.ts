import { Router } from 'express'
import { register, login, getMe, updateUser, deleteUser, resetUserData } from '../controllers/authController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import { authRateLimit } from '../middleware/rateLimitMiddleware.ts'
import { validateDeleteProfile, validateLogin, validateRegister, validateUpdateProfile } from '../middleware/validationMiddleware.ts'

const router = Router()

router.post('/register', authRateLimit, validateRegister, register)
router.post('/login', authRateLimit, validateLogin, login)
router.get('/me', auth, getMe)
router.put('/profile', auth, validateUpdateProfile, updateUser)
router.post('/reset-data', auth, validateDeleteProfile, resetUserData)
router.delete('/profile', auth, validateDeleteProfile, deleteUser)

export default router
