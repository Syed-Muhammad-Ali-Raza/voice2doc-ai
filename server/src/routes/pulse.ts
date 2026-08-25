import { Router } from 'express'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import { getStudioPulse, refreshStudioPulse } from '../lib/studioPulse.js'

export const pulseRouter = Router()

pulseRouter.get('/', requireAuth, (req: AuthedRequest, res) => {
  res.json(getStudioPulse(req.user!.sub))
})

pulseRouter.post('/refresh', requireAuth, (req: AuthedRequest, res) => {
  res.json(refreshStudioPulse(req.user!.sub))
})
