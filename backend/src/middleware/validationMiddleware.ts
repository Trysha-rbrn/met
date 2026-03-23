import { NextFunction, Request, Response } from 'express'
import { SUPPORTED_CURRENCIES } from '../lib/currency.ts'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ICON_KEY_REGEX = /^[A-Za-z][A-Za-z0-9]{0,39}$/
const TX_TYPES = new Set(['INCOME', 'EXPENSE'])
const SUPPORTED_CURRENCIES_SET = new Set(SUPPORTED_CURRENCIES)
const TRANSFER_ACTIONS = new Set(['IMPORT', 'EXPORT'])
const TRANSFER_FORMATS = new Set(['EXCEL', 'PDF'])
const BILLING_INTERVALS = new Set(['MONTHLY', 'YEARLY'])
const RECURRING_FREQUENCIES = new Set(['DAILY', 'WEEKLY', 'MONTHLY'])
const BILLING_EVENT_TYPES = new Set([
  'subscription.activated',
  'subscription.renewed',
  'subscription.canceled',
  'subscription.expired',
  'subscription.payment_failed'
])

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const toTrimmedString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const isValidUuid = (value: unknown) => typeof value === 'string' && UUID_REGEX.test(value)

const parseAmount = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(parsed)) return null
  return parsed
}

const validateEmail = (email: string) => email.length <= 254 && EMAIL_REGEX.test(email)
const MONTH_QUERY_REGEX = /^\d{4}-\d{2}$/

const sendValidationError = (res: Response, errors: string[]) =>
  res.status(400).json({ error: errors[0], details: errors })

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const email = toTrimmedString(req.body.email).toLowerCase()
  const password = toTrimmedString(req.body.password)
  const name = req.body.name
  const errors: string[] = []

  if (!validateEmail(email)) errors.push('Valid email is required.')
  if (password.length < 8 || password.length > 128) errors.push('Password must be between 8 and 128 characters.')
  if (typeof name !== 'undefined' && typeof name !== 'string') errors.push('Name must be a string.')
  if (typeof name === 'string' && name.trim().length > 80) errors.push('Name can be up to 80 characters.')

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.email = email
  req.body.password = password
  req.body.name = typeof name === 'string' ? name.trim() : undefined
  return next()
}

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const email = toTrimmedString(req.body.email).toLowerCase()
  const password = toTrimmedString(req.body.password)
  const errors: string[] = []

  if (!validateEmail(email)) errors.push('Valid email is required.')
  if (!password) errors.push('Password is required.')

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.email = email
  req.body.password = password
  return next()
}

export const validateUpdateProfile = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const { name, currentPassword, newPassword, preferredCurrency } = req.body
  const errors: string[] = []

  if (typeof name !== 'undefined' && typeof name !== 'string') errors.push('Name must be a string.')
  if (typeof name === 'string' && name.trim().length > 80) errors.push('Name can be up to 80 characters.')
  if (typeof preferredCurrency !== 'undefined') {
    const normalizedCurrency = toTrimmedString(preferredCurrency).toUpperCase()
    if (!SUPPORTED_CURRENCIES_SET.has(normalizedCurrency as (typeof SUPPORTED_CURRENCIES)[number])) {
      errors.push('Preferred currency is not supported.')
    } else {
      req.body.preferredCurrency = normalizedCurrency
    }
  }

  if (typeof currentPassword !== 'undefined' && !isNonEmptyString(currentPassword)) {
    errors.push('Current password must be a non-empty string.')
  }

  if (typeof newPassword !== 'undefined') {
    if (!isNonEmptyString(newPassword)) {
      errors.push('New password must be a non-empty string.')
    } else if (newPassword.trim().length < 8 || newPassword.trim().length > 128) {
      errors.push('New password must be between 8 and 128 characters.')
    }
    if (!isNonEmptyString(currentPassword)) {
      errors.push('Current password is required when setting a new password.')
    }
  }

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.name = typeof name === 'string' ? name.trim() : undefined
  req.body.currentPassword = typeof currentPassword === 'string' ? currentPassword.trim() : undefined
  req.body.newPassword = typeof newPassword === 'string' ? newPassword.trim() : undefined
  return next()
}

export const validateDeleteProfile = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const password = toTrimmedString(req.body.password)
  if (!password) return sendValidationError(res, ['Password is required.'])

  req.body.password = password
  return next()
}

