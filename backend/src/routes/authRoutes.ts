import { Router } from 'express'
import { register, login, getMe, updateUser, deleteUser, resetUserData, activatePremium, updateBenchmarkPreference, logout } from '../controllers/authController.ts'
import {
  downgradeSubscription,
  getSubscription,
  handleBillingWebhook,
  resumeSubscription,
  upgradeSubscription
} from '../controllers/subscriptionController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import { csrfProtect } from '../middleware/csrfMiddleware.ts'
import { authRateLimit } from '../middleware/rateLimitMiddleware.ts'
import {
  validateBillingWebhook,
  validateDeleteProfile,
  validateLogin,
  validatePremiumActivation,
  validateRegister,
  validateSubscriptionDowngrade,
  validateSubscriptionUpgrade,
  validateUpdateBenchmarkPreference,
  validateUpdateProfile
} from '../middleware/validationMiddleware.ts'

const router = Router()

router.post('/billing-hook', validateBillingWebhook, handleBillingWebhook)
router.post('/register', authRateLimit, validateRegister, register)
router.post('/login', authRateLimit, validateLogin, login)
router.post('/logout', auth, csrfProtect, logout)
router.get('/me', auth, getMe)
router.get('/subscription', auth, getSubscription)
router.put('/profile', auth, csrfProtect, validateUpdateProfile, updateUser)
router.post('/activate-premium', auth, csrfProtect, validatePremiumActivation, activatePremium)
router.post('/subscription/upgrade', auth, csrfProtect, validateSubscriptionUpgrade, upgradeSubscription)
router.post('/subscription/downgrade', auth, csrfProtect, validateSubscriptionDowngrade, downgradeSubscription)
router.post('/subscription/resume', auth, csrfProtect, resumeSubscription)
router.post('/reset-data', auth, csrfProtect, validateDeleteProfile, resetUserData)
router.patch('/benchmark-preference', auth, csrfProtect, validateUpdateBenchmarkPreference, updateBenchmarkPreference)
router.delete('/profile', auth, csrfProtect, validateDeleteProfile, deleteUser)

export default router
