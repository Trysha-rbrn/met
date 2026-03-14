import { randomUUID } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { PrismaClient, UserRole } from '@prisma/client'
import { env } from '../config/env.ts'
import { writeAuditLog } from '../lib/auditLog.ts'
import {
  buildBasicSubscriptionState,
  buildPremiumSubscriptionState,
  ensureSubscriptionRecord,
  serializeSubscription,
  syncUserRoleFromSubscription
} from '../lib/subscription.ts'

const prisma = new PrismaClient()

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isBanned: true,
  preferredCurrency: true
} as const

const getSubscriptionPayload = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userSelect,
      subscription: true
    }
  })

  if (!user) return null

  const subscription = user.subscription || await ensureSubscriptionRecord(prisma, {
    id: user.id,
    role: user.role
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isBanned: user.isBanned,
      preferredCurrency: user.preferredCurrency
    },
    subscription: serializeSubscription(subscription)
  }
}

export const getSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string

  try {
    const payload = await getSubscriptionPayload(userId)
    if (!payload) return res.status(404).json({ error: 'User not found.' })
    res.json(payload)
  } catch (error) {
    next(error)
  }
}

export const upgradeSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const billingInterval = req.body.billingInterval as 'MONTHLY' | 'YEARLY'
  const code = req.body.code as string | undefined

  try {
    if (code && (!env.premiumAccessCode || code !== env.premiumAccessCode)) {
      return res.status(400).json({ error: 'Invalid premium activation code.' })
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { ...userSelect, subscription: true }
      })

      if (!user) {
        throw new Error('User not found.')
      }

      const subscription = user.subscription || await ensureSubscriptionRecord(tx, { id: user.id, role: user.role })

      if (code && env.premiumAccessCode && code === env.premiumAccessCode) {
        const updatedSubscription = await tx.subscription.upsert({
          where: { userId },
          update: {
            ...buildPremiumSubscriptionState(billingInterval, 'PROMO_CODE'),
            externalSubscriptionId: null,
            metadata: { activationMethod: 'promo_code' }
          },
          create: {
            userId,
            ...buildPremiumSubscriptionState(billingInterval, 'PROMO_CODE'),
            metadata: { activationMethod: 'promo_code' }
          }
        })

        const roleSync = await syncUserRoleFromSubscription(tx, userId, updatedSubscription)

        await writeAuditLog({
          actorUserId: userId,
          actorRole: userRole,
          targetUserId: userId,
          action: 'SUBSCRIPTION_UPGRADE_PROMO',
          details: { billingInterval }
        })

        return {
          message: 'Premium activated.',
          userRole: roleSync?.role || user.role,
          subscription: updatedSubscription
        }
      }

      if (subscription.plan === 'PREMIUM' && (subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE')) {
        const updatedSubscription = subscription.cancelAtPeriodEnd
          ? await tx.subscription.update({
              where: { userId },
              data: { cancelAtPeriodEnd: false, canceledAt: null }
            })
          : subscription

        await writeAuditLog({
          actorUserId: userId,
          actorRole: userRole,
          targetUserId: userId,
          action: 'SUBSCRIPTION_RESUME_SELF',
          details: { billingInterval: updatedSubscription.billingInterval || billingInterval }
        })

        return {
          message: 'Premium subscription is already active.',
          userRole: user.role,
          subscription: updatedSubscription
        }
      }

      const externalSubscriptionId = subscription.externalSubscriptionId || `sub_${randomUUID().replace(/-/g, '').slice(0, 18)}`
      const externalCustomerId = subscription.externalCustomerId || `cus_${user.id.replace(/-/g, '').slice(0, 18)}`

      const updatedSubscription = await tx.subscription.upsert({
        where: { userId },
        update: {
          plan: 'PREMIUM',
          status: 'PENDING',
          billingInterval,
          source: 'BILLING',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          externalSubscriptionId,
          externalCustomerId,
          metadata: { checkoutRequestedAt: new Date().toISOString() }
        },
        create: {
          userId,
          plan: 'PREMIUM',
          status: 'PENDING',
          billingInterval,
          source: 'BILLING',
          externalSubscriptionId,
          externalCustomerId,
          metadata: { checkoutRequestedAt: new Date().toISOString() }
        }
      })

      await writeAuditLog({
        actorUserId: userId,
        actorRole: userRole,
        targetUserId: userId,
        action: 'SUBSCRIPTION_UPGRADE_REQUESTED',
        details: { billingInterval, externalSubscriptionId }
      })

      return {
        message: 'Upgrade requested. Awaiting billing confirmation.',
        userRole: user.role,
        subscription: updatedSubscription
      }
    })

    const payload = await getSubscriptionPayload(userId)
    if (!payload) return res.status(404).json({ error: 'User not found.' })

    res.json({
      ...payload,
      message: result.message
    })
  } catch (error) {
    next(error)
  }
}

