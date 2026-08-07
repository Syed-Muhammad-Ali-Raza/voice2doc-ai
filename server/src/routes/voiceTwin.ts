import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import {
  applyVoiceTwin,
  deleteVoiceTwin,
  getVoiceTwin,
  listVoiceTwins,
  trainVoiceTwin,
} from '../lib/voiceTwin.js'

export const voiceTwinRouter = Router()

voiceTwinRouter.get('/', requireAuth, (req: AuthedRequest, res) => {
  const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined
  res.json({ twins: listVoiceTwins(req.user!.sub, workspaceId) })
})

voiceTwinRouter.post('/train', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).max(120).optional(),
      documentIds: z.array(z.string()).max(20).optional(),
      includeMemory: z.boolean().optional(),
      workspaceId: z.string().nullable().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid Voice Twin train payload' })
    return
  }

  const result = trainVoiceTwin({
    userId: req.user!.sub,
    name: parsed.data.name || 'My Voice Twin',
    documentIds: parsed.data.documentIds ?? [],
    includeMemory: parsed.data.includeMemory ?? true,
    workspaceId: parsed.data.workspaceId ?? null,
  })

  if ('error' in result) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.status(201).json(result)
})

voiceTwinRouter.get('/:id', requireAuth, (req: AuthedRequest, res) => {
  const twin = getVoiceTwin(req.user!.sub, req.params.id as string)
  if (!twin) {
    res.status(404).json({ error: 'Voice Twin not found' })
    return
  }
  res.json(twin)
})

voiceTwinRouter.post('/:id/apply', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ html: z.string().min(1).max(200000) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid apply payload' })
    return
  }
  const result = await applyVoiceTwin(req.user!.sub, req.params.id as string, parsed.data.html)
  if (!result) {
    res.status(404).json({ error: 'Voice Twin not found' })
    return
  }
  res.json(result)
})

voiceTwinRouter.delete('/:id', requireAuth, (req: AuthedRequest, res) => {
  const ok = deleteVoiceTwin(req.user!.sub, req.params.id as string)
  if (!ok) {
    res.status(404).json({ error: 'Voice Twin not found' })
    return
  }
  res.status(204).end()
})
