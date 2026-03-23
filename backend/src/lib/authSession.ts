import { randomUUID } from 'crypto'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.ts'

export const AUTH_COOKIE_NAME = 'met_auth'
export const CSRF_HEADER_NAME = 'X-CSRF-Token'

const parseCookieHeader = (headerValue: string | undefined) => {
  if (!headerValue) return new Map<string, string>()

  return new Map(
    headerValue
      .split(';')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const separatorIndex = chunk.indexOf('=')
        if (separatorIndex === -1) return [chunk, ''] as const
        return [chunk.slice(0, separatorIndex), decodeURIComponent(chunk.slice(separatorIndex + 1))] as const
      })
  )
}

const buildCookieOptions = () => ({
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: (env.nodeEnv === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
})

export const createAuthSession = (userId: string) => {
  const csrfToken = randomUUID()
  const expiresIn = env.jwtExpiresIn as SignOptions['expiresIn']
  const token = jwt.sign(
    { userId, csrfToken },
    env.jwtSecret,
    { expiresIn }
  )

  return { token, csrfToken }
}

export const attachAuthSession = (res: Response, userId: string) => {
  const session = createAuthSession(userId)
  res.cookie(AUTH_COOKIE_NAME, session.token, buildCookieOptions())
  res.setHeader(CSRF_HEADER_NAME, session.csrfToken)
  return session
}

export const clearAuthSession = (res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...buildCookieOptions(),
    maxAge: undefined
  })
  res.setHeader(CSRF_HEADER_NAME, '')
}

export const readAuthTokenFromRequest = (req: Request) => {
  const bearerToken = req.header('Authorization')?.replace('Bearer ', '').trim()
  if (bearerToken) return bearerToken

  const cookies = parseCookieHeader(req.header('cookie'))
  return cookies.get(AUTH_COOKIE_NAME) || ''
}
