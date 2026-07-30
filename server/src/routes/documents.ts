import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import type { AuthedRequest } from '../middleware/auth.js'
import { canAccessDocument, requireMember } from '../lib/teams.js'

export const documentsRouter = Router()

type DocRow = {
  id: string
  title: string
  type: string
  content: string
  tone: string
  language: string
  favorite: number
  created_at: string
  updated_at: string
  user_id: string
  workspace_id: string | null
}

function mapDoc(row: DocRow) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    content: row.content,
    tone: row.tone,
    language: row.language,
    favorite: Boolean(row.favorite),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerId: row.user_id,
    workspaceId: row.workspace_id,
  }
}

function getDoc(id: string): DocRow | undefined {
  return db
    .prepare(
      `SELECT id, title, type, content, tone, language, favorite, created_at, updated_at, user_id, workspace_id
       FROM documents WHERE id = ?`,
    )
    .get(id) as DocRow | undefined
}

documentsRouter.get('/', (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT DISTINCT d.id, d.title, d.type, d.content, d.tone, d.language, d.favorite,
              d.created_at, d.updated_at, d.user_id, d.workspace_id
       FROM documents d
       LEFT JOIN workspace_members m ON m.workspace_id = d.workspace_id AND m.user_id = ?
       WHERE d.user_id = ? OR m.user_id IS NOT NULL
       ORDER BY d.updated_at DESC`,
    )
    .all(req.user!.sub, req.user!.sub) as DocRow[]
  res.json(rows.map(mapDoc))
})

documentsRouter.get('/:id', (req: AuthedRequest, res) => {
  const row = getDoc(req.params.id)
  if (!row || !canAccessDocument(row, req.user!.sub)) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(mapDoc(row))
})

const createSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
  content: z.string(),
  tone: z.string().min(1),
  language: z.string().min(1),
  favorite: z.boolean().optional(),
  workspaceId: z.string().nullable().optional(),
})

documentsRouter.post('/', (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid document' })
    return
  }
  const workspaceId = parsed.data.workspaceId ?? null
  if (workspaceId && !requireMember(workspaceId, req.user!.sub)) {
    res.status(403).json({ error: 'Not a workspace member' })
    return
  }

  const id = uuid()
  const now = new Date().toISOString()
  const { title, type, content, tone, language, favorite } = parsed.data
  db.prepare(
    `INSERT INTO documents (id, user_id, title, type, content, tone, language, favorite, created_at, updated_at, workspace_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.user!.sub, title, type, content, tone, language, favorite ? 1 : 0, now, now, workspaceId)

  res.status(201).json(mapDoc(getDoc(id)!))
})

documentsRouter.patch('/:id', (req: AuthedRequest, res) => {
  const row = getDoc(req.params.id)
  if (!row || !canAccessDocument(row, req.user!.sub)) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const body = req.body as Partial<{
    title: string
    type: string
    content: string
    tone: string
    language: string
    favorite: boolean
  }>
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE documents SET title = ?, type = ?, content = ?, tone = ?, language = ?, favorite = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    body.title ?? row.title,
    body.type ?? row.type,
    body.content ?? row.content,
    body.tone ?? row.tone,
    body.language ?? row.language,
    body.favorite === undefined ? row.favorite : body.favorite ? 1 : 0,
    now,
    req.params.id,
  )
  res.json(mapDoc(getDoc(req.params.id)!))
})

documentsRouter.delete('/:id', (req: AuthedRequest, res) => {
  const row = getDoc(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  // Owner can always delete; workspace admin/owner can delete shared docs
  if (row.user_id !== req.user!.sub) {
    if (!row.workspace_id) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const role = requireMember(row.workspace_id, req.user!.sub)
    if (role !== 'owner' && role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
  }
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

/** Share / unshare a document with a workspace. */
documentsRouter.post('/:id/share', (req: AuthedRequest, res) => {
  const parsed = z
    .object({ workspaceId: z.string().nullable() })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'workspaceId required (or null to unshare)' })
    return
  }

  const row = getDoc(req.params.id)
  if (!row || row.user_id !== req.user!.sub) {
    res.status(404).json({ error: 'Only the document owner can share it' })
    return
  }

  const workspaceId = parsed.data.workspaceId
  if (workspaceId && !requireMember(workspaceId, req.user!.sub)) {
    res.status(403).json({ error: 'Join the workspace before sharing into it' })
    return
  }

  db.prepare('UPDATE documents SET workspace_id = ?, updated_at = ? WHERE id = ?').run(
    workspaceId,
    new Date().toISOString(),
    req.params.id,
  )
  res.json(mapDoc(getDoc(req.params.id)!))
})
