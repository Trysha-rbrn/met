import { NextFunction, Request, Response } from 'express'
import { PrismaClient, RecurringFrequency, UserRole } from '@prisma/client'
import { writeAuditLog } from '../lib/auditLog.ts'

const prisma = new PrismaClient()
const BENCHMARK_MIN_COHORT_SIZE = 5

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

const normalizeKeyword = (value: string) => value.trim().toLowerCase()

const resolveCategoryFromRules = async (
  userId: string,
  description: string | undefined,
  type: 'INCOME' | 'EXPENSE'
) => {
  const normalizedDescription = normalizeKeyword(description || '')
  if (!normalizedDescription) return null

  const rules = await prisma.categoryRule.findMany({
    where: { userId, isActive: true },
    include: { category: true },
    orderBy: { createdAt: 'asc' }
  })

  const rule = rules.find((entry) => {
    if (entry.category.type !== type) return false
    return normalizedDescription.includes(normalizeKeyword(entry.keyword))
  })

  return rule?.category || null
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
    const providedCategoryId = toBodyString(categoryId)

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

    let category = providedCategoryId
      ? await prisma.category.findFirst({ where: { id: providedCategoryId, userId } })
      : null

    if (!category) {
      category = await resolveCategoryFromRules(userId, description, type)
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required or description must match an active auto-categorization rule.' })
    }
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

export const bulkAssignTransactionCategory = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const { transactionIds, categoryId } = req.body as { transactionIds: string[]; categoryId: string }

  try {
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category || category.userId !== userId) {
      return res.status(403).json({ error: 'Invalid category' })
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId
      },
      select: { id: true, type: true }
    })

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'No matching transactions found.' })
    }

    const validIds = transactions
      .filter((transaction) => transaction.type === category.type)
      .map((transaction) => transaction.id)

    if (validIds.length === 0) {
      return res.status(400).json({ error: 'Selected category type does not match any selected transactions.' })
    }

    const result = await prisma.transaction.updateMany({
      where: {
        id: { in: validIds },
        userId
      },
      data: { categoryId }
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'TRANSACTION_BULK_ASSIGN_CATEGORY',
      details: { categoryId, updatedCount: result.count }
    })

    res.json({ updatedCount: result.count, skippedCount: transactionIds.length - result.count })
  } catch (error) {
    next(error)
  }
}

export const splitTransaction = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const transactionId = String(req.params.id)
  const { splits } = req.body as {
    splits: Array<{ amount: number; categoryId: string; description?: string }>
  }

  try {
    const original = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { category: true, account: true }
    })

    if (!original || original.userId !== userId) {
      return res.status(404).json({ error: 'Transaction not found.' })
    }

    const categoryIds = [...new Set(splits.map((entry) => entry.categoryId))]
    const categories = await prisma.category.findMany({
      where: {
        userId,
        id: { in: categoryIds }
      }
    })
    const categoryMap = new Map(categories.map((category) => [category.id, category]))

    for (const split of splits) {
      const category = categoryMap.get(split.categoryId)
      if (!category) {
        return res.status(400).json({ error: 'One or more split categories are invalid.' })
      }
      if (category.type !== original.type) {
        return res.status(400).json({ error: 'Split category type must match the original transaction type.' })
      }
    }

    const splitTotal = splits.reduce((sum, entry) => sum + entry.amount, 0)
    if (Math.abs(splitTotal - original.amount) > 0.01) {
      return res.status(400).json({ error: 'Split amounts must add up to the original transaction amount.' })
    }

    const splitGroupId = `split_${transactionId}`
    const created = await prisma.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id: transactionId } })
      return Promise.all(
        splits.map((split, index) =>
          tx.transaction.create({
            data: {
              amount: split.amount,
              description: split.description || original.description,
              date: original.date,
              type: original.type,
              userId,
              accountId: original.accountId,
              categoryId: split.categoryId,
              metadata: {
                ...(typeof original.metadata === 'object' && original.metadata !== null ? original.metadata as Record<string, unknown> : {}),
                split: true,
                splitGroupId,
                splitPartIndex: index + 1,
                splitPartTotal: splits.length,
                sourceTransactionId: transactionId
              }
            },
            include: {
              category: true,
              account: true
            }
          })
        )
      )
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'TRANSACTION_SPLIT',
      details: { sourceTransactionId: transactionId, createdCount: created.length, splitGroupId }
    })

    res.status(201).json(created)
  } catch (error) {
    next(error)
  }
}