export const validateTransactionListQuery = (req: Request, res: Response, next: NextFunction) => {
  const accountId = req.query.accountId
  if (typeof accountId !== 'undefined' && !isValidUuid(accountId)) {
    return sendValidationError(res, ['accountId must be a valid UUID.'])
  }
  return next()
}

export const validateCreateTransaction = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const errors: string[] = []
  const amount = parseAmount(req.body.amount)
  const description = req.body.description
  const date = req.body.date
  const type = req.body.type
  const categoryId = req.body.categoryId
  const accountId = req.body.accountId

  if (amount === null || amount <= 0) errors.push('Amount must be a positive number.')
  if (typeof description !== 'undefined' && typeof description !== 'string') errors.push('Description must be a string.')
  if (typeof description === 'string' && description.length > 500) errors.push('Description can be up to 500 characters.')
  if (!TX_TYPES.has(String(type))) errors.push('Type must be INCOME or EXPENSE.')
  if (!isValidUuid(categoryId)) errors.push('categoryId must be a valid UUID.')
  if (typeof accountId !== 'undefined' && !isValidUuid(accountId)) errors.push('accountId must be a valid UUID.')
  if (typeof date !== 'undefined' && Number.isNaN(new Date(String(date)).getTime())) errors.push('Date must be a valid ISO date.')

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.amount = amount
  req.body.type = String(type)
  req.body.description = typeof description === 'string' ? description.trim() : undefined
  req.body.categoryId = categoryId
  req.body.accountId = accountId
  return next()
}

export const validateUpdateTransaction = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Transaction id must be a valid UUID.'])
  }

  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const hasAnyField = ['amount', 'description', 'date', 'type', 'categoryId', 'accountId', 'metadata']
    .some((field) => typeof req.body[field] !== 'undefined')
  if (!hasAnyField) {
    return sendValidationError(res, ['At least one field must be provided for update.'])
  }

  const errors: string[] = []
  const { amount, description, date, type, categoryId, accountId } = req.body

  if (typeof amount !== 'undefined') {
    const parsedAmount = parseAmount(amount)
    if (parsedAmount === null || parsedAmount <= 0) {
      errors.push('Amount must be a positive number.')
    } else {
      req.body.amount = parsedAmount
    }
  }

  if (typeof description !== 'undefined' && typeof description !== 'string') errors.push('Description must be a string.')
  if (typeof description === 'string' && description.length > 500) errors.push('Description can be up to 500 characters.')
  if (typeof type !== 'undefined' && !TX_TYPES.has(String(type))) errors.push('Type must be INCOME or EXPENSE.')
  if (typeof categoryId !== 'undefined' && !isValidUuid(categoryId)) errors.push('categoryId must be a valid UUID.')
  if (typeof accountId !== 'undefined' && !isValidUuid(accountId)) errors.push('accountId must be a valid UUID.')
  if (typeof date !== 'undefined' && Number.isNaN(new Date(String(date)).getTime())) errors.push('Date must be a valid ISO date.')

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.type = typeof type !== 'undefined' ? String(type) : undefined
  req.body.description = typeof description === 'string' ? description.trim() : description
  return next()
}

export const validateTransactionIdParam = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Transaction id must be a valid UUID.'])
  }
  return next()
}

export const validateBulkAssignTransactionCategory = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const transactionIds = Array.isArray(req.body.transactionIds) ? req.body.transactionIds : []
  const categoryId = toTrimmedString(req.body.categoryId)
  const errors: string[] = []

  if (transactionIds.length === 0) errors.push('transactionIds must contain at least one id.')
  if (transactionIds.length > 200) errors.push('transactionIds can include up to 200 ids.')
  if (typeof categoryId !== 'undefined' && categoryId !== null && !isValidUuid(categoryId)) {
    errors.push('categoryId must be a valid UUID.')
  }
  if (transactionIds.some((id) => !isValidUuid(id))) errors.push('Each transaction id must be a valid UUID.')

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.transactionIds = [...new Set(transactionIds)]
  req.body.categoryId = typeof categoryId === 'undefined' || categoryId === null ? undefined : categoryId
  return next()
}