export const downgradeSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const immediate = Boolean(req.body.immediate)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { ...userSelect, subscription: true }
      })

      if (!user) {
        throw new Error('User not found.')
      }

      const subscription = user.subscription || await ensureSubscriptionRecord(tx, { id: user.id, role: user.role })

      if (subscription.plan !== 'PREMIUM') {
        return { message: 'Your account is already on the Basic plan.' }
      }

      if (subscription.status === 'PENDING' || immediate) {
        const updatedSubscription = await tx.subscription.update({
          where: { userId },
          data: {
            ...buildBasicSubscriptionState('SYSTEM', {
              canceledAt: new Date(),
              lastWebhookEventId: null,
              lastWebhookEventAt: null,
              externalCustomerId: subscription.externalCustomerId
            })
          }
        })

        await syncUserRoleFromSubscription(tx, userId, updatedSubscription)

        await writeAuditLog({
          actorUserId: userId,
          actorRole: userRole,
          targetUserId: userId,
          action: 'SUBSCRIPTION_DOWNGRADE_IMMEDIATE',
          details: { previousStatus: subscription.status }
        })

        return { message: 'Downgraded to Basic.' }
      }

      if (subscription.cancelAtPeriodEnd) {
        return { message: 'Downgrade is already scheduled for period end.' }
      }

      await tx.subscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: new Date()
        }
      })

      await writeAuditLog({
        actorUserId: userId,
        actorRole: userRole,
        targetUserId: userId,
        action: 'SUBSCRIPTION_CANCEL_AT_PERIOD_END'
      })

      return { message: 'Downgrade scheduled for the end of the current billing period.' }
    })

    const payload = await getSubscriptionPayload(userId)
    if (!payload) return res.status(404).json({ error: 'User not found.' })

    res.json({
      ...payload,
      message: result.message
    })
  } catch (error) {
    next(error)
  }
}

export const resumeSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole

  try {
    const subscription = await prisma.subscription.findUnique({ where: { userId } })
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found.' })
    }

    if (subscription.plan !== 'PREMIUM' || !subscription.cancelAtPeriodEnd) {
      const payload = await getSubscriptionPayload(userId)
      return res.json({
        ...payload,
        message: 'Premium subscription is already active.'
      })
    }

    await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null
      }
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'SUBSCRIPTION_RESUME_SELF'
    })

    const payload = await getSubscriptionPayload(userId)
    res.json({
      ...payload,
      message: 'Premium renewal resumed.'
    })
  } catch (error) {
    next(error)
  }
}

