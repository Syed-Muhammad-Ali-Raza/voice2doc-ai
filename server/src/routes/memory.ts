import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import {
  getThreadDetail,
  ingestMeetingMemory,
  listMeetings,
  listThreads,
  setThreadStatus,
} from '../lib/memory.js'

export const memoryRouter = Router()

memoryRouter.get('/threads', requireAuth, (req: AuthedRequest, res) => {
  res.json({ threads: listThreads(req.user!.sub) })
})

memoryRouter.get('/meetings', requireAuth, (req: AuthedRequest, res) => {
  res.json({ meetings: listMeetings(req.user!.sub) })
})

memoryRouter.get('/threads/:id', requireAuth, (req: AuthedRequest, res) => {
  const detail = getThreadDetail(req.user!.sub, req.params.id as string)
  if (!detail) {
    res.status(404).json({ error: 'Thread not found' })
    return
  }
  res.json(detail)
})

memoryRouter.patch('/threads/:id', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z.object({ status: z.enum(['open', 'closed']) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }
  const ok = setThreadStatus(req.user!.sub, req.params.id as string, parsed.data.status)
  if (!ok) {
    res.status(404).json({ error: 'Thread not found' })
    return
  }
  const detail = getThreadDetail(req.user!.sub, req.params.id as string)
  res.json(detail)
})

memoryRouter.post('/ingest', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      title: z.string().min(1).max(200),
      transcript: z.string().min(1).max(50000),
      documentId: z.string().optional(),
      sourceProvider: z.string().optional(),
      meetingAt: z.string().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid ingest payload' })
    return
  }
  const result = ingestMeetingMemory({
    userId: req.user!.sub,
    title: parsed.data.title,
    transcript: parsed.data.transcript,
    documentId: parsed.data.documentId,
    sourceProvider: parsed.data.sourceProvider,
    meetingAt: parsed.data.meetingAt,
  })
  res.status(201).json({ ok: true, ...result })
})