export const validateSplitTransaction = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Transaction id must be a valid UUID.'])
  }

  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const splits = Array.isArray(req.body.splits) ? req.body.splits : []
  const errors: string[] = []

  if (splits.length < 2) errors.push('At least two splits are required.')
  if (splits.length > 20) errors.push('Up to 20 splits are allowed per request.')

  const normalizedSplits = splits.map((entry) => {
    const payload = isPlainObject(entry) ? entry : {}
    const amount = parseAmount(payload.amount)
    const categoryId = toTrimmedString(payload.categoryId)
    const description = typeof payload.description === 'string' ? payload.description.trim() : ''
    return {
      amount,
      categoryId,
      description: description || undefined
    }
  })

  if (normalizedSplits.some((entry) => entry.amount === null || (entry.amount || 0) <= 0)) {
    errors.push('Each split amount must be a positive number.')
  }
  if (normalizedSplits.some((entry) => !isValidUuid(entry.categoryId))) {
    errors.push('Each split categoryId must be a valid UUID.')
  }

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.splits = normalizedSplits
  return next()
}

export const validateCreateRecurringTransaction = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const errors: string[] = []
  const amount = parseAmount(req.body.amount)
  const description = req.body.description
  const type = toTrimmedString(req.body.type).toUpperCase()
  const categoryId = toTrimmedString(req.body.categoryId)
  const accountId = typeof req.body.accountId === 'undefined' || req.body.accountId === null
    ? undefined
    : toTrimmedString(req.body.accountId)
  const frequency = toTrimmedString(req.body.frequency).toUpperCase()
  const startDate = req.body.startDate
  const endDate = req.body.endDate

  if (amount === null || amount <= 0) errors.push('Amount must be a positive number.')
  if (typeof description !== 'undefined' && description !== null && typeof description !== 'string') {
    errors.push('Description must be a string.')
  }
  if (typeof description === 'string' && description.length > 500) errors.push('Description can be up to 500 characters.')
  if (!TX_TYPES.has(type)) errors.push('Type must be INCOME or EXPENSE.')
  if (!isValidUuid(categoryId)) errors.push('categoryId must be a valid UUID.')
  if (typeof accountId !== 'undefined' && accountId !== '' && !isValidUuid(accountId)) {
    errors.push('accountId must be a valid UUID.')
  }
  if (!RECURRING_FREQUENCIES.has(frequency)) errors.push('frequency must be DAILY, WEEKLY or MONTHLY.')
  if (Number.isNaN(new Date(String(startDate)).getTime())) errors.push('startDate must be a valid ISO date.')
  if (typeof endDate !== 'undefined' && endDate !== null && Number.isNaN(new Date(String(endDate)).getTime())) {
    errors.push('endDate must be a valid ISO date.')
  }
  if (
    typeof endDate !== 'undefined' &&
    endDate !== null &&
    !Number.isNaN(new Date(String(startDate)).getTime()) &&
    !Number.isNaN(new Date(String(endDate)).getTime()) &&
    new Date(String(endDate)).getTime() < new Date(String(startDate)).getTime()
  ) {
    errors.push('endDate must be on or after startDate.')
  }

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.amount = amount
  req.body.description = typeof description === 'string' ? description.trim() : undefined
  req.body.type = type
  req.body.categoryId = categoryId
  req.body.accountId = accountId || undefined
  req.body.frequency = frequency
  return next()
}

