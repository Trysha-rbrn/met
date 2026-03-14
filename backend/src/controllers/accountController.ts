import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const MAX_ACCOUNTS_PER_USER = 3
const DEFAULT_ACCOUNT_NAMES = ['Primary', 'Savings', 'Reserve']

export const getAccounts = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    })
    res.json(accounts)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const createAccount = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const { name } = req.body

  try {
    const existingCount = await prisma.account.count({ where: { userId } })
    if (existingCount >= MAX_ACCOUNTS_PER_USER) {
      return res.status(400).json({ error: `Maximum ${MAX_ACCOUNTS_PER_USER} accounts allowed.` })
    }

    const normalizedName = typeof name === 'string' && name.trim()
      ? name.trim()
      : DEFAULT_ACCOUNT_NAMES[existingCount] || `Account ${existingCount + 1}`

    const alreadyExists = await prisma.account.findFirst({
      where: {
        userId,
        name: {
          equals: normalizedName,
          mode: 'insensitive'
        }
      }
    })

    if (alreadyExists) {
      return res.status(400).json({ error: 'Account with this name already exists.' })
    }

    const account = await prisma.account.create({
      data: {
        userId,
        name: normalizedName
      }
    })

    res.status(201).json(account)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
