import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import type { AuthedRequest } from '../middleware/auth.js'

export const documentsRouter = Router()

function mapDoc(row: {
  id: string
  title: string
  type: string
  content: string
  tone: string
  language: string
  favorite: number
  created_at: string
  updated_at: string
}) {
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
  }
}

documentsRouter.get('/', (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT id, title, type, content, tone, language, favorite, created_at, updated_at
       FROM documents WHERE user_id = ? ORDER BY updated_at DESC`,
    )
    .all(req.user!.sub) as Array<{
    id: string
    title: string
    type: string
    content: string
    tone: string
    language: string
    favorite: number
    created_at: string
    updated_at: string
  }>
  res.json(rows.map(mapDoc))
})

documentsRouter.get('/:id', (req: AuthedRequest, res) => {
  const row = db
    .prepare(
      `SELECT id, title, type, content, tone, language, favorite, created_at, updated_at
       FROM documents WHERE id = ? AND user_id = ?`,
    )
    .get(req.params.id, req.user!.sub) as
    | {
        id: string
        title: string
        type: string
        content: string
        tone: string
        language: string
        favorite: number
        created_at: string
        updated_at: string
      }
    | undefined
  if (!row) {
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
})

documentsRouter.post('/', (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid document' })
    return
  }
  const id = uuid()
  const now = new Date().toISOString()
  const { title, type, content, tone, language, favorite } = parsed.data
  db.prepare(
    `INSERT INTO documents (id, user_id, title, type, content, tone, language, favorite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.user!.sub, title, type, content, tone, language, favorite ? 1 : 0, now, now)

  const row = db
    .prepare(
      `SELECT id, title, type, content, tone, language, favorite, created_at, updated_at FROM documents WHERE id = ?`,
    )
    .get(id) as {
    id: string
    title: string
    type: string
    content: string
    tone: string
    language: string
    favorite: number
    created_at: string
    updated_at: string
  }
  res.status(201).json(mapDoc(row))
})

documentsRouter.patch('/:id', (req: AuthedRequest, res) => {
  const existing = db
    .prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user!.sub)
  if (!existing) {
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
  const current = db
    .prepare(
      `SELECT title, type, content, tone, language, favorite FROM documents WHERE id = ?`,
    )
    .get(req.params.id) as {
    title: string
    type: string
    content: string
    tone: string
    language: string
    favorite: number
  }
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE documents SET title = ?, type = ?, content = ?, tone = ?, language = ?, favorite = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    body.title ?? current.title,
    body.type ?? current.type,
    body.content ?? current.content,
    body.tone ?? current.tone,
    body.language ?? current.language,
    body.favorite === undefined ? current.favorite : body.favorite ? 1 : 0,
    now,
    req.params.id,
    req.user!.sub,
  )
  const row = db
    .prepare(
      `SELECT id, title, type, content, tone, language, favorite, created_at, updated_at FROM documents WHERE id = ?`,
    )
    .get(req.params.id) as {
    id: string
    title: string
    type: string
    content: string
    tone: string
    language: string
    favorite: number
    created_at: string
    updated_at: string
  }
  res.json(mapDoc(row))
})

documentsRouter.delete('/:id', (req: AuthedRequest, res) => {
  const result = db
    .prepare('DELETE FROM documents WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user!.sub)
  if (result.changes === 0) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.status(204).end()
})
