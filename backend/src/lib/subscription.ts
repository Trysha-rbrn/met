import { Prisma, PrismaClient, Subscription, SubscriptionPlan, SubscriptionSource, SubscriptionStatus, UserRole } from '@prisma/client'

type PrismaLike = PrismaClient | Prisma.TransactionClient

const DEFAULT_PREMIUM_INTERVAL = 'MONTHLY' as const

const addBillingPeriod = (start: Date, interval: 'MONTHLY' | 'YEARLY') => {
  const result = new Date(start)
  if (interval === 'YEARLY') {
    result.setFullYear(result.getFullYear() + 1)
    return result
  }

  result.setMonth(result.getMonth() + 1)
  return result
}

export const serializeSubscription = (subscription: Subscription) => ({
  id: subscription.id,
  userId: subscription.userId,
  plan: subscription.plan,
  status: subscription.status,
  billingInterval: subscription.billingInterval,
  source: subscription.source,
  currentPeriodStart: subscription.currentPeriodStart,
  currentPeriodEnd: subscription.currentPeriodEnd,
  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  canceledAt: subscription.canceledAt,
  externalCustomerId: subscription.externalCustomerId,
  externalSubscriptionId: subscription.externalSubscriptionId,
  lastWebhookEventId: subscription.lastWebhookEventId,
  lastWebhookEventAt: subscription.lastWebhookEventAt,
  metadata: subscription.metadata,
  createdAt: subscription.createdAt,
  updatedAt: subscription.updatedAt
})

export const deriveRoleFromSubscription = (currentRole: UserRole, subscription: Pick<Subscription, 'plan' | 'status'>): UserRole => {
  if (currentRole === 'ADMIN') return 'ADMIN'
  if (subscription.plan === 'PREMIUM' && (subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE')) {
    return 'PREMIUM'
  }
  return 'BASIC'
}

export const ensureSubscriptionRecord = async (
  prisma: PrismaLike,
  user: { id: string; role: UserRole }
) => {
  const existing = await prisma.subscription.findUnique({ where: { userId: user.id } })
  if (existing) return existing

  const now = new Date()
  const isPremium = user.role === 'PREMIUM'

  return prisma.subscription.create({
    data: {
      userId: user.id,
      plan: isPremium ? 'PREMIUM' : 'BASIC',
      status: 'ACTIVE',
      billingInterval: isPremium ? DEFAULT_PREMIUM_INTERVAL : null,
      source: isPremium ? 'LEGACY_IMPORT' : 'SYSTEM',
      currentPeriodStart: isPremium ? now : null,
      currentPeriodEnd: isPremium ? addBillingPeriod(now, DEFAULT_PREMIUM_INTERVAL) : null,
      metadata: isPremium ? { migratedFromRole: true } : Prisma.JsonNull
    }
  })
}

export const syncUserRoleFromSubscription = async (
  prisma: PrismaLike,
  userId: string,
  subscription: Pick<Subscription, 'plan' | 'status'>
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  })

  if (!user) return null

  const nextRole = deriveRoleFromSubscription(user.role, subscription)
  if (nextRole === user.role) {
    return user
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role: nextRole },
    select: { id: true, role: true }
  })
}

export const buildPremiumSubscriptionState = (
  interval: 'MONTHLY' | 'YEARLY',
  source: SubscriptionSource,
  overrides?: Partial<Prisma.SubscriptionUncheckedCreateInput & Prisma.SubscriptionUncheckedUpdateInput>
) => {
  const now = new Date()
  return {
    plan: 'PREMIUM' as SubscriptionPlan,
    status: 'ACTIVE' as SubscriptionStatus,
    billingInterval: interval,
    source,
    currentPeriodStart: now,
    currentPeriodEnd: addBillingPeriod(now, interval),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    ...overrides
  }
}

export const buildBasicSubscriptionState = (
  source: SubscriptionSource,
  overrides?: Partial<Prisma.SubscriptionUncheckedCreateInput & Prisma.SubscriptionUncheckedUpdateInput>
) => ({
  plan: 'BASIC' as SubscriptionPlan,
  status: 'ACTIVE' as SubscriptionStatus,
  billingInterval: null,
  source,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  externalSubscriptionId: null,
  ...overrides
})
