import { Router } from 'express'
import {
  createPromoCode,
  deleteUserAsAdmin,
  getUserDetails,
  listAuditLogs,
  listPromoCodes,
  listUsers,
  setPromoCodeState,
  setUserRoleAsAdmin,
  setUserBanState
} from '../controllers/adminController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import { adminOnly } from '../middleware/adminMiddleware.ts'
import {
  validateAdminSetBanState,
  validateAdminSetUserRole,
  validateCreatePromoCode,
  validateSetPromoCodeState,
  validateUserIdParam
} from '../middleware/validationMiddleware.ts'

const router = Router()

router.use(auth, adminOnly)

router.get('/users', listUsers)
router.get('/users/:id', validateUserIdParam, getUserDetails)
router.patch('/users/:id/ban', validateUserIdParam, validateAdminSetBanState, setUserBanState)
router.patch('/users/:id/role', validateUserIdParam, validateAdminSetUserRole, setUserRoleAsAdmin)
router.delete('/users/:id', validateUserIdParam, deleteUserAsAdmin)
router.get('/audit-logs', listAuditLogs)
router.get('/promo-codes', listPromoCodes)
router.post('/promo-codes', validateCreatePromoCode, createPromoCode)
router.patch('/promo-codes/:id/state', validateSetPromoCodeState, setPromoCodeState)

export default router
