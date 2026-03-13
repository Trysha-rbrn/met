import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Fetch all transactions for a user
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const demoUser = await prisma.user.findFirst({ where: { email: 'demo@example.com' } })
    if (!demoUser) return res.status(404).json({ error: 'User not found' })

    const transactions = await prisma.transaction.findMany({
      where: { userId: demoUser.id },
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

// Create a new transaction
export const createTransaction = async (req: Request, res: Response) => {
  const { amount, description, date, type, categoryId, metadata } = req.body
  try {
    const demoUser = await prisma.user.findFirst({ where: { email: 'demo@example.com' } })
    if (!demoUser) return res.status(404).json({ error: 'User not found' })

    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
        type,
        userId: demoUser.id,
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

// Update a transaction
export const updateTransaction = async (req: Request, res: Response) => {
  const { id } = req.params
  const { amount, description, date, type, categoryId, metadata } = req.body
  try {
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

// Delete a transaction
export const deleteTransaction = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    await prisma.transaction.delete({
      where: { id }
    })
    res.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

// Get financial summary (total balance, income, expenses)
export const getSummary = async (req: Request, res: Response) => {
  try {
    const demoUser = await prisma.user.findFirst({ where: { email: 'demo@example.com' } })
    if (!demoUser) return res.status(404).json({ error: 'User not found' })

    const transactions = await prisma.transaction.findMany({
      where: { userId: demoUser.id }
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
