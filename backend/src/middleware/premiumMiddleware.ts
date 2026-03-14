import { NextFunction, Request, Response } from 'express'

export const premiumOrAdminOnly = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).userRole
  if (role !== 'PREMIUM' && role !== 'ADMIN') {
    return res.status(403).json({ error: 'Premium access required.' })
  }

  return next()
}
