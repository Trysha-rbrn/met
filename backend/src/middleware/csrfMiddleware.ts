import type { NextFunction, Request, Response } from 'express'
import { CSRF_HEADER_NAME } from '../lib/authSession.ts'

export const csrfProtect = (req: Request, res: Response, next: NextFunction) => {
  const expectedToken = (req as any).authCsrfToken as string | undefined
  const providedToken = req.header(CSRF_HEADER_NAME)?.trim()

  if (!expectedToken || !providedToken || expectedToken !== providedToken) {
    return res.status(403).json({ error: 'Invalid CSRF token.' })
  }

  return next()
}
