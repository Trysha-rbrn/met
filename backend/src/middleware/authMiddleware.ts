import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.ts'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (!token) throw new Error()

    const decoded = jwt.verify(token, env.jwtSecret) as { userId: string; sid?: string }
    if (decoded.sid !== env.serverInstanceId) {
      throw new globalThis.Error('Session invalidated after server restart')
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isBanned: true }
    })

    if (!user || user.isBanned) {
      throw new globalThis.Error('User is not allowed to access resources')
    }

    ;(req as any).userId = user.id
    ;(req as any).userRole = user.role
    next()
  } catch (err) {
    res.status(401).json({ error: 'Please authenticate' })
  }
}
