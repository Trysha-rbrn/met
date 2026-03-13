import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (!token) throw new Error()

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    (req as any).userId = decoded.userId
    next()
  } catch (err) {
    res.status(401).json({ error: 'Please authenticate' })
  }
}