export const validateUpdateRecurringTransaction = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Recurring transaction id must be a valid UUID.'])
  }

  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const hasAnyField = ['amount', 'description', 'type', 'categoryId', 'accountId', 'frequency', 'startDate', 'endDate', 'isActive']
    .some((field) => typeof req.body[field] !== 'undefined')
  if (!hasAnyField) {
    return sendValidationError(res, ['At least one field must be provided for update.'])
  }

  const errors: string[] = []
  const { amount, description, type, categoryId, accountId, frequency, startDate, endDate, isActive } = req.body

  if (typeof amount !== 'undefined') {
    const parsedAmount = parseAmount(amount)
    if (parsedAmount === null || parsedAmount <= 0) {
      errors.push('Amount must be a positive number.')
    } else {
      req.body.amount = parsedAmount
    }
  }

  if (typeof description !== 'undefined' && description !== null && typeof description !== 'string') {
    errors.push('Description must be a string.')
  }
  if (typeof description === 'string' && description.length > 500) errors.push('Description can be up to 500 characters.')

  if (typeof type !== 'undefined') {
    const normalizedType = toTrimmedString(type).toUpperCase()
    if (!TX_TYPES.has(normalizedType)) {
      errors.push('Type must be INCOME or EXPENSE.')
    } else {
      req.body.type = normalizedType
    }
  }

  if (typeof categoryId !== 'undefined' && !isValidUuid(categoryId)) {
    errors.push('categoryId must be a valid UUID.')
  }

  if (typeof accountId !== 'undefined' && accountId !== null && toTrimmedString(accountId) !== '' && !isValidUuid(accountId)) {
    errors.push('accountId must be a valid UUID.')
  }
  if (typeof accountId !== 'undefined') {
    req.body.accountId = accountId === null ? null : toTrimmedString(accountId) || undefined
  }

  if (typeof frequency !== 'undefined') {
    const normalizedFrequency = toTrimmedString(frequency).toUpperCase()
    if (!RECURRING_FREQUENCIES.has(normalizedFrequency)) {
      errors.push('frequency must be DAILY, WEEKLY or MONTHLY.')
    } else {
      req.body.frequency = normalizedFrequency
    }
  }

  if (typeof startDate !== 'undefined' && Number.isNaN(new Date(String(startDate)).getTime())) {
    errors.push('startDate must be a valid ISO date.')
  }

  if (typeof endDate !== 'undefined' && endDate !== null && Number.isNaN(new Date(String(endDate)).getTime())) {
    errors.push('endDate must be a valid ISO date.')
  }
  if (
    typeof startDate !== 'undefined' &&
    typeof endDate !== 'undefined' &&
    startDate !== null &&
    endDate !== null &&
    !Number.isNaN(new Date(String(startDate)).getTime()) &&
    !Number.isNaN(new Date(String(endDate)).getTime()) &&
    new Date(String(endDate)).getTime() < new Date(String(startDate)).getTime()
  ) {
    errors.push('endDate must be on or after startDate.')
  }

  if (typeof isActive !== 'undefined' && typeof isActive !== 'boolean') {
    errors.push('isActive must be a boolean value.')
  }

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.description = typeof description === 'string' ? description.trim() : description
  return next()
}

export const validateRecurringTransactionIdParam = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Recurring transaction id must be a valid UUID.'])
  }
  return next()
}

export const validateCreateCategory = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const { name, type, parentId, icon } = req.body
  const normalizedName = toTrimmedString(name)
  const normalizedIcon = typeof icon === 'string' ? icon.trim() : 'Tag'
  const errors: string[] = []

  if (!normalizedName || normalizedName.length > 80) errors.push('Category name must be between 1 and 80 characters.')
  if (!TX_TYPES.has(String(type))) errors.push('Type must be INCOME or EXPENSE.')
  if (typeof parentId !== 'undefined' && parentId !== null && !isValidUuid(parentId)) {
    errors.push('parentId must be a valid UUID or null.')
  }
  if (!ICON_KEY_REGEX.test(normalizedIcon)) errors.push('Icon key is invalid.')

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.name = normalizedName
  req.body.icon = normalizedIcon
  req.body.type = String(type)
  req.body.parentId = parentId ?? null
  return next()
}

export const validateUpdateCategory = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Category id must be a valid UUID.'])
  }

  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const hasAnyField = ['name', 'type', 'parentId', 'icon'].some((field) => typeof req.body[field] !== 'undefined')
  if (!hasAnyField) {
    return sendValidationError(res, ['At least one field must be provided for update.'])
  }

  const { name, type, parentId, icon } = req.body
  const errors: string[] = []

  if (typeof name !== 'undefined') {
    const normalizedName = toTrimmedString(name)
    if (!normalizedName || normalizedName.length > 80) {
      errors.push('Category name must be between 1 and 80 characters.')
    } else {
      req.body.name = normalizedName
    }
  }

  if (typeof type !== 'undefined' && !TX_TYPES.has(String(type))) errors.push('Type must be INCOME or EXPENSE.')
  if (typeof type !== 'undefined') req.body.type = String(type)

  if (typeof parentId !== 'undefined' && parentId !== null && !isValidUuid(parentId)) {
    errors.push('parentId must be a valid UUID or null.')
  }
  if (typeof parentId !== 'undefined') req.body.parentId = parentId ?? null

  if (typeof icon !== 'undefined') {
    const normalizedIcon = toTrimmedString(icon)
    if (!ICON_KEY_REGEX.test(normalizedIcon)) {
      errors.push('Icon key is invalid.')
    } else {
      req.body.icon = normalizedIcon
    }
  }

  if (errors.length > 0) return sendValidationError(res, errors)
  return next()
}

export const validateCategoryIdParam = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Category id must be a valid UUID.'])
  }
  return next()
}

