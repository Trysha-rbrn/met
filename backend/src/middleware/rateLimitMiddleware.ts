import { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.ts'

interface RateLimitOptions {
  windowMs: number
  max: number
}

interface RateLimitBucket {
  count: number
  resetAt: number
}

const pruneStaleBuckets = (store: Map<string, RateLimitBucket>, now: number) => {
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key)
    }
  }
}

export const createRateLimit = ({ windowMs, max }: RateLimitOptions) => {
  const store = new Map<string, RateLimitBucket>()

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now()
    if (store.size > 5000) {
      pruneStaleBuckets(store, now)
    }

    const key = `${req.ip}:${req.path}`
    const current = store.get(key)

    if (!current || current.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000)
      res.setHeader('Retry-After', retryAfterSeconds.toString())
      return res.status(429).json({
        error: 'Too many requests. Please try again later.'
      })
    }

    current.count += 1
    store.set(key, current)
    return next()
  }
}

export const authRateLimit = createRateLimit({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax
})
