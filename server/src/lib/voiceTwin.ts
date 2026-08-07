import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { writeAudit } from './compliance.js'
import { canAccessDocument, requireMember } from './teams.js'
import {
  applyVoiceTwinLocally,
  buildVoiceTwinProfile,
  buildVoiceTwinPrompt,
  scoreVoiceMatch,
  type VoiceTwinProfile,
  type WritingMarkers,
} from './voiceTwinGraph.js'

export interface VoiceTwinRecord {
  id: string
  name: string
  version: number
  workspaceId: string | null
  voiceSummary: string
  doList: string[]
  dontList: string[]
  sampleOpening: string
  markers: WritingMarkers
  sourceDocIds: string[]
  createdAt: string
  updatedAt: string
}

export function migrateVoiceTwinTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS voice_twins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT,
      name TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      voice_summary TEXT NOT NULL,
      do_json TEXT NOT NULL,
      dont_json TEXT NOT NULL,
      sample_opening TEXT NOT NULL,
      markers_json TEXT NOT NULL,
      source_doc_ids_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_voice_twins_user ON voice_twins(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_voice_twins_name ON voice_twins(user_id, name, version DESC);
  `)
}

function parseJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

function mapRow(row: {
  id: string
  name: string
  version: number
  workspace_id: string | null
  voice_summary: string
  do_json: string
  dont_json: string
  sample_opening: string
  markers_json: string
  source_doc_ids_json: string
  created_at: string
  updated_at: string
}): VoiceTwinRecord {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    workspaceId: row.workspace_id,
    voiceSummary: row.voice_summary,
    doList: parseJsonArray(row.do_json),
    dontList: parseJsonArray(row.dont_json),
    sampleOpening: row.sample_opening,
    markers: JSON.parse(row.markers_json) as WritingMarkers,
    sourceDocIds: parseJsonArray(row.source_doc_ids_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toProfile(twin: VoiceTwinRecord): VoiceTwinProfile {
  return {
    voiceSummary: twin.voiceSummary,
    doList: twin.doList,
    dontList: twin.dontList,
    sampleOpening: twin.sampleOpening,
    markers: twin.markers,
  }
}

export function listVoiceTwins(userId: string, workspaceId?: string | null) {
  const rows = (
    workspaceId
      ? db
          .prepare(
            `SELECT * FROM voice_twins WHERE user_id = ? AND (workspace_id = ? OR workspace_id IS NULL)
             ORDER BY updated_at DESC`,
          )
          .all(userId, workspaceId)
      : db.prepare(`SELECT * FROM voice_twins WHERE user_id = ? ORDER BY updated_at DESC`).all(userId)
  ) as Array<Parameters<typeof mapRow>[0]>
  return rows.map(mapRow)
}

export function getVoiceTwin(userId: string, twinId: string): VoiceTwinRecord | null {
  const row = db.prepare(`SELECT * FROM voice_twins WHERE id = ? AND user_id = ?`).get(twinId, userId) as
    | Parameters<typeof mapRow>[0]
    | undefined
  return row ? mapRow(row) : null
}

export function trainVoiceTwin(opts: {
  userId: string
  name: string
  documentIds: string[]
  includeMemory?: boolean
  workspaceId?: string | null
}): VoiceTwinRecord | { error: string; status: number } {
  if (opts.workspaceId && !requireMember(opts.workspaceId, opts.userId)) {
    return { error: 'Not a workspace member', status: 403 }
  }

  const docs: Array<{ id: string; content: string; title: string }> = []
  for (const id of opts.documentIds) {
    const doc = db
      .prepare(`SELECT id, title, content, user_id, workspace_id FROM documents WHERE id = ?`)
      .get(id) as
      | { id: string; title: string; content: string; user_id: string; workspace_id: string | null }
      | undefined
    if (!doc || !canAccessDocument(doc, opts.userId)) {
      return { error: `Document not found: ${id}`, status: 404 }
    }
    docs.push({ id: doc.id, content: doc.content, title: doc.title })
  }

  if (docs.length === 0) {
    const recent = db
      .prepare(
        `SELECT id, title, content FROM documents WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5`,
      )
      .all(opts.userId) as Array<{ id: string; title: string; content: string }>
    docs.push(...recent)
  }

  if (docs.length === 0) return { error: 'No documents available to train from', status: 400 }

  const memoryHints: string[] = []
  if (opts.includeMemory) {
    const threads = db
      .prepare(
        `SELECT title FROM memory_threads WHERE user_id = ? AND kind = 'decision' ORDER BY updated_at DESC LIMIT 5`,
      )
      .all(opts.userId) as Array<{ title: string }>
    memoryHints.push(...threads.map((t) => t.title))
  }

  const profile = buildVoiceTwinProfile(
    docs.map((d) => d.content),
    memoryHints,
  )

  const name = opts.name.trim() || 'My Voice Twin'
  const prior = db
    .prepare(
      `SELECT MAX(version) as v FROM voice_twins WHERE user_id = ? AND name = ? COLLATE NOCASE
       AND IFNULL(workspace_id, '') = IFNULL(?, '')`,
    )
    .get(opts.userId, name, opts.workspaceId ?? null) as { v: number | null }
  const version = (prior.v ?? 0) + 1
  const now = new Date().toISOString()
  const id = uuid()

  db.prepare(
    `INSERT INTO voice_twins (
      id, user_id, workspace_id, name, version, voice_summary, do_json, dont_json,
      sample_opening, markers_json, source_doc_ids_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    opts.userId,
    opts.workspaceId ?? null,
    name,
    version,
    profile.voiceSummary,
    JSON.stringify(profile.doList),
    JSON.stringify(profile.dontList),
    profile.sampleOpening,
    JSON.stringify(profile.markers),
    JSON.stringify(docs.map((d) => d.id)),
    now,
    now,
  )

  writeAudit(opts.userId, 'voice_twin.trained', {
    resourceType: 'voice_twin',
    resourceId: id,
    meta: { name, version, docs: docs.length },
  })

  return getVoiceTwin(opts.userId, id)!
}

export async function applyVoiceTwin(
  userId: string,
  twinId: string,
  html: string,
): Promise<{ html: string; matchScore: number; twin: VoiceTwinRecord } | null> {
  const twin = getVoiceTwin(userId, twinId)
  if (!twin) return null
  const profile = toProfile(twin)

  let next = applyVoiceTwinLocally(html, profile)
  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    try {
      const OpenAI = (await import('openai')).default
      const openai = new OpenAI({ apiKey })
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${buildVoiceTwinPrompt(twin.name, profile)}\n\nRewrite the HTML document so it sounds like this Voice Twin. Return only HTML.`,
          },
          { role: 'user', content: html },
        ],
      })
      next = completion.choices[0]?.message?.content?.trim() || next
    } catch {
      /* keep local apply */
    }
  }

  writeAudit(userId, 'voice_twin.applied', {
    resourceType: 'voice_twin',
    resourceId: twinId,
    meta: { matchBefore: scoreVoiceMatch(html, profile) },
  })

  return {
    html: next,
    matchScore: scoreVoiceMatch(next, profile),
    twin,
  }
}

export function deleteVoiceTwin(userId: string, twinId: string): boolean {
  const result = db.prepare(`DELETE FROM voice_twins WHERE id = ? AND user_id = ?`).run(twinId, userId)
  if (result.changes > 0) {
    writeAudit(userId, 'voice_twin.deleted', { resourceType: 'voice_twin', resourceId: twinId })
    return true
  }
  return false
}
