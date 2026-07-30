import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { requireAuth, signToken, type AuthedRequest } from '../middleware/auth.js'

export const authRouter = Router()

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(128),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function publicUser(row: {
  id: string
  email: string
  name: string
  plan: string
  trials_used: number
  trials_limit: number
}) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    trialsUsed: row.trials_used,
    trialsLimit: row.trials_limit,
  }
}

authRouter.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid registration payload' })
    return
  }
  const { name, email, password } = parsed.data
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }
  const id = uuid()
  const now = new Date().toISOString()
  const password_hash = bcrypt.hashSync(password, 10)
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, plan, trials_used, trials_limit, created_at)
     VALUES (?, ?, ?, ?, 'free', 0, 10, ?)`,
  ).run(id, email.toLowerCase(), name, password_hash, now)

  const row = db
    .prepare('SELECT id, email, name, plan, trials_used, trials_limit FROM users WHERE id = ?')
    .get(id) as {
    id: string
    email: string
    name: string
    plan: string
    trials_used: number
    trials_limit: number
  }
  const token = signToken({ sub: id, email: row.email })
  res.status(201).json({ token, user: publicUser(row) })
})

authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid login payload' })
    return
  }
  const { email, password } = parsed.data
  const row = db
    .prepare(
      'SELECT id, email, name, password_hash, plan, trials_used, trials_limit FROM users WHERE email = ?',
    )
    .get(email.toLowerCase()) as
    | {
        id: string
        email: string
        name: string
        password_hash: string
        plan: string
        trials_used: number
        trials_limit: number
      }
    | undefined

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }
  const token = signToken({ sub: row.id, email: row.email })
  res.json({ token, user: publicUser(row) })
})

authRouter.get('/session', requireAuth, (req: AuthedRequest, res) => {
  const row = db
    .prepare('SELECT id, email, name, plan, trials_used, trials_limit FROM users WHERE id = ?')
    .get(req.user!.sub) as
    | {
        id: string
        email: string
        name: string
        plan: string
        trials_used: number
        trials_limit: number
      }
    | undefined
  if (!row) {
    res.status(401).json({ error: 'User not found' })
    return
  }
  const header = req.headers.authorization!
  const token = header.slice(7)
  res.json({ token, user: publicUser(row) })
})

authRouter.post('/logout', (_req, res) => {
  res.json({ ok: true })
})

authRouter.get('/google', (_req, res) => {
  res.status(501).json({
    error: 'Google OAuth not configured in Phase 1. Use email/password or keep mock mode.',
  })
})
