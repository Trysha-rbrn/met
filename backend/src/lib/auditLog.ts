import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

type AuditPayload = {
  actorUserId?: string
  actorRole?: UserRole
  targetUserId?: string
  action: string
  details?: unknown
}

export const writeAuditLog = async ({ actorUserId, actorRole, targetUserId, action, details }: AuditPayload) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        actorRole: actorRole || 'BASIC',
        targetUserId,
        action,
        details: typeof details === 'undefined' ? undefined : (details as object)
      }
    })
  } catch {
    // Ignore audit failures so core actions are not blocked.
  }
}