export const getInsights = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const accountId = toQueryString(req.query.accountId)

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        ...(accountId ? { accountId } : {})
      },
      include: {
        category: true,
        account: true
      },
      orderBy: { date: 'asc' }
    })

    const now = new Date()
    const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const scoped = transactions.filter((tx) => new Date(tx.date).getTime() >= last90Days.getTime())

    const categoryTotals = new Map<string, { name: string; amount: number }>()
    const weekdayExpenseTotals = new Map<number, { amount: number; count: number }>()

    let incomeTotal = 0
    let expenseTotal = 0
    for (const tx of scoped) {
      const txDate = new Date(tx.date)
      if (tx.type === 'INCOME') {
        incomeTotal += tx.amount
      } else {
        expenseTotal += tx.amount
        const day = txDate.getDay()
        const weekday = weekdayExpenseTotals.get(day) || { amount: 0, count: 0 }
        weekday.amount += tx.amount
        weekday.count += 1
        weekdayExpenseTotals.set(day, weekday)

        const categoryName = tx.category?.name || 'Uncategorized'
        const current = categoryTotals.get(categoryName) || { name: categoryName, amount: 0 }
        current.amount += tx.amount
        categoryTotals.set(categoryName, current)
      }
    }

    const topCategories = [...categoryTotals.values()].sort((a, b) => b.amount - a.amount).slice(0, 3)
    const topWeekday = [...weekdayExpenseTotals.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)[0]

    const monthlyNet = incomeTotal - expenseTotal
    const projectedSixMonths = monthlyNet * 6
    const savingsRate = incomeTotal > 0 ? (monthlyNet / incomeTotal) * 100 : 0

    const insights: string[] = []

    if (topWeekday) {
      const weekdayLabel = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][topWeekday[0]]
      const avg = topWeekday[1].count > 0 ? topWeekday[1].amount / topWeekday[1].count : topWeekday[1].amount
      insights.push(`Najviše trošiš ${weekdayLabel}-om (~${avg.toFixed(2)} prosečno po transakciji). Razmisli o budžetu za taj dan.`)
    }

    if (topCategories.length > 0) {
      insights.push(`Top 3 kategorije potrošnje su: ${topCategories.map((row) => row.name).join(', ')}.`)
    }

    insights.push(`Ako zadržiš trenutni tempo, za 6 meseci neto promena može biti oko ${projectedSixMonths.toFixed(2)}.`)
    insights.push(`Savings rate u poslednjih 90 dana je ${savingsRate.toFixed(1)}%.`)

    res.json({
      rangeDays: 90,
      insights,
      metrics: {
        incomeTotal,
        expenseTotal,
        monthlyNet,
        projectedSixMonths,
        savingsRate,
        topCategories
      }
    })
  } catch (error) {
    next(error)
  }
}

export const getBenchmark = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const accountId = toQueryString(req.query.accountId)

  try {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, benchmarkOptOut: true, preferredCurrency: true }
    })
    if (!me) return res.status(404).json({ error: 'User not found.' })
    if (me.benchmarkOptOut) {
      return res.json({
        enabled: false,
        reason: 'User opted out from anonymized benchmarking.'
      })
    }

    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const myTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        ...(accountId ? { accountId } : {}),
        type: 'EXPENSE',
        date: { gte: windowStart }
      },
      include: { category: true }
    })

    const myMonthlyExpense = myTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    const bracketMin = Math.max(0, myMonthlyExpense * 0.7)
    const bracketMax = myMonthlyExpense * 1.3

    const candidates = await prisma.user.findMany({
      where: {
        id: { not: userId },
        benchmarkOptOut: false,
        preferredCurrency: me.preferredCurrency
      },
      select: { id: true }
    })

    const candidateIds = candidates.map((entry) => entry.id)
    if (candidateIds.length === 0) {
      return res.json({ enabled: true, available: false, reason: 'Not enough benchmark participants yet.' })
    }

    const candidateExpenses = await prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: candidateIds },
        type: 'EXPENSE',
        date: { gte: windowStart }
      },
      _sum: { amount: true }
    })

    const cohortIds = candidateExpenses
      .filter((row) => {
        const total = row._sum.amount || 0
        return total >= bracketMin && total <= bracketMax
      })
      .map((row) => row.userId)

    if (cohortIds.length < BENCHMARK_MIN_COHORT_SIZE) {
      return res.json({
        enabled: true,
        available: false,
        reason: `Need at least ${BENCHMARK_MIN_COHORT_SIZE} similar users for anonymous benchmarking.`,
        cohortSize: cohortIds.length
      })
    }

    const cohortTransactions = await prisma.transaction.findMany({
      where: {
        userId: { in: cohortIds },
        type: 'EXPENSE',
        date: { gte: windowStart }
      },
      include: { category: true }
    })

    const normalizeCategory = (name: string) => name.trim().toLowerCase()
    const myCategoryTotals = new Map<string, number>()
    for (const tx of myTransactions) {
      const key = normalizeCategory(tx.category?.name || 'uncategorized')
      myCategoryTotals.set(key, (myCategoryTotals.get(key) || 0) + tx.amount)
    }

    const cohortByUserAndCategory = new Map<string, Map<string, number>>()
    for (const tx of cohortTransactions) {
      const userMap = cohortByUserAndCategory.get(tx.userId) || new Map<string, number>()
      const categoryKey = normalizeCategory(tx.category?.name || 'uncategorized')
      userMap.set(categoryKey, (userMap.get(categoryKey) || 0) + tx.amount)
      cohortByUserAndCategory.set(tx.userId, userMap)
    }

    const comparisons = [...myCategoryTotals.entries()]
      .map(([category, myAmount]) => {
        const cohortValues = [...cohortByUserAndCategory.values()]
          .map((userMap) => userMap.get(category) || 0)
        if (cohortValues.length === 0) return null
        const cohortAverage = cohortValues.reduce((sum, value) => sum + value, 0) / cohortValues.length
        const diffPercent = cohortAverage > 0 ? ((myAmount - cohortAverage) / cohortAverage) * 100 : 0
        return {
          category,
          myAmount,
          cohortAverage,
          diffPercent
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent))
      .slice(0, 5)

    const message = comparisons[0]
      ? `Tvoja potrošnja za "${comparisons[0].category}" je ${comparisons[0].diffPercent > 0 ? 'viša' : 'niža'} za ${Math.abs(comparisons[0].diffPercent).toFixed(1)}% u odnosu na sličan anonimni cohort.`
      : 'Nema dovoljno kategorijskih podataka za poređenje.'

    res.json({
      enabled: true,
      available: true,
      cohortSize: cohortIds.length,
      windowDays: 30,
      message,
      comparisons
    })
  } catch (error) {
    next(error)
  }
}
