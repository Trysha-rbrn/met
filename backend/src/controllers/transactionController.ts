import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const toQueryString = (value: unknown) => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

export const getTransactions = async (req: Request, res: Response) => {
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
    res.status(500).json({ error: (error as Error).message })
  }
}

export const createTransaction = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const { amount, description, date, type, categoryId, accountId, metadata } = req.body
  try {
    let resolvedAccountId: string | undefined = accountId

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

    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
        type,
        userId,
        accountId: resolvedAccountId,
        categoryId,
        metadata: metadata || {}
      },
      include: {
        category: true,
        account: true
      }
    })
    res.status(201).json(transaction)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const updateTransaction = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const { id } = req.params
  const { amount, description, date, type, categoryId, accountId, metadata } = req.body
  try {
    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

    if (accountId) {
      const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
      if (!account) return res.status(403).json({ error: 'Invalid account' })
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        description,
        date: date ? new Date(date) : undefined,
        type,
        categoryId,
        accountId: accountId || undefined,
        metadata: metadata || undefined
      },
      include: {
        category: true,
        account: true
      }
    })
    res.json(transaction)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const deleteTransaction = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const { id } = req.params
  try {
    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

    await prisma.transaction.delete({
      where: { id }
    })
    res.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const getSummary = async (req: Request, res: Response) => {
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
    res.status(500).json({ error: (error as Error).message })
  }
}
