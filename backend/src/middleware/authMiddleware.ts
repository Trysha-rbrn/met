import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.ts'

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (!token) throw new Error()

    const decoded = jwt.verify(token, env.jwtSecret) as { userId: string; sid?: string }
    if (decoded.sid !== env.serverInstanceId) {
      throw new globalThis.Error('Session invalidated after server restart')
    }

    (req as any).userId = decoded.userId
    next()
  } catch (err) {
    res.status(401).json({ error: 'Please authenticate' })
  }
}
