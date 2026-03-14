import { NextFunction, Request, Response } from 'express'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TX_TYPES = new Set(['INCOME', 'EXPENSE'])

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

  const { name, currentPassword, newPassword } = req.body
  const errors: string[] = []

  if (typeof name !== 'undefined' && typeof name !== 'string') errors.push('Name must be a string.')
  if (typeof name === 'string' && name.trim().length > 80) errors.push('Name can be up to 80 characters.')

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
