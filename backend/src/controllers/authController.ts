import { NextFunction, Request, Response } from 'express'
import { Prisma, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.ts'
import { writeAuditLog } from '../lib/auditLog.ts'
import { buildPremiumSubscriptionState, ensureSubscriptionRecord, syncUserRoleFromSubscription } from '../lib/subscription.ts'
import { resolveDefaultCurrencyForRequest } from '../lib/currency.ts'
import { prisma } from '../lib/prisma.ts'

export const register = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body
  try {
    // TODO(email-verification): Block login until user verifies email via tokenized link.
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return res.status(400).json({ error: 'User already exists' })

    const hashedPassword = await bcrypt.hash(password, env.bcryptRounds)
    const role: UserRole = env.adminEmails.includes(email.toLowerCase()) ? 'ADMIN' : 'BASIC'
    const preferredCurrency = resolveDefaultCurrencyForRequest(req)

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          preferredCurrency,
          role
        }
      })

      // Seed initial categories for new user
      const incomeCategories: Array<{ name: string; icon: string }> = [
        { name: 'Salary', icon: 'Wallet' },
        { name: 'Family', icon: 'HeartHandshake' },
        { name: 'Bonus', icon: 'Sparkles' }
      ]
      const expenseCategories: Array<{ name: string; icon: string }> = [
        { name: 'Rent', icon: 'House' },
        { name: 'Groceries', icon: 'ShoppingCart' },
        { name: 'Transport', icon: 'Car' },
        { name: 'Entertainment', icon: 'Gamepad2' }
      ]

      await Promise.all([
        ...incomeCategories.map((category) => tx.category.create({
          data: { name: category.name, icon: category.icon, type: 'INCOME', userId: createdUser.id }
        })),
        ...expenseCategories.map((category) => tx.category.create({
          data: { name: category.name, icon: category.icon, type: 'EXPENSE', userId: createdUser.id }
        }))
      ])

      // Create default bank-like account
      await tx.account.create({
        data: {
          name: 'Primary',
          userId: createdUser.id
        }
      })

      await tx.subscription.create({
        data: {
          userId: createdUser.id,
          plan: 'BASIC',
          status: 'ACTIVE',
          billingInterval: null,
          source: 'SYSTEM'
        }
      })

      return createdUser
    })
    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      targetUserId: user.id,
      action: 'AUTH_REGISTER',
      details: { email: user.email }
    })

    const token = jwt.sign(
      { userId: user.id },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] }
    )
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isBanned: user.isBanned,
        preferredCurrency: user.preferredCurrency,
        benchmarkOptOut: user.benchmarkOptOut
      },
      token
    })
  } catch (error) {
    next(error)
  }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(400).json({ error: 'Invalid credentials' })
    if (user.isBanned) return res.status(403).json({ error: 'Your account is banned. Contact support.' })

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) return res.status(400).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { userId: user.id },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] }
    )
    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      targetUserId: user.id,
      action: 'AUTH_LOGIN_SUCCESS'
    })
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isBanned: user.isBanned,
        preferredCurrency: user.preferredCurrency,
        benchmarkOptOut: user.benchmarkOptOut
      },
      token
    })
  } catch (error) {
    next(error)
  }
}

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      select: { id: true, email: true, name: true, role: true, isBanned: true, preferredCurrency: true, benchmarkOptOut: true }
    })
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const { name, currentPassword, newPassword, preferredCurrency } = req.body
  try {
    const updateData: Prisma.UserUpdateInput = {}

    if (typeof name !== 'undefined') {
      updateData.name = name
    }

    if (typeof preferredCurrency !== 'undefined') {
      updateData.preferredCurrency = preferredCurrency
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required.' })
      }

      const existingUser = await prisma.user.findUnique({ where: { id: userId } })
      if (!existingUser) return res.status(404).json({ error: 'User not found' })

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existingUser.password)
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect.' })
      }

      updateData.password = await bcrypt.hash(newPassword, env.bcryptRounds)
      // TODO(email): Send password changed notification email to user.
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, isBanned: true, preferredCurrency: true, benchmarkOptOut: true }
    })
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: newPassword ? 'PROFILE_PASSWORD_CHANGE' : 'PROFILE_UPDATE',
      details: { nameUpdated: typeof name !== 'undefined', preferredCurrencyUpdated: typeof preferredCurrency !== 'undefined' }
    })
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const { password } = req.body
  try {
    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account.' })
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!existingUser) return res.status(404).json({ error: 'User not found' })

    const isPasswordValid = await bcrypt.compare(password, existingUser.password)
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Password is incorrect.' })
    }
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'ACCOUNT_DELETE_SELF',
      details: { email: existingUser.email }
    })

    // Delete all related data (Prisma can do this if onDelete is set, but manually here to be safe)
    await prisma.transaction.deleteMany({ where: { userId } })
    await prisma.account.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.dataTransferLog.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    res.json({ message: 'User and all related data deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const resetUserData = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const { password } = req.body

  try {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!existingUser) return res.status(404).json({ error: 'User not found' })

    const isPasswordValid = await bcrypt.compare(password, existingUser.password)
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Password is incorrect.' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { userId } })

      // Delete subcategories first, then top-level categories.
      await tx.category.deleteMany({ where: { userId, parentId: { not: null } } })
      await tx.category.deleteMany({ where: { userId, parentId: null } })

      const accounts = await tx.account.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      })

      let primaryAccount = accounts.find((acc) => acc.name.toLowerCase() === 'primary') || null

      if (!primaryAccount && accounts.length > 0) {
        primaryAccount = await tx.account.update({
          where: { id: accounts[0].id },
          data: { name: 'Primary' }
        })
      }

      if (!primaryAccount) {
        primaryAccount = await tx.account.create({
          data: { userId, name: 'Primary' }
        })
      }

      await tx.account.deleteMany({
        where: {
          userId,
          id: { not: primaryAccount.id }
        }
      })
    })
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'ACCOUNT_RESET_DATA'
    })

    res.json({ message: 'User financial data cleared. Primary account preserved.' })
  } catch (error) {
    next(error)
  }
}

