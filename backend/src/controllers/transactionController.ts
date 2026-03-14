import { NextFunction, Request, Response } from 'express'
import { PrismaClient, RecurringFrequency, UserRole } from '@prisma/client'
import { writeAuditLog } from '../lib/auditLog.ts'

const prisma = new PrismaClient()

const toQueryString = (value: unknown) => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

const toBodyString = (value: unknown) => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

const normalizeDate = (value: Date | string) => {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

const addFrequency = (date: Date, frequency: RecurringFrequency) => {
  const next = new Date(date)
  if (frequency === 'DAILY') {
    next.setUTCDate(next.getUTCDate() + 1)
    return next
  }
  if (frequency === 'WEEKLY') {
    next.setUTCDate(next.getUTCDate() + 7)
    return next
  }
  next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

const assertRecurringOwnership = async (id: string, userId: string) => {
  const recurring = await prisma.recurringTransaction.findUnique({
    where: { id },
    include: {
      category: true,
      account: true
    }
  })

  if (!recurring || recurring.userId !== userId) {
    return null
  }

  return recurring
}

const createRecurringOccurrence = async ({
  recurringId,
  userId,
  userRole,
  scheduledDate,
  amount,
  description,
  type,
  categoryId,
  accountId
}: {
  recurringId: string
  userId: string
  userRole: UserRole
  scheduledDate: Date
  amount: number
  description?: string | null
  type: 'INCOME' | 'EXPENSE'
  categoryId: string
  accountId?: string | null
}) => {
  const transaction = await prisma.transaction.create({
    data: {
      amount,
      description,
      date: scheduledDate,
      type,
      userId,
      accountId,
      categoryId,
      metadata: {
        recurring: true,
        recurringTransactionId: recurringId,
        scheduledFor: scheduledDate.toISOString()
      }
    },
    include: {
      category: true,
      account: true
    }
  })

  await writeAuditLog({
    actorUserId: userId,
    actorRole: userRole,
    targetUserId: userId,
    action: 'TRANSACTION_CREATE_FROM_RECURRING',
    details: { transactionId: transaction.id, recurringTransactionId: recurringId, amount, type }
  })

  return transaction
}

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const accountId = toQueryString(req.query.accountId)
  try {
    const where = {
      userId,
      ...(accountId ? { accountId } : {})
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true
      },
      orderBy: { date: 'desc' }
    })
    res.json(transactions)
  } catch (error) {
    next(error)
  }
}

export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const { amount, description, date, type, categoryId, accountId, metadata } = req.body
  try {
    let resolvedAccountId = toBodyString(accountId)
    const resolvedCategoryId = toBodyString(categoryId)

    if (!resolvedCategoryId) {
      return res.status(400).json({ error: 'Category is required.' })
    }

    if (resolvedAccountId) {
      const account = await prisma.account.findFirst({ where: { id: resolvedAccountId, userId } })
      if (!account) return res.status(403).json({ error: 'Invalid account' })
    } else {
      const defaultAccount = await prisma.account.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      })
      resolvedAccountId = defaultAccount?.id
    }

    const category = await prisma.category.findFirst({ where: { id: resolvedCategoryId, userId } })
    if (!category) return res.status(403).json({ error: 'Invalid category' })
    if (category.type !== type) {
      return res.status(400).json({ error: 'Transaction type does not match selected category.' })
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
        type,
        userId,
        accountId: resolvedAccountId,
        categoryId: category.id,
        metadata: metadata || {}
      },
      include: {
        category: true,
        account: true
      }
    })
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'TRANSACTION_CREATE',
      details: { transactionId: transaction.id, amount: transaction.amount, type: transaction.type }
    })
    res.status(201).json(transaction)
  } catch (error) {
    next(error)
  }
}

export const updateTransaction = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const id = toQueryString(req.params.id)
  const { amount, description, date, type, categoryId, accountId, metadata } = req.body
  try {
    if (!id) {
      return res.status(400).json({ error: 'Transaction id is required.' })
    }

    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

    const resolvedAccountId = toBodyString(accountId)
    const resolvedCategoryId = toBodyString(categoryId)

    if (resolvedAccountId) {
      const account = await prisma.account.findFirst({ where: { id: resolvedAccountId, userId } })
      if (!account) return res.status(403).json({ error: 'Invalid account' })
    }

    if (resolvedCategoryId) {
      const category = await prisma.category.findFirst({ where: { id: resolvedCategoryId, userId } })
      if (!category) return res.status(403).json({ error: 'Invalid category' })

      const resolvedType = type ?? existing.type
      if (category.type !== resolvedType) {
        return res.status(400).json({ error: 'Transaction type does not match selected category.' })
      }
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        description,
        date: date ? new Date(date) : undefined,
        type,
        categoryId: resolvedCategoryId || undefined,
        accountId: resolvedAccountId || undefined,
        metadata: metadata || undefined
      },
      include: {
        category: true,
        account: true
      }
    })
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'TRANSACTION_UPDATE',
      details: { transactionId: transaction.id }
    })
    res.json(transaction)
  } catch (error) {
    next(error)
  }
}

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const id = toQueryString(req.params.id)
  try {
    if (!id) {
      return res.status(400).json({ error: 'Transaction id is required.' })
    }

    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

    await prisma.transaction.delete({
      where: { id }
    })
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'TRANSACTION_DELETE',
      details: { transactionId: id, amount: existing.amount, type: existing.type }
    })
    res.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const accountId = toQueryString(req.query.accountId)
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        ...(accountId ? { accountId } : {})
      }
    })

    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, curr) => acc + curr.amount, 0)

    const expenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, curr) => acc + curr.amount, 0)

    res.json({
      totalBalance: income - expenses,
      totalIncome: income,
      totalExpenses: expenses
    })
  } catch (error) {
    next(error)
  }
}