export const validateCreateTransferLog = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const { action, format, rows } = req.body
  const errors: string[] = []

  if (!TRANSFER_ACTIONS.has(String(action))) errors.push('Action must be IMPORT or EXPORT.')
  if (!TRANSFER_FORMATS.has(String(format))) errors.push('Format must be EXCEL or PDF.')
  if (typeof rows !== 'undefined') {
    const parsedRows = Number(rows)
    if (!Number.isInteger(parsedRows) || parsedRows < 0) {
      errors.push('Rows must be a non-negative integer.')
    } else {
      req.body.rows = parsedRows
    }
  } else {
    req.body.rows = 0
  }

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.action = String(action)
  req.body.format = String(format)
  return next()
}

export const validateUserIdParam = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['User id must be a valid UUID.'])
  }
  return next()
}

export const validateAdminSetBanState = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  if (typeof req.body.isBanned !== 'boolean') {
    return sendValidationError(res, ['isBanned must be a boolean value.'])
  }

  return next()
}

export const validatePremiumActivation = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const code = toTrimmedString(req.body.code)
  if (!code) {
    return sendValidationError(res, ['Premium activation code is required.'])
  }

  req.body.code = code
  return next()
}

export const validateAdminSetUserRole = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const role = toTrimmedString(req.body.role).toUpperCase()
  if (role !== 'BASIC' && role !== 'PREMIUM') {
    return sendValidationError(res, ['Role must be BASIC or PREMIUM.'])
  }

  req.body.role = role
  return next()
}

export const validateSubscriptionUpgrade = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const billingInterval = toTrimmedString(req.body.billingInterval).toUpperCase() || 'MONTHLY'
  const code = typeof req.body.code === 'string' ? req.body.code.trim() : ''

  if (!BILLING_INTERVALS.has(billingInterval)) {
    return sendValidationError(res, ['billingInterval must be MONTHLY or YEARLY.'])
  }

  req.body.billingInterval = billingInterval
  req.body.code = code || undefined
  return next()
}

export const validateSubscriptionDowngrade = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body === 'undefined') {
    req.body = {}
  }

  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  if (typeof req.body.immediate !== 'undefined' && typeof req.body.immediate !== 'boolean') {
    return sendValidationError(res, ['immediate must be a boolean value.'])
  }

  req.body.immediate = Boolean(req.body.immediate)
  return next()
}

export const validateBillingWebhook = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const eventId = toTrimmedString(req.body.eventId)
  const type = toTrimmedString(req.body.type)
  const externalSubscriptionId = toTrimmedString(req.body.externalSubscriptionId)
  const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : ''
  const billingInterval = toTrimmedString(req.body.billingInterval).toUpperCase()
  const errors: string[] = []

  if (!eventId) errors.push('eventId is required.')
  if (!BILLING_EVENT_TYPES.has(type)) errors.push('Unsupported billing event type.')
  if (!userId && !externalSubscriptionId) errors.push('userId or externalSubscriptionId is required.')
  if (userId && !isValidUuid(userId)) errors.push('userId must be a valid UUID.')
  if (billingInterval && !BILLING_INTERVALS.has(billingInterval)) errors.push('billingInterval must be MONTHLY or YEARLY.')

  for (const key of ['currentPeriodStart', 'currentPeriodEnd', 'occurredAt'] as const) {
    if (typeof req.body[key] !== 'undefined' && Number.isNaN(new Date(String(req.body[key])).getTime())) {
      errors.push(`${key} must be a valid ISO date.`)
    }
  }

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.eventId = eventId
  req.body.type = type
  req.body.userId = userId || undefined
  req.body.externalSubscriptionId = externalSubscriptionId || undefined
  req.body.billingInterval = billingInterval || undefined
  return next()
}

export const validateCreatePromoCode = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const code = toTrimmedString(req.body.code).toUpperCase()
  const maxRedemptions = typeof req.body.maxRedemptions === 'undefined' || req.body.maxRedemptions === null
    ? undefined
    : Number(req.body.maxRedemptions)
  const expiresAt = typeof req.body.expiresAt === 'undefined' || req.body.expiresAt === null
    ? undefined
    : new Date(String(req.body.expiresAt))

  const errors: string[] = []

  if (!code || code.length < 4 || code.length > 40) errors.push('code must be between 4 and 40 characters.')
  if (!/^[A-Z0-9_-]+$/.test(code)) errors.push('code may only contain letters, numbers, "_" and "-".')
  if (typeof maxRedemptions !== 'undefined' && (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0)) {
    errors.push('maxRedemptions must be a positive integer.')
  }
  if (typeof expiresAt !== 'undefined' && Number.isNaN(expiresAt.getTime())) {
    errors.push('expiresAt must be a valid ISO date.')
  }

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.code = code
  req.body.maxRedemptions = maxRedemptions
  req.body.expiresAt = expiresAt?.toISOString()
  return next()
}