export const activatePremium = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const providedCode = String(req.body?.code || '').trim()

  try {
    if (!env.premiumAccessCode) {
      return res.status(400).json({ error: 'Premium activation is not configured.' })
    }

    if (!providedCode) {
      return res.status(400).json({ error: 'Premium activation code is required.' })
    }

    if (providedCode !== env.premiumAccessCode) {
      return res.status(400).json({ error: 'Invalid premium activation code.' })
    }

    if (userRole === 'PREMIUM' || userRole === 'ADMIN') {
      await ensureSubscriptionRecord(prisma, { id: userId, role: userRole })
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, isBanned: true, preferredCurrency: true, benchmarkOptOut: true }
      })
      return res.json(existingUser)
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const upgradedSubscription = await tx.subscription.upsert({
        where: { userId },
        update: {
          ...buildPremiumSubscriptionState('MONTHLY', 'PROMO_CODE'),
          metadata: { activationMethod: 'legacy_promo_endpoint' }
        },
        create: {
          userId,
          ...buildPremiumSubscriptionState('MONTHLY', 'PROMO_CODE'),
          metadata: { activationMethod: 'legacy_promo_endpoint' }
        }
      })

      await syncUserRoleFromSubscription(tx, userId, upgradedSubscription)

      return tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, isBanned: true, preferredCurrency: true, benchmarkOptOut: true }
      })
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'ROLE_UPGRADE_PREMIUM'
    })

    res.json(updatedUser)
  } catch (error) {
    next(error)
  }
}

export const updateBenchmarkPreference = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const benchmarkOptOut = Boolean(req.body?.benchmarkOptOut)

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { benchmarkOptOut },
      select: { id: true, email: true, name: true, role: true, isBanned: true, preferredCurrency: true, benchmarkOptOut: true }
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'PROFILE_BENCHMARK_PREF_UPDATE',
      details: { benchmarkOptOut }
    })

    res.json(user)
  } catch (error) {
    next(error)
  }
}
