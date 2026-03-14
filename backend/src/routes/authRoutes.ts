import { Router } from 'express'
import { register, login, getMe, updateUser, deleteUser, resetUserData, activatePremium } from '../controllers/authController.ts'
import {
  downgradeSubscription,
  getSubscription,
  handleBillingWebhook,
  resumeSubscription,
  upgradeSubscription
} from '../controllers/subscriptionController.ts'
import { auth } from '../middleware/authMiddleware.ts'
import { authRateLimit } from '../middleware/rateLimitMiddleware.ts'
import {
  validateBillingWebhook,
  validateDeleteProfile,
  validateLogin,
  validatePremiumActivation,
  validateRegister,
  validateSubscriptionDowngrade,
  validateSubscriptionUpgrade,
  validateUpdateProfile
} from '../middleware/validationMiddleware.ts'

const router = Router()

router.post('/billing-hook', validateBillingWebhook, handleBillingWebhook)
router.post('/register', authRateLimit, validateRegister, register)
router.post('/login', authRateLimit, validateLogin, login)
router.get('/me', auth, getMe)
router.get('/subscription', auth, getSubscription)
router.put('/profile', auth, validateUpdateProfile, updateUser)
router.post('/activate-premium', auth, validatePremiumActivation, activatePremium)
router.post('/subscription/upgrade', auth, validateSubscriptionUpgrade, upgradeSubscription)
router.post('/subscription/downgrade', auth, validateSubscriptionDowngrade, downgradeSubscription)
router.post('/subscription/resume', auth, resumeSubscription)
router.post('/reset-data', auth, validateDeleteProfile, resetUserData)
router.delete('/profile', auth, validateDeleteProfile, deleteUser)

export default router
