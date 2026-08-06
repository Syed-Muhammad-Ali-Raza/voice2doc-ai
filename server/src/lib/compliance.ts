import { v4 as uuid } from 'uuid'
import fs from 'node:fs'
import path from 'node:path'
import { db, uploadsDir } from '../db.js'

export type DataRegion = 'local' | 'us' | 'eu' | 'apac'

export interface RetentionPolicyInput {
  audioRetentionDays: number
  keepDocuments: boolean
  region: DataRegion
  auditExports: boolean
}

export const DEFAULT_RETENTION: RetentionPolicyInput = {
  audioRetentionDays: 30,
  keepDocuments: true,
  region: 'local',
  auditExports: true,
}

export function isAudioExpired(createdAtIso: string, audioRetentionDays: number, now = Date.now()): boolean {
  if (audioRetentionDays <= 0) return false
  const created = new Date(createdAtIso).getTime()
  if (Number.isNaN(created)) return false
  return now - created >= audioRetentionDays * 24 * 60 * 60 * 1000
}

export function validateRetentionDays(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_RETENTION.audioRetentionDays
  return Math.max(0, Math.min(3650, Math.floor(days)))
}

export function isDataRegion(value: string): value is DataRegion {
  return value === 'local' || value === 'us' || value === 'eu' || value === 'apac'
}

export function migrateComplianceTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS compliance_policies (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      audio_retention_days INTEGER NOT NULL DEFAULT 30,
      keep_documents INTEGER NOT NULL DEFAULT 1,
      region TEXT NOT NULL DEFAULT 'local',
      audit_exports INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
  `)
}

export function writeAudit(
  userId: string,
  action: string,
  opts?: { resourceType?: string; resourceId?: string; meta?: Record<string, unknown> },
) {
  db.prepare(
    `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    uuid(),
    userId,
    action,
    opts?.resourceType ?? null,
    opts?.resourceId ?? null,
    opts?.meta ? JSON.stringify(opts.meta) : null,
    new Date().toISOString(),
  )
}

export function listAudit(userId: string, limit = 50) {
  const rows = db
    .prepare(
      `SELECT id, action, resource_type, resource_id, meta_json, created_at
       FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, Math.min(200, Math.max(1, limit))) as Array<{
    id: string
    action: string
    resource_type: string | null
    resource_id: string | null
    meta_json: string | null
    created_at: string
  }>

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    meta: r.meta_json ? (JSON.parse(r.meta_json) as Record<string, unknown>) : null,
    createdAt: r.created_at,
  }))
}

export function getPolicy(userId: string): RetentionPolicyInput & { updatedAt: string | null } {
  const row = db
    .prepare(
      `SELECT audio_retention_days, keep_documents, region, audit_exports, updated_at
       FROM compliance_policies WHERE user_id = ?`,
    )
    .get(userId) as
    | {
        audio_retention_days: number
        keep_documents: number
        region: string
        audit_exports: number
        updated_at: string
      }
    | undefined

  if (!row) return { ...DEFAULT_RETENTION, updatedAt: null }

  return {
    audioRetentionDays: row.audio_retention_days,
    keepDocuments: Boolean(row.keep_documents),
    region: isDataRegion(row.region) ? row.region : 'local',
    auditExports: Boolean(row.audit_exports),
    updatedAt: row.updated_at,
  }
}

export function setPolicy(userId: string, patch: Partial<RetentionPolicyInput>) {
  const current = getPolicy(userId)
  const next: RetentionPolicyInput = {
    audioRetentionDays: validateRetentionDays(patch.audioRetentionDays ?? current.audioRetentionDays),
    keepDocuments: patch.keepDocuments ?? current.keepDocuments,
    region: patch.region && isDataRegion(patch.region) ? patch.region : current.region,
    auditExports: patch.auditExports ?? current.auditExports,
  }
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO compliance_policies (user_id, audio_retention_days, keep_documents, region, audit_exports, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       audio_retention_days = excluded.audio_retention_days,
       keep_documents = excluded.keep_documents,
       region = excluded.region,
       audit_exports = excluded.audit_exports,
       updated_at = excluded.updated_at`,
  ).run(
    userId,
    next.audioRetentionDays,
    next.keepDocuments ? 1 : 0,
    next.region,
    next.auditExports ? 1 : 0,
    now,
  )
  writeAudit(userId, 'compliance.policy_updated', { meta: { ...next } })
  return { ...next, updatedAt: now }
}

