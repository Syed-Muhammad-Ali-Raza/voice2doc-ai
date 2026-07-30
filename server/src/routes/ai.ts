import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { db, uploadsDir } from '../db.js'
import type { AuthedRequest } from '../middleware/auth.js'
import { enqueueJob, STAGES } from '../lib/pipeline.js'

export const aiRouter = Router()

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.webm'
      cb(null, `${uuid()}${ext}`)
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith('audio/') ||
      /\.(mp3|wav|m4a|aac|flac|webm|ogg|mpeg)$/i.test(file.originalname)
    cb(null, ok)
  },
})

const configSchema = z.object({
  type: z.string(),
  tone: z.string(),
  length: z.string(),
  language: z.string(),
  speakerDetection: z.union([z.boolean(), z.string()]).optional(),
  source: z.string(),
  sourceLabel: z.string().optional(),
})

function assertCanProcess(userId: string) {
  const user = db
    .prepare('SELECT plan, trials_used, trials_limit FROM users WHERE id = ?')
    .get(userId) as { plan: string; trials_used: number; trials_limit: number } | undefined
  if (!user) return { ok: false as const, status: 404, error: 'User not found' }
  const unlimited = user.plan === 'pro' || user.plan === 'business'
  if (!unlimited && user.trials_used >= user.trials_limit) {
    return { ok: false as const, status: 402, error: 'Free limit reached. Upgrade to continue.' }
  }
  return { ok: true as const, user, unlimited }
}

function mapJob(row: {
  id: string
  status: string
  stage: string
  stage_index: number
  transcript: string | null
  document_id: string | null
  error: string | null
  provider: string | null
  created_at: string
  updated_at: string
  finished_at: string | null
}) {
  return {
    id: row.id,
    status: row.status,
    stage: row.stage,
    stageIndex: row.stage_index,
    stages: STAGES,
    transcript: row.transcript,
    documentId: row.document_id,
    error: row.error,
    provider: row.provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at,
    done: row.status === 'completed',
  }
}

/** Phase 2: create async job (optional audio file). */
aiRouter.post('/jobs', upload.single('audio'), (req: AuthedRequest, res) => {
  const gate = assertCanProcess(req.user!.sub)
  if (!gate.ok) {
    if (req.file) fs.unlink(req.file.path, () => undefined)
    res.status(gate.status).json({ error: gate.error })
    return
  }

  let configRaw = req.body.config
  if (typeof configRaw === 'string') {
    try {
      configRaw = JSON.parse(configRaw)
    } catch {
      res.status(400).json({ error: 'Invalid config JSON' })
      return
    }
  }
  const parsed = configSchema.safeParse(configRaw ?? req.body)
  if (!parsed.success) {
    if (req.file) fs.unlink(req.file.path, () => undefined)
    res.status(400).json({ error: 'Invalid process config' })
    return
  }

  const now = new Date().toISOString()
  let audioId: string | null = null
  if (req.file) {
    audioId = uuid()
    db.prepare(
      `INSERT INTO audio_assets (id, user_id, storage_key, original_name, mime, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      audioId,
      req.user!.sub,
      path.basename(req.file.path),
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      now,
    )
  }

  const jobId = uuid()
  db.prepare(
    `INSERT INTO jobs (id, user_id, audio_id, status, stage, stage_index, config_json, created_at, updated_at)
     VALUES (?, ?, ?, 'queued', 'Uploading', 0, ?, ?, ?)`,
  ).run(jobId, req.user!.sub, audioId, JSON.stringify(parsed.data), now, now)

  enqueueJob(jobId)
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as Parameters<typeof mapJob>[0]
  res.status(202).json({ job: mapJob(row) })
})

aiRouter.get('/jobs/:id', (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.sub) as
    | Parameters<typeof mapJob>[0]
    | undefined
  if (!row) {
    res.status(404).json({ error: 'Job not found' })
    return
  }

  const payload: Record<string, unknown> = { job: mapJob(row) }

  if (row.status === 'completed' && row.document_id) {
    const doc = db
      .prepare(
        `SELECT id, title, type, content, tone, language, favorite, created_at, updated_at
         FROM documents WHERE id = ? AND user_id = ?`,
      )
      .get(row.document_id, req.user!.sub) as
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
    if (doc) {
      payload.result = {
        id: doc.id,
        title: doc.title,
        type: doc.type,
        content: doc.content,
        tone: doc.tone,
        language: doc.language,
        favorite: Boolean(doc.favorite),
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      }
    }
    const trials = db
      .prepare('SELECT plan, trials_used, trials_limit FROM users WHERE id = ?')
      .get(req.user!.sub) as { plan: string; trials_used: number; trials_limit: number }
    payload.entitlements = {
      plan: trials.plan,
      trialsUsed: trials.trials_used,
      trialsLimit: trials.trials_limit,
      unlimitedAi: trials.plan === 'pro' || trials.plan === 'business',
    }
  }

  if (row.status === 'payment_required') {
    res.status(402).json({ error: row.error || 'Payment required', job: mapJob(row) })
    return
  }

  res.json(payload)
})

/** Legacy sync process (no audio) — still used as fallback. */
aiRouter.post('/process', async (req: AuthedRequest, res) => {
  const parsed = configSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid process config' })
    return
  }
  const gate = assertCanProcess(req.user!.sub)
  if (!gate.ok) {
    res.status(gate.status).json({ error: gate.error })
    return
  }

  const now = new Date().toISOString()
  const jobId = uuid()
  db.prepare(
    `INSERT INTO jobs (id, user_id, audio_id, status, stage, stage_index, config_json, created_at, updated_at)
     VALUES (?, ?, NULL, 'queued', 'Uploading', 0, ?, ?, ?)`,
  ).run(jobId, req.user!.sub, JSON.stringify(parsed.data), now, now)
  enqueueJob(jobId)

  // Wait briefly then return job id for client polling (compat)
  res.status(202).json({
    job: mapJob(
      db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as Parameters<typeof mapJob>[0],
    ),
  })
})

const transformSchema = z.object({
  html: z.string(),
  action: z.enum(['rewrite', 'expand', 'shorten', 'grammar', 'translate']),
  language: z.string().optional(),
})

aiRouter.post('/transform', async (req, res) => {
  const parsed = transformSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid transform payload' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Apply the action "${parsed.data.action}" to the HTML document. Return only HTML. Language hint: ${parsed.data.language ?? 'English'}.`,
        },
        { role: 'user', content: parsed.data.html },
      ],
    })
    res.json({ html: completion.choices[0]?.message?.content || parsed.data.html })
    return
  }

  const { html, action, language } = parsed.data
  let next = html
  switch (action) {
    case 'rewrite':
      next = `<p><em>Rewritten for clarity.</em></p>${html}`
      break
    case 'expand':
      next = `${html}<p>Expanded insight: supporting context added so the document stands alone.</p>`
      break
    case 'shorten':
      next = html.replace(/<p><em>.*?<\/em><\/p>/g, '').slice(0, Math.max(html.length * 0.7, 200))
      break
    case 'grammar':
      next = `<p><em>Grammar polished.</em></p>${html}`
      break
    case 'translate':
      next = `<p><em>Translated preview (${language ?? 'English'}).</em></p>${html}`
      break
  }
  res.json({ html: next })
})
