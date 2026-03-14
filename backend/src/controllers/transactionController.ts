import { NextFunction, Request, Response } from 'express'
import { PrismaClient, UserRole } from '@prisma/client'
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
