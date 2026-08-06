import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import { getEchoScore, recomputeEchoScore } from '../lib/echo.js'

export const echoRouter = Router()

echoRouter.get('/:documentId', requireAuth, (req: AuthedRequest, res) => {
  const record = getEchoScore(req.user!.sub, req.params.documentId as string)
  if (!record) {
    res.status(404).json({ error: 'Echo score not found' })
    return
  }
  res.json(record)
})

echoRouter.post('/:documentId/recompute', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z.object({ content: z.string().max(200000).optional() }).safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid echo recompute payload' })
    return
  }
  const record = recomputeEchoScore(req.user!.sub, req.params.documentId as string, parsed.data.content)
  if (!record) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  res.json(record)
})
