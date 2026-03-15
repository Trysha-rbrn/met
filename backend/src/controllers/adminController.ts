import { NextFunction, Request, Response } from 'express'
import { PrismaClient, Prisma, UserRole } from '@prisma/client'
import { writeAuditLog } from '../lib/auditLog.ts'
import { buildBasicSubscriptionState, buildPremiumSubscriptionState, ensureSubscriptionRecord, syncUserRoleFromSubscription } from '../lib/subscription.ts'

const prisma = new PrismaClient()

const clamp = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

const toString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  const search = toString(req.query.search)
  const role = toString(req.query.role)
  const status = toString(req.query.status)
  const sortByParam = toString(req.query.sortBy)
  const sortOrderParam = toString(req.query.sortOrder).toLowerCase()
  const page = clamp(req.query.page, 1, 1, 1000)
  const pageSize = clamp(req.query.pageSize, 20, 1, 100)

  const sortBy = (['createdAt', 'email', 'name'].includes(sortByParam) ? sortByParam : 'createdAt') as 'createdAt' | 'email' | 'name'
  const sortOrder = (sortOrderParam === 'asc' ? 'asc' : 'desc') as Prisma.SortOrder

  const where: Prisma.UserWhereInput = {
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {}),
    ...(role === 'BASIC' || role === 'PREMIUM' || role === 'ADMIN' ? { role: role as UserRole } : {}),
    ...(status === 'banned' ? { isBanned: true } : status === 'active' ? { isBanned: false } : {})
  }

  try {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isBanned: true,
          createdAt: true,
          _count: {
            select: {
              accounts: true,
              categories: true,
              transactions: true,
              transferLogs: true
            }
          }
        }
      })
    ])

    res.json({
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    })
  } catch (error) {
    next(error)
  }
}

export const getUserDetails = async (req: Request, res: Response, next: NextFunction) => {
  const targetUserId = String(req.params.id)

  try {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        subscription: true,
        accounts: { orderBy: { createdAt: 'asc' } },
        categories: { orderBy: { createdAt: 'asc' } },
        transactions: {
          include: {
            account: true,
            category: true
          },
          orderBy: { date: 'desc' },
          take: 200
        },
        transferLogs: {
          orderBy: { createdAt: 'desc' },
          take: 100
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found.' })
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
}

export const setUserBanState = async (req: Request, res: Response, next: NextFunction) => {
  const adminUserId = (req as any).userId as string
  const adminRole = (req as any).userRole as UserRole
  const targetUserId = String(req.params.id)
  const isBanned = Boolean(req.body?.isBanned)

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) return res.status(404).json({ error: 'User not found.' })

    if (targetUser.id === adminUserId) {
      return res.status(400).json({ error: 'Admin cannot change own ban state.' })
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot change ban state for another admin.' })
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned },
      select: { id: true, email: true, name: true, role: true, isBanned: true }
    })

    await writeAuditLog({
      actorUserId: adminUserId,
      actorRole: adminRole,
      targetUserId,
      action: isBanned ? 'ADMIN_BAN_USER' : 'ADMIN_UNBAN_USER',
      details: { targetEmail: targetUser.email }
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
}

export const setUserRoleAsAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const adminUserId = (req as any).userId as string
  const adminRole = (req as any).userRole as UserRole
  const targetUserId = String(req.params.id)
  const nextRole = String(req.body?.role || '').toUpperCase() as 'BASIC' | 'PREMIUM'

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) return res.status(404).json({ error: 'User not found.' })

    if (targetUser.id === adminUserId) {
      return res.status(400).json({ error: 'Admin cannot change own role from admin panel.' })
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot change role for another admin.' })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existingSubscription = await ensureSubscriptionRecord(tx, { id: targetUserId, role: targetUser.role })

      const updatedSubscription = nextRole === 'PREMIUM'
        ? await tx.subscription.update({
            where: { userId: targetUserId },
            data: {
              ...buildPremiumSubscriptionState(existingSubscription.billingInterval || 'MONTHLY', 'ADMIN'),
              metadata: { grantedByAdmin: adminUserId }
            }
          })
        : await tx.subscription.update({
            where: { userId: targetUserId },
            data: {
              ...buildBasicSubscriptionState('ADMIN', {
                canceledAt: new Date(),
                externalCustomerId: existingSubscription.externalCustomerId,
                metadata: { changedByAdmin: adminUserId }
              })
            }
          })

      await syncUserRoleFromSubscription(tx, targetUserId, updatedSubscription)

      return tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, name: true, role: true, isBanned: true }
      })
    })

    await writeAuditLog({
      actorUserId: adminUserId,
      actorRole: adminRole,
      targetUserId,
      action: 'ADMIN_CHANGE_ROLE',
      details: { targetEmail: targetUser.email, role: nextRole }
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
}

export const deleteUserAsAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const adminUserId = (req as any).userId as string
  const adminRole = (req as any).userRole as UserRole
  const targetUserId = String(req.params.id)

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) return res.status(404).json({ error: 'User not found.' })

    if (targetUser.id === adminUserId) {
      return res.status(400).json({ error: 'Admin cannot delete own account from admin panel.' })
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot delete another admin from admin panel.' })
    }

    await writeAuditLog({
      actorUserId: adminUserId,
      actorRole: adminRole,
      targetUserId,
      action: 'ADMIN_DELETE_USER',
      details: { targetEmail: targetUser.email }
    })

    await prisma.transaction.deleteMany({ where: { userId: targetUserId } })
    await prisma.account.deleteMany({ where: { userId: targetUserId } })
    await prisma.category.deleteMany({ where: { userId: targetUserId } })
    await prisma.dataTransferLog.deleteMany({ where: { userId: targetUserId } })
    await prisma.user.delete({ where: { id: targetUserId } })

    res.json({ message: 'User deleted successfully.' })
  } catch (error) {
    next(error)
  }
}

