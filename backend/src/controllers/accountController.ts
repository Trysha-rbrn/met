import { NextFunction, Request, Response } from 'express'
import { PrismaClient, UserRole } from '@prisma/client'
import { writeAuditLog } from '../lib/auditLog.ts'

const prisma = new PrismaClient()
const MAX_ACCOUNTS_PER_USER = 3
const DEFAULT_ACCOUNT_NAMES = ['Primary', 'Savings', 'Reserve']

export const getAccounts = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    })
    res.json(accounts)
  } catch (error) {
    next(error)
  }
}

export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
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
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'ACCOUNT_CREATE',
      details: { accountId: account.id, accountName: account.name }
    })

    res.status(201).json(account)
  } catch (error) {
    next(error)
  }
}
