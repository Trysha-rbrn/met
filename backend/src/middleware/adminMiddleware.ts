import { NextFunction, Request, Response } from 'express'

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).userRole
  if (role !== 'ADMIN') {
    return res.status(403).json({ error: 'Administrator access required.' })
  }

  return next()
}