export const listAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  const action = toString(req.query.action)
  const userId = toString(req.query.userId)
  const page = clamp(req.query.page, 1, 1, 1000)
  const pageSize = clamp(req.query.pageSize, 30, 1, 100)

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
    ...(userId
      ? {
          OR: [
            { actorUserId: userId },
            { targetUserId: userId }
          ]
        }
      : {})
  }

  try {
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actorUser: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          },
          targetUser: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      })
    ])

    res.json({
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    })
  } catch (error) {
    next(error)
  }
}

export const listPromoCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const codes = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdByAdmin: {
          select: { id: true, email: true, name: true }
        },
        _count: {
          select: { redemptions: true }
        },
        redemptions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: {
              select: { id: true, email: true, name: true }
            }
          }
        }
      }
    })

    res.json(codes.map((code) => ({
      id: code.id,
      code: code.code,
      expiresAt: code.expiresAt,
      maxRedemptions: code.maxRedemptions,
      redemptionCount: code.redemptionCount,
      remainingRedemptions: typeof code.maxRedemptions === 'number'
        ? Math.max(0, code.maxRedemptions - code.redemptionCount)
        : null,
      isActive: code.isActive,
      createdAt: code.createdAt,
      updatedAt: code.updatedAt,
      createdByAdmin: code.createdByAdmin,
      stats: {
        totalRedemptions: code._count.redemptions,
        uniqueUsers: code._count.redemptions
      },
      recentRedemptions: code.redemptions.map((redemption) => ({
        id: redemption.id,
        createdAt: redemption.createdAt,
        user: redemption.user
      }))
    })))
  } catch (error) {
    next(error)
  }
}

export const createPromoCode = async (req: Request, res: Response, next: NextFunction) => {
  const adminUserId = (req as any).userId as string
  const adminRole = (req as any).userRole as UserRole
  const { code, expiresAt, maxRedemptions } = req.body as {
    code: string
    expiresAt?: string
    maxRedemptions?: number
  }

  try {
    const created = await prisma.promoCode.create({
      data: {
        code,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxRedemptions: typeof maxRedemptions === 'number' ? maxRedemptions : null,
        createdByAdminId: adminUserId
      }
    })

    await writeAuditLog({
      actorUserId: adminUserId,
      actorRole: adminRole,
      action: 'ADMIN_PROMO_CODE_CREATE',
      details: { promoCodeId: created.id, code: created.code, maxRedemptions: created.maxRedemptions, expiresAt: created.expiresAt }
    })

    res.status(201).json(created)
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      return res.status(400).json({ error: 'Promo code already exists.' })
    }
    next(error)
  }
}

export const setPromoCodeState = async (req: Request, res: Response, next: NextFunction) => {
  const adminUserId = (req as any).userId as string
  const adminRole = (req as any).userRole as UserRole
  const promoCodeId = String(req.params.id)
  const isActive = Boolean(req.body?.isActive)

  try {
    const existing = await prisma.promoCode.findUnique({ where: { id: promoCodeId } })
    if (!existing) return res.status(404).json({ error: 'Promo code not found.' })

    const updated = await prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { isActive }
    })

    await writeAuditLog({
      actorUserId: adminUserId,
      actorRole: adminRole,
      action: isActive ? 'ADMIN_PROMO_CODE_ACTIVATE' : 'ADMIN_PROMO_CODE_DEACTIVATE',
      details: { promoCodeId: updated.id, code: updated.code }
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
}