export function purgeExpiredAudio(userId: string) {
  const policy = getPolicy(userId)
  const assets = db
    .prepare(`SELECT id, storage_key, created_at FROM audio_assets WHERE user_id = ?`)
    .all(userId) as Array<{ id: string; storage_key: string; created_at: string }>

  let deleted = 0
  for (const asset of assets) {
    if (!isAudioExpired(asset.created_at, policy.audioRetentionDays)) continue
    const filePath = path.isAbsolute(asset.storage_key)
      ? asset.storage_key
      : path.join(uploadsDir, asset.storage_key)
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch {
      /* ignore */
    }
    db.prepare(`UPDATE jobs SET audio_id = NULL WHERE audio_id = ?`).run(asset.id)
    db.prepare(`DELETE FROM audio_assets WHERE id = ?`).run(asset.id)
    deleted += 1
  }

  writeAudit(userId, 'compliance.audio_purged', {
    meta: { deleted, retentionDays: policy.audioRetentionDays },
  })
  return { deleted, retentionDays: policy.audioRetentionDays }
}

export function exportUserData(userId: string) {
  const user = db
    .prepare(`SELECT id, email, name, plan, trials_used, trials_limit, created_at FROM users WHERE id = ?`)
    .get(userId) as
    | {
        id: string
        email: string
        name: string
        plan: string
        trials_used: number
        trials_limit: number
        created_at: string
      }
    | undefined

  const documents = db
    .prepare(
      `SELECT id, title, type, content, tone, language, favorite, created_at, updated_at, workspace_id
       FROM documents WHERE user_id = ?`,
    )
    .all(userId)

  const integrations = db
    .prepare(
      `SELECT provider, status, external_account, connected_at, updated_at
       FROM user_integrations WHERE user_id = ?`,
    )
    .all(userId)

  const policy = getPolicy(userId)
  const audit = listAudit(userId, 100)
  const echoScores = db
    .prepare(
      `SELECT document_id, score, coverage, kept_count, total_count, lost_phrases_json, tips_json, updated_at
       FROM echo_scores WHERE user_id = ?`,
    )
    .all(userId)
  const voiceTwins = db
    .prepare(
      `SELECT id, name, version, workspace_id, voice_summary, do_json, dont_json, sample_opening, markers_json, source_doc_ids_json, created_at, updated_at
       FROM voice_twins WHERE user_id = ?`,
    )
    .all(userId)
  writeAudit(userId, 'compliance.data_exported', { meta: { documentCount: documents.length } })

  return {
    exportedAt: new Date().toISOString(),
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          trialsUsed: user.trials_used,
          trialsLimit: user.trials_limit,
          createdAt: user.created_at,
        }
      : null,
    policy,
    documents,
    integrations,
    echoScores,
    voiceTwins,
    audit,
  }
}

export function wipeUserContent(userId: string) {
  const assets = db
    .prepare(`SELECT id, storage_key FROM audio_assets WHERE user_id = ?`)
    .all(userId) as Array<{ id: string; storage_key: string }>

  for (const asset of assets) {
    const filePath = path.isAbsolute(asset.storage_key)
      ? asset.storage_key
      : path.join(uploadsDir, asset.storage_key)
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch {
      /* ignore */
    }
  }

  db.prepare(
    `DELETE FROM doc_comments WHERE document_id IN (SELECT id FROM documents WHERE user_id = ?)`,
  ).run(userId)
  db.prepare(`DELETE FROM echo_scores WHERE user_id = ?`).run(userId)
  db.prepare(`DELETE FROM voice_twins WHERE user_id = ?`).run(userId)
  db.prepare(
    `DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = ?)`,
  ).run(userId)
  db.prepare(`DELETE FROM chat_sessions WHERE user_id = ?`).run(userId)
  db.prepare(`DELETE FROM jobs WHERE user_id = ?`).run(userId)
  db.prepare(`DELETE FROM audio_assets WHERE user_id = ?`).run(userId)
  db.prepare(`DELETE FROM documents WHERE user_id = ?`).run(userId)
  db.prepare(`DELETE FROM user_integrations WHERE user_id = ?`).run(userId)
  db.prepare(`DELETE FROM brand_kits WHERE user_id = ?`).run(userId)
  db.prepare(`DELETE FROM tone_profiles WHERE user_id = ?`).run(userId)
  db.prepare(
    `DELETE FROM memory_actions WHERE thread_id IN (SELECT id FROM memory_threads WHERE user_id = ?)`,
  ).run(userId)
  db.prepare(
    `DELETE FROM memory_thread_links WHERE thread_id IN (SELECT id FROM memory_threads WHERE user_id = ?)`,
  ).run(userId)
  db.prepare(
    `DELETE FROM memory_segments WHERE meeting_id IN (SELECT id FROM memory_meetings WHERE user_id = ?)`,
  ).run(userId)
  db.prepare(
    `DELETE FROM memory_speakers WHERE meeting_id IN (SELECT id FROM memory_meetings WHERE user_id = ?)`,
  ).run(userId)
  db.prepare(`DELETE FROM memory_threads WHERE user_id = ?`).run(userId)
  db.prepare(`DELETE FROM memory_meetings WHERE user_id = ?`).run(userId)

  writeAudit(userId, 'compliance.content_wiped', { meta: { keepAccount: true } })
  return { ok: true as const }
}
