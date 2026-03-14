import { NextFunction, Request, Response } from 'express'

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    next(err)
    return
  }

  const error = err instanceof Error ? err : new Error('Unknown error')

  if (error.message === 'CORS origin denied') {
    res.status(403).json({ error: 'CORS origin denied' })
    return
  }

  console.error(error)
  res.status(500).json({ error: 'Internal server error' })
}
