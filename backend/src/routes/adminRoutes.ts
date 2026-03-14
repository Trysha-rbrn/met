import { Router } from 'express'
import {
  deleteUserAsAdmin,
  getUserDetails,
  listAuditLogs,
  listUsers,
  setUserBanState
} from '../controllers/adminController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import { adminOnly } from '../middleware/adminMiddleware.ts'
import { validateAdminSetBanState, validateUserIdParam } from '../middleware/validationMiddleware.ts'

const router = Router()

router.use(auth, adminOnly)

router.get('/users', listUsers)
router.get('/users/:id', validateUserIdParam, getUserDetails)
router.patch('/users/:id/ban', validateUserIdParam, validateAdminSetBanState, setUserBanState)
router.delete('/users/:id', validateUserIdParam, deleteUserAsAdmin)
router.get('/audit-logs', listAuditLogs)

export default router
