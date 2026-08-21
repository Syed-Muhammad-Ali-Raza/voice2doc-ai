import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import {
  exportUserData,
  getPolicy,
  listAudit,
  purgeExpiredAudio,
  setPolicy,
  wipeUserContent,
  writeAudit,
} from '../lib/compliance.js'

export const complianceRouter = Router()

complianceRouter.get('/policy', requireAuth, (req: AuthedRequest, res) => {
  res.json(getPolicy(req.user!.sub))
})

complianceRouter.put('/policy', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      audioRetentionDays: z.number().int().min(0).max(3650).optional(),
      keepDocuments: z.boolean().optional(),
      region: z.enum(['local', 'us', 'eu', 'apac']).optional(),
      auditExports: z.boolean().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid compliance policy' })
    return
  }
  res.json(setPolicy(req.user!.sub, parsed.data))
})

complianceRouter.get('/audit', requireAuth, (req: AuthedRequest, res) => {
  const limit = Number(req.query.limit || 50)
  res.json({ entries: listAudit(req.user!.sub, Number.isFinite(limit) ? limit : 50) })
})

complianceRouter.post('/purge-audio', requireAuth, (req: AuthedRequest, res) => {
  res.json(purgeExpiredAudio(req.user!.sub))
})

complianceRouter.post('/export', requireAuth, (req: AuthedRequest, res) => {
  res.json(exportUserData(req.user!.sub))
})

complianceRouter.post('/wipe', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z.object({ confirm: z.literal('WIPE') }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Send { "confirm": "WIPE" } to wipe content' })
    return
  }
  res.json(wipeUserContent(req.user!.sub))
})

complianceRouter.post('/log-voice-command', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      command: z.string().min(1).max(200),
      status: z.enum(['executed', 'cancelled']).default('executed'),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid voice command log payload' })
    return
  }
  writeAudit(req.user!.sub, 'ui.voice_command', {
    meta: { command: parsed.data.command, status: parsed.data.status },
  })
  res.status(201).json({ ok: true })
})

