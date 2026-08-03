import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { canAccessDocument } from './teams.js'
import {
  formatVoiceTimestamp,
  mirrorCommentIntoHtml,
  presenceColor,
  removeMirroredComment,
} from './collabGraph.js'

export type PresenceMode = 'editing' | 'listening' | 'recording'

export interface PresencePeer {
  userId: string
  name: string
  email: string
  color: string
  mode: PresenceMode
  joinedAt: string
  lastSeenAt: string
}

type DocAccessRow = { id: string; user_id: string; workspace_id: string | null; content: string; updated_at: string }

/** In-memory presence rooms keyed by document id. */
const rooms = new Map<string, Map<string, PresencePeer>>()

export function migrateCollabTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS doc_comments (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL DEFAULT 0,
      mirrored INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_doc_comments_doc ON doc_comments(document_id);
  `)

  const cols = db.prepare(`PRAGMA table_info(documents)`).all() as Array<{ name: string }>
  const names = new Set(cols.map((c) => c.name))
  if (!names.has('revision')) {
    db.exec(`ALTER TABLE documents ADD COLUMN revision INTEGER NOT NULL DEFAULT 1`)
  }
}

function getAccessibleDoc(documentId: string, userId: string): DocAccessRow | null {
  const row = db
    .prepare(`SELECT id, user_id, workspace_id, content, updated_at FROM documents WHERE id = ?`)
    .get(documentId) as DocAccessRow | undefined
  if (!row || !canAccessDocument(row, userId)) return null
  return row
}

export function listComments(documentId: string, userId: string) {
  if (!getAccessibleDoc(documentId, userId)) return null
  const rows = db
    .prepare(
      `SELECT id, document_id, user_id, author_name, body, timestamp_ms, mirrored, created_at, updated_at
       FROM doc_comments WHERE document_id = ? ORDER BY timestamp_ms ASC, created_at ASC`,
    )
    .all(documentId) as Array<{
    id: string
    document_id: string
    user_id: string
    author_name: string
    body: string
    timestamp_ms: number
    mirrored: number
    created_at: string
    updated_at: string
  }>

  return rows.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    userId: r.user_id,
    authorName: r.author_name,
    body: r.body,
    timestampMs: r.timestamp_ms,
    timestampLabel: formatVoiceTimestamp(r.timestamp_ms),
    mirrored: Boolean(r.mirrored),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export function createComment(
  documentId: string,
  user: { id: string; name: string },
  input: { body: string; timestampMs: number; mirror?: boolean },
) {
  const doc = getAccessibleDoc(documentId, user.id)
  if (!doc) return null

  const id = uuid()
  const now = new Date().toISOString()
  const mirror = input.mirror !== false
  db.prepare(
    `INSERT INTO doc_comments (id, document_id, user_id, author_name, body, timestamp_ms, mirrored, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, documentId, user.id, user.name, input.body, input.timestampMs, mirror ? 1 : 0, now, now)

  if (mirror) {
    const nextHtml = mirrorCommentIntoHtml(doc.content, {
      id,
      authorName: user.name,
      body: input.body,
      timestampMs: input.timestampMs,
    })
    db.prepare(
      `UPDATE documents SET content = ?, updated_at = ?, revision = revision + 1 WHERE id = ?`,
    ).run(nextHtml, now, documentId)
  }

  return listComments(documentId, user.id)?.find((c) => c.id === id) ?? null
}

export function deleteComment(documentId: string, commentId: string, userId: string) {
  const doc = getAccessibleDoc(documentId, userId)
  if (!doc) return { ok: false as const, error: 'not_found' }

  const row = db
    .prepare(`SELECT id, user_id, mirrored FROM doc_comments WHERE id = ? AND document_id = ?`)
    .get(commentId, documentId) as { id: string; user_id: string; mirrored: number } | undefined
  if (!row) return { ok: false as const, error: 'not_found' }
  if (row.user_id !== userId && doc.user_id !== userId) {
    return { ok: false as const, error: 'forbidden' }
  }

  db.prepare(`DELETE FROM doc_comments WHERE id = ?`).run(commentId)
  if (row.mirrored) {
    const nextHtml = removeMirroredComment(doc.content, commentId)
    db.prepare(
      `UPDATE documents SET content = ?, updated_at = ?, revision = revision + 1 WHERE id = ?`,
    ).run(nextHtml, new Date().toISOString(), documentId)
  }
  return { ok: true as const }
}

export function touchPresence(
  documentId: string,
  peer: { userId: string; name: string; email: string; mode?: PresenceMode },
): PresencePeer[] {
  let room = rooms.get(documentId)
  if (!room) {
    room = new Map()
    rooms.set(documentId, room)
  }
  const now = new Date().toISOString()
  const existing = room.get(peer.userId)
  room.set(peer.userId, {
    userId: peer.userId,
    name: peer.name,
    email: peer.email,
    color: presenceColor(peer.userId),
    mode: peer.mode || existing?.mode || 'editing',
    joinedAt: existing?.joinedAt || now,
    lastSeenAt: now,
  })
  prunePresence(documentId)
  return listPresence(documentId)
}

export function leavePresence(documentId: string, userId: string): PresencePeer[] {
  const room = rooms.get(documentId)
  if (!room) return []
  room.delete(userId)
  if (room.size === 0) rooms.delete(documentId)
  return listPresence(documentId)
}

export function listPresence(documentId: string): PresencePeer[] {
  prunePresence(documentId)
  const room = rooms.get(documentId)
  if (!room) return []
  return [...room.values()].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
}

function prunePresence(documentId: string) {
  const room = rooms.get(documentId)
  if (!room) return
  const cutoff = Date.now() - 45_000
  for (const [id, peer] of room) {
    if (new Date(peer.lastSeenAt).getTime() < cutoff) room.delete(id)
  }
  if (room.size === 0) rooms.delete(documentId)
}

export function userCanAccessDocument(documentId: string, userId: string): boolean {
  return Boolean(getAccessibleDoc(documentId, userId))
}

export function getDocumentRevision(documentId: string): { revision: number; updatedAt: string } | null {
  const row = db
    .prepare(`SELECT revision, updated_at FROM documents WHERE id = ?`)
    .get(documentId) as { revision: number; updated_at: string } | undefined
  if (!row) return null
  return { revision: row.revision ?? 1, updatedAt: row.updated_at }
}
