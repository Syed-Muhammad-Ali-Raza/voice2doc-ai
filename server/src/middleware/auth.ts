import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'voice2doc-dev-secret-change-me'

export interface AuthPayload {
  sub: string
  email: string
}

export interface AuthedRequest extends Request {
  user?: AuthPayload
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const token = header.slice(7)
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
