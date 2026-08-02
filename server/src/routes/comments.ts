import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import type { AuthedRequest } from '../middleware/auth.js'
import {
  createComment,
  deleteComment,
  listComments,
  listPresence,
  touchPresence,
  type PresenceMode,
} from '../lib/collab.js'
import { broadcastCollab } from '../ws/collabHub.js'

export const commentsRouter = Router({ mergeParams: true })

function authorName(userId: string, email: string): string {
  const row = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined
  return row?.name || email.split('@')[0] || 'Teammate'
}

commentsRouter.get('/', (req: AuthedRequest, res) => {
  const documentId = req.params.id as string
  const comments = listComments(documentId, req.user!.sub)
  if (!comments) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  res.json({
    comments,
    presence: listPresence(documentId),
  })
})

commentsRouter.post('/', (req: AuthedRequest, res) => {
  const documentId = req.params.id as string
  const parsed = z
    .object({
      body: z.string().min(1).max(2000),
      timestampMs: z.number().int().min(0).max(24 * 60 * 60 * 1000),
      mirror: z.boolean().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid comment payload' })
    return
  }

  const comment = createComment(
    documentId,
    { id: req.user!.sub, name: authorName(req.user!.sub, req.user!.email) },
    parsed.data,
  )
  if (!comment) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  broadcastCollab(documentId, { type: 'comment:created', comment })
  res.status(201).json(comment)
})

commentsRouter.delete('/:commentId', (req: AuthedRequest, res) => {
  const documentId = req.params.id as string
  const result = deleteComment(documentId, req.params.commentId as string, req.user!.sub)
  if (!result.ok) {
    res.status(result.error === 'forbidden' ? 403 : 404).json({ error: result.error })
    return
  }
  broadcastCollab(documentId, { type: 'comment:deleted', commentId: req.params.commentId })
  res.status(204).end()
})

commentsRouter.post('/presence', (req: AuthedRequest, res) => {
  const documentId = req.params.id as string
  const parsed = z
    .object({
      mode: z.enum(['editing', 'listening', 'recording']).optional(),
    })
    .safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid presence payload' })
    return
  }

  const comments = listComments(documentId, req.user!.sub)
  if (!comments) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  const presence = touchPresence(documentId, {
    userId: req.user!.sub,
    name: authorName(req.user!.sub, req.user!.email),
    email: req.user!.email,
    mode: parsed.data.mode as PresenceMode | undefined,
  })
  broadcastCollab(documentId, { type: 'presence', presence })
  res.json({ presence })
})
