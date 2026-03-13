import { Router } from 'express'
import { register, login, getMe, updateUser, deleteUser } from '../controllers/authController.ts'
import { auth } from '../middleware/authMiddleware.ts'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', auth, getMe)
router.put('/profile', auth, updateUser)
router.delete('/profile', auth, deleteUser)

export default router
