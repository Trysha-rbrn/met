import { NextFunction, Request, Response } from 'express'
import { UserRole } from '@prisma/client'
import { writeAuditLog } from '../lib/auditLog.ts'
import { prisma } from '../lib/prisma.ts'

export const getTransferLogs = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  try {
    const logs = await prisma.dataTransferLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    res.json(logs)
  } catch (error) {
    next(error)
  }
}

export const createTransferLog = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
  const { action, format, rows } = req.body
  try {
    const log = await prisma.dataTransferLog.create({
      data: {
        userId,
        action,
        format,
        rows: typeof rows === 'number' ? rows : 0
      }
    })
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: `DATA_${action}_${format}`,
      details: { rows: log.rows, transferLogId: log.id }
    })
    res.status(201).json(log)
  } catch (error) {
    next(error)
  }
}