export const validateSetPromoCodeState = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Promo code id must be a valid UUID.'])
  }

  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  if (typeof req.body.isActive !== 'boolean') {
    return sendValidationError(res, ['isActive must be a boolean value.'])
  }

  return next()
}

export const validateUpdateBenchmarkPreference = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  if (typeof req.body.benchmarkOptOut !== 'boolean') {
    return sendValidationError(res, ['benchmarkOptOut must be a boolean value.'])
  }

  return next()
}

export const validateCreateCategoryRule = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const keyword = toTrimmedString(req.body.keyword).toLowerCase()
  const categoryId = toTrimmedString(req.body.categoryId)
  const isActive = typeof req.body.isActive === 'undefined' ? true : req.body.isActive
  const errors: string[] = []

  if (!keyword || keyword.length < 2 || keyword.length > 80) errors.push('keyword must be between 2 and 80 characters.')
  if (!isValidUuid(categoryId)) errors.push('categoryId must be a valid UUID.')
  if (typeof isActive !== 'boolean') errors.push('isActive must be a boolean value.')

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.keyword = keyword
  req.body.categoryId = categoryId
  req.body.isActive = isActive
  return next()
}

export const validateUpdateCategoryRule = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Rule id must be a valid UUID.'])
  }

  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const hasAnyField = ['keyword', 'categoryId', 'isActive'].some((field) => typeof req.body[field] !== 'undefined')
  if (!hasAnyField) {
    return sendValidationError(res, ['At least one field must be provided for update.'])
  }

  const errors: string[] = []

  if (typeof req.body.keyword !== 'undefined') {
    const keyword = toTrimmedString(req.body.keyword).toLowerCase()
    if (!keyword || keyword.length < 2 || keyword.length > 80) {
      errors.push('keyword must be between 2 and 80 characters.')
    } else {
      req.body.keyword = keyword
    }
  }

  if (typeof req.body.categoryId !== 'undefined' && !isValidUuid(req.body.categoryId)) {
    errors.push('categoryId must be a valid UUID.')
  }

  if (typeof req.body.isActive !== 'undefined' && typeof req.body.isActive !== 'boolean') {
    errors.push('isActive must be a boolean value.')
  }

  if (errors.length > 0) return sendValidationError(res, errors)
  return next()
}

export const validateBudgetMonthQuery = (req: Request, res: Response, next: NextFunction) => {
  const month = toTrimmedString(req.query.month)
  if (!month || !MONTH_QUERY_REGEX.test(month)) {
    return sendValidationError(res, ['month query must be in YYYY-MM format.'])
  }

  req.query.month = month
  return next()
}

export const validateCreateBudgetGoal = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const categoryId = toTrimmedString(req.body.categoryId)
  const month = toTrimmedString(req.body.month)
  const amount = parseAmount(req.body.amount)
  const errors: string[] = []

  if (!isValidUuid(categoryId)) errors.push('categoryId must be a valid UUID.')
  if (!MONTH_QUERY_REGEX.test(month)) errors.push('month must be in YYYY-MM format.')
  if (amount === null || amount <= 0) errors.push('amount must be a positive number.')

  if (errors.length > 0) return sendValidationError(res, errors)

  req.body.categoryId = categoryId
  req.body.month = month
  req.body.amount = amount
  return next()
}

export const validateUpdateBudgetGoal = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Budget goal id must be a valid UUID.'])
  }

  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  const amount = parseAmount(req.body.amount)
  if (amount === null || amount <= 0) {
    return sendValidationError(res, ['amount must be a positive number.'])
  }

  req.body.amount = amount
  return next()
}

export const validateBudgetGoalIdParam = (req: Request, res: Response, next: NextFunction) => {
  if (!isValidUuid(req.params.id)) {
    return sendValidationError(res, ['Budget goal id must be a valid UUID.'])
  }

  return next()
}

export const validateCreateAccount = (req: Request, res: Response, next: NextFunction) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(res, ['Invalid request body.'])
  }

  if (typeof req.body.name === 'undefined' || req.body.name === null || req.body.name === '') {
    req.body.name = undefined
    return next()
  }

  const name = toTrimmedString(req.body.name)
  if (!name || name.length > 80) {
    return sendValidationError(res, ['Account name must be between 1 and 80 characters.'])
  }

  req.body.name = name
  return next()
}
