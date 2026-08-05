import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { canAccessDocument } from './teams.js'
import { writeAudit } from './compliance.js'
import { computeEchoScore, type EchoScoreResult } from './echoScoreGraph.js'

export interface EchoScoreRecord extends EchoScoreResult {
  id: string
  documentId: string
  jobId: string | null
  transcriptExcerpt: string
  createdAt: string
  updatedAt: string
}

export function migrateEchoTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS echo_scores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      job_id TEXT,
      score INTEGER NOT NULL,
      coverage REAL NOT NULL,
      kept_count INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      lost_phrases_json TEXT NOT NULL,
      tips_json TEXT NOT NULL,
      transcript_excerpt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(document_id)
    );

    CREATE INDEX IF NOT EXISTS idx_echo_scores_user ON echo_scores(user_id, updated_at DESC);
  `)
}

function excerpt(transcript: string): string {
  return transcript.replace(/\s+/g, ' ').trim().slice(0, 400)
}

function mapRow(row: {
  id: string
  document_id: string
  job_id: string | null
  score: number
  coverage: number
  kept_count: number
  total_count: number
  lost_phrases_json: string
  tips_json: string
  transcript_excerpt: string
  created_at: string
  updated_at: string
}): EchoScoreRecord {
  return {
    id: row.id,
    documentId: row.document_id,
    jobId: row.job_id,
    score: row.score,
    coverage: row.coverage,
    keptCount: row.kept_count,
    totalCount: row.total_count,
    lostPhrases: JSON.parse(row.lost_phrases_json) as EchoScoreRecord['lostPhrases'],
    tips: JSON.parse(row.tips_json) as EchoScoreRecord['tips'],
    transcriptExcerpt: row.transcript_excerpt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function upsertEchoScore(opts: {
  userId: string
  documentId: string
  transcript: string
  draftHtml: string
  jobId?: string | null
}): EchoScoreRecord {
  const computed = computeEchoScore(opts.transcript, opts.draftHtml)
  const now = new Date().toISOString()
  const existing = db
    .prepare(`SELECT id, created_at FROM echo_scores WHERE document_id = ?`)
    .get(opts.documentId) as { id: string; created_at: string } | undefined
  const id = existing?.id ?? uuid()
  const createdAt = existing?.created_at ?? now

  db.prepare(
    `INSERT INTO echo_scores (
      id, user_id, document_id, job_id, score, coverage, kept_count, total_count,
      lost_phrases_json, tips_json, transcript_excerpt, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(document_id) DO UPDATE SET
      job_id = excluded.job_id,
      score = excluded.score,
      coverage = excluded.coverage,
      kept_count = excluded.kept_count,
      total_count = excluded.total_count,
      lost_phrases_json = excluded.lost_phrases_json,
      tips_json = excluded.tips_json,
      transcript_excerpt = excluded.transcript_excerpt,
      updated_at = excluded.updated_at`,
  ).run(
    id,
    opts.userId,
    opts.documentId,
    opts.jobId ?? null,
    computed.score,
    computed.coverage,
    computed.keptCount,
    computed.totalCount,
    JSON.stringify(computed.lostPhrases),
    JSON.stringify(computed.tips),
    excerpt(opts.transcript),
    createdAt,
    now,
  )

  writeAudit(opts.userId, 'echo.score_updated', {
    resourceType: 'document',
    resourceId: opts.documentId,
    meta: { score: computed.score, lost: computed.lostPhrases.length },
  })

  return getEchoScore(opts.userId, opts.documentId)!
}

export function getEchoScore(userId: string, documentId: string): EchoScoreRecord | null {
  const doc = db
    .prepare(`SELECT id, user_id, workspace_id FROM documents WHERE id = ?`)
    .get(documentId) as { id: string; user_id: string; workspace_id: string | null } | undefined
  if (!doc || !canAccessDocument(doc, userId)) return null

  const row = db
    .prepare(
      `SELECT id, document_id, job_id, score, coverage, kept_count, total_count,
              lost_phrases_json, tips_json, transcript_excerpt, created_at, updated_at
       FROM echo_scores WHERE document_id = ?`,
    )
    .get(documentId) as
    | {
        id: string
        document_id: string
        job_id: string | null
        score: number
        coverage: number
        kept_count: number
        total_count: number
        lost_phrases_json: string
        tips_json: string
        transcript_excerpt: string
        created_at: string
        updated_at: string
      }
    | undefined

  return row ? mapRow(row) : null
}

function findTranscript(userId: string, documentId: string): { transcript: string; jobId: string | null } | null {
  const fromJob = db
    .prepare(
      `SELECT id, transcript FROM jobs
       WHERE user_id = ? AND document_id = ? AND transcript IS NOT NULL AND transcript != ''
       ORDER BY updated_at DESC LIMIT 1`,
    )
    .get(userId, documentId) as { id: string; transcript: string } | undefined
  if (fromJob?.transcript) return { transcript: fromJob.transcript, jobId: fromJob.id }

  const fromMemory = db
    .prepare(
      `SELECT transcript FROM memory_meetings
       WHERE user_id = ? AND document_id = ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId, documentId) as { transcript: string } | undefined
  if (fromMemory?.transcript) return { transcript: fromMemory.transcript, jobId: null }

  return null
}

export function recomputeEchoScore(
  userId: string,
  documentId: string,
  draftHtml?: string,
): EchoScoreRecord | null {
  const doc = db
    .prepare(`SELECT id, user_id, workspace_id, content FROM documents WHERE id = ?`)
    .get(documentId) as
    | { id: string; user_id: string; workspace_id: string | null; content: string }
    | undefined
  if (!doc || !canAccessDocument(doc, userId)) return null

  const source = findTranscript(userId, documentId)
  if (!source) {
    return upsertEchoScore({
      userId,
      documentId,
      transcript: '',
      draftHtml: draftHtml ?? doc.content,
      jobId: null,
    })
  }

  return upsertEchoScore({
    userId,
    documentId,
    transcript: source.transcript,
    draftHtml: draftHtml ?? doc.content,
    jobId: source.jobId,
  })
}
