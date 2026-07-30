import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import type { AuthedRequest } from '../middleware/auth.js'

export const billingRouter = Router()

const planSchema = z.object({
  plan: z.enum(['free', 'pro', 'business']),
})

billingRouter.get('/entitlements', (req: AuthedRequest, res) => {
  const row = db
    .prepare('SELECT plan, trials_used, trials_limit FROM users WHERE id = ?')
    .get(req.user!.sub) as { plan: string; trials_used: number; trials_limit: number } | undefined
  if (!row) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json({
    plan: row.plan,
    trialsUsed: row.trials_used,
    trialsLimit: row.trials_limit,
    unlimitedAi: row.plan === 'pro' || row.plan === 'business',
  })
})

/** Phase 1: local plan switch. Phase 3 replaces with Stripe Checkout. */
billingRouter.post('/checkout', (req: AuthedRequest, res) => {
  const parsed = planSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid plan' })
    return
  }
  db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(parsed.data.plan, req.user!.sub)
  res.json({ url: null, plan: parsed.data.plan })
})
