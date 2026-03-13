import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getTransactions = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        category: true
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
  const { amount, description, date, type, categoryId, metadata } = req.body
  try {
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
        type,
        userId,
        categoryId,
        metadata: metadata || {}
      },
      include: {
        category: true
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
  const { amount, description, date, type, categoryId, metadata } = req.body
  try {
    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        description,
        date: date ? new Date(date) : undefined,
        type,
        categoryId,
        metadata: metadata || undefined
      },
      include: {
        category: true
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
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId }
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
