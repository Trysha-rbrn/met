import { Router } from 'express'
import { auth } from '../middleware/authMiddleware.ts'
import { createTransferLog, getTransferLogs } from '../controllers/dataTransferController.ts'
import { validateCreateTransferLog } from '../middleware/validationMiddleware.ts'

const router = Router()

router.use(auth)
router.get('/', getTransferLogs)
router.post('/', validateCreateTransferLog, createTransferLog)

export default router