export const getRecurringTransactions = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  try {
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: { userId },
      include: {
        category: true,
        account: true
      },
      orderBy: [
        { isActive: 'desc' },
        { nextRunDate: 'asc' }
      ]
    })

    res.json(recurringTransactions)
  } catch (error) {
    next(error)
  }
}

export const createRecurringTransaction = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const { amount, description, type, categoryId, accountId, frequency, startDate, endDate } = req.body

  try {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId } })
    if (!category) return res.status(403).json({ error: 'Invalid category' })
    if (category.type !== type) {
      return res.status(400).json({ error: 'Recurring transaction type does not match selected category.' })
    }

    if (accountId) {
      const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
      if (!account) return res.status(403).json({ error: 'Invalid account' })
    }

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId,
        accountId: accountId || null,
        categoryId,
        amount,
        description,
        type,
        frequency,
        startDate: normalizeDate(startDate),
        nextRunDate: normalizeDate(startDate),
        endDate: endDate ? normalizeDate(endDate) : null,
        isActive: true
      },
      include: {
        category: true,
        account: true
      }
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'RECURRING_TRANSACTION_CREATE',
      details: { recurringTransactionId: recurring.id, frequency: recurring.frequency, amount: recurring.amount }
    })

    res.status(201).json(recurring)
  } catch (error) {
    next(error)
  }
}

export const updateRecurringTransaction = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const id = toQueryString(req.params.id)

  try {
    if (!id) {
      return res.status(400).json({ error: 'Recurring transaction id is required.' })
    }

    const existing = await assertRecurringOwnership(id, userId)
    if (!existing) return res.status(403).json({ error: 'Unauthorized' })

    const nextType = req.body.type ?? existing.type
    const nextCategoryId = req.body.categoryId ?? existing.categoryId
    const nextAccountId = typeof req.body.accountId === 'undefined' ? existing.accountId : req.body.accountId

    const category = await prisma.category.findFirst({ where: { id: nextCategoryId, userId } })
    if (!category) return res.status(403).json({ error: 'Invalid category' })
    if (category.type !== nextType) {
      return res.status(400).json({ error: 'Recurring transaction type does not match selected category.' })
    }

    if (nextAccountId) {
      const account = await prisma.account.findFirst({ where: { id: nextAccountId, userId } })
      if (!account) return res.status(403).json({ error: 'Invalid account' })
    }

    const hasScheduleChange =
      typeof req.body.frequency !== 'undefined' ||
      typeof req.body.startDate !== 'undefined'

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        amount: req.body.amount,
        description: typeof req.body.description === 'undefined' ? undefined : req.body.description,
        type: req.body.type,
        categoryId: req.body.categoryId,
        accountId: typeof req.body.accountId === 'undefined' ? undefined : (req.body.accountId || null),
        frequency: req.body.frequency,
        startDate: typeof req.body.startDate === 'undefined' ? undefined : normalizeDate(req.body.startDate),
        nextRunDate: hasScheduleChange
          ? normalizeDate(req.body.startDate ?? existing.startDate)
          : undefined,
        endDate: typeof req.body.endDate === 'undefined'
          ? undefined
          : (req.body.endDate ? normalizeDate(req.body.endDate) : null),
        isActive: req.body.isActive
      },
      include: {
        category: true,
        account: true
      }
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'RECURRING_TRANSACTION_UPDATE',
      details: { recurringTransactionId: updated.id }
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
}

export const deleteRecurringTransaction = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const id = toQueryString(req.params.id)

  try {
    if (!id) {
      return res.status(400).json({ error: 'Recurring transaction id is required.' })
    }

    const existing = await assertRecurringOwnership(id, userId)
    if (!existing) return res.status(403).json({ error: 'Unauthorized' })

    await prisma.recurringTransaction.delete({ where: { id } })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'RECURRING_TRANSACTION_DELETE',
      details: { recurringTransactionId: id }
    })

    res.json({ message: 'Recurring transaction deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const runDueRecurringTransactions = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole

  try {
    const now = normalizeDate(new Date())
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true,
        nextRunDate: { lte: now }
      },
      include: {
        category: true,
        account: true
      },
      orderBy: { nextRunDate: 'asc' }
    })

    const createdTransactions = []

    for (const recurring of recurringTransactions) {
      let iterations = 0
      let createdForRecurring = 0
      let nextRunDate = normalizeDate(recurring.nextRunDate)

      while (nextRunDate <= now && iterations < 24) {
        if (recurring.endDate && nextRunDate > normalizeDate(recurring.endDate)) {
          break
        }

        const transaction = await createRecurringOccurrence({
          recurringId: recurring.id,
          userId,
          userRole,
          scheduledDate: new Date(nextRunDate),
          amount: recurring.amount,
          description: recurring.description,
          type: recurring.type,
          categoryId: recurring.categoryId,
          accountId: recurring.accountId
        })
        createdTransactions.push(transaction)
        createdForRecurring += 1
        nextRunDate = addFrequency(nextRunDate, recurring.frequency)
        iterations += 1
      }

      const shouldDeactivate = Boolean(recurring.endDate && nextRunDate > normalizeDate(recurring.endDate))

      await prisma.recurringTransaction.update({
        where: { id: recurring.id },
        data: {
          nextRunDate,
          lastRunAt: createdForRecurring > 0 ? now : recurring.lastRunAt,
          isActive: shouldDeactivate ? false : recurring.isActive
        }
      })
    }

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'RECURRING_TRANSACTION_RUN_DUE',
      details: { createdTransactions: createdTransactions.length }
    })

    res.json({
      createdCount: createdTransactions.length,
      transactions: createdTransactions
    })
  } catch (error) {
    next(error)
  }
}
