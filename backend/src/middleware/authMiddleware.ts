import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.ts'
import { CSRF_HEADER_NAME, readAuthTokenFromRequest } from '../lib/authSession.ts'
import { prisma } from '../lib/prisma.ts'

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = readAuthTokenFromRequest(req)
    if (!token) throw new Error()

    const decoded = jwt.verify(token, env.jwtSecret) as { userId: string; csrfToken?: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isBanned: true }
    })

    if (!user || user.isBanned) {
      throw new globalThis.Error('User is not allowed to access resources')
    }

    ;(req as any).userId = user.id
    ;(req as any).userRole = user.role
    ;(req as any).authCsrfToken = decoded.csrfToken
    if (decoded.csrfToken) {
      res.setHeader(CSRF_HEADER_NAME, decoded.csrfToken)
    }
    next()
  } catch (err) {
    res.status(401).json({ error: 'Please authenticate' })
  }
}