export const handleBillingWebhook = async (req: Request, res: Response, next: NextFunction) => {
  const providedSecret = req.header('x-billing-hook-secret')?.trim() || ''

  try {
    if (!env.billingWebhookSecret) {
      return res.status(503).json({ error: 'Billing webhook secret is not configured.' })
    }

    if (providedSecret !== env.billingWebhookSecret) {
      return res.status(401).json({ error: 'Invalid billing webhook secret.' })
    }

    const {
      eventId,
      type,
      userId,
      externalSubscriptionId,
      billingInterval,
      currentPeriodStart,
      currentPeriodEnd,
      occurredAt
    } = req.body as {
      eventId: string
      type: 'subscription.activated' | 'subscription.renewed' | 'subscription.canceled' | 'subscription.expired' | 'subscription.payment_failed'
      userId?: string
      externalSubscriptionId?: string
      billingInterval?: 'MONTHLY' | 'YEARLY'
      currentPeriodStart?: string
      currentPeriodEnd?: string
      occurredAt?: string
    }

    const result = await prisma.$transaction(async (tx) => {
      let subscription = externalSubscriptionId
        ? await tx.subscription.findUnique({ where: { externalSubscriptionId } })
        : null

      if (!subscription && userId) {
        const targetUser = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true }
        })
        if (!targetUser) {
          throw new Error('User not found.')
        }
        subscription = await ensureSubscriptionRecord(tx, targetUser)
      }

      if (!subscription) {
        throw new Error('Subscription not found.')
      }

      if (subscription.lastWebhookEventId === eventId) {
        return subscription
      }

      const interval = billingInterval || subscription.billingInterval || 'MONTHLY'
      const effectiveAt = occurredAt ? new Date(occurredAt) : new Date()
      const nextPeriodStart = currentPeriodStart ? new Date(currentPeriodStart) : effectiveAt
      const nextPeriodEnd = currentPeriodEnd
        ? new Date(currentPeriodEnd)
        : new Date(interval === 'YEARLY'
          ? new Date(nextPeriodStart).setFullYear(nextPeriodStart.getFullYear() + 1)
          : new Date(nextPeriodStart).setMonth(nextPeriodStart.getMonth() + 1))

      if (type === 'subscription.expired') {
        const updated = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            ...buildBasicSubscriptionState('SYSTEM', {
              canceledAt: effectiveAt,
              externalCustomerId: subscription.externalCustomerId,
              lastWebhookEventId: eventId,
              lastWebhookEventAt: effectiveAt,
              metadata: { lastBillingEvent: type }
            })
          }
        })

        await syncUserRoleFromSubscription(tx, subscription.userId, updated)
        return updated
      }

      if (type === 'subscription.payment_failed') {
        const updated = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            plan: 'PREMIUM',
            status: 'PAST_DUE',
            billingInterval: interval,
            source: 'BILLING_WEBHOOK',
            cancelAtPeriodEnd: false,
            lastWebhookEventId: eventId,
            lastWebhookEventAt: effectiveAt,
            externalSubscriptionId: externalSubscriptionId || subscription.externalSubscriptionId
          }
        })

        await syncUserRoleFromSubscription(tx, subscription.userId, updated)
        return updated
      }

      if (type === 'subscription.canceled') {
        return tx.subscription.update({
          where: { id: subscription.id },
          data: {
            plan: 'PREMIUM',
            status: 'ACTIVE',
            source: 'BILLING_WEBHOOK',
            cancelAtPeriodEnd: true,
            canceledAt: effectiveAt,
            lastWebhookEventId: eventId,
            lastWebhookEventAt: effectiveAt,
            externalSubscriptionId: externalSubscriptionId || subscription.externalSubscriptionId
          }
        })
      }

      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          ...buildPremiumSubscriptionState(interval, 'BILLING_WEBHOOK', {
            currentPeriodStart: nextPeriodStart,
            currentPeriodEnd: nextPeriodEnd,
            externalSubscriptionId: externalSubscriptionId || subscription.externalSubscriptionId || `sub_${randomUUID().replace(/-/g, '').slice(0, 18)}`,
            externalCustomerId: subscription.externalCustomerId || `cus_${subscription.userId.replace(/-/g, '').slice(0, 18)}`,
            lastWebhookEventId: eventId,
            lastWebhookEventAt: effectiveAt,
            metadata: { lastBillingEvent: type }
          })
        }
      })

      await syncUserRoleFromSubscription(tx, subscription.userId, updated)
      return updated
    })

    await writeAuditLog({
      actorUserId: undefined,
      actorRole: 'ADMIN',
      targetUserId: result.userId,
      action: 'BILLING_WEBHOOK_PROCESSED',
      details: { eventId, type, externalSubscriptionId: result.externalSubscriptionId }
    })

    const payload = await getSubscriptionPayload(result.userId)
    res.json({
      received: true,
      ...payload
    })
  } catch (error) {
    next(error)
  }
}
