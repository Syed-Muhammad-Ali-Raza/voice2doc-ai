import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import {
  extractActionCandidates,
  extractDecisionCandidates,
  extractSpeakerSegments,
  fingerprintDecision,
  mergeThreadFingerprints,
} from './memoryGraph.js'

export function migrateMemoryTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_meetings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_id TEXT,
      title TEXT NOT NULL,
      source_provider TEXT,
      meeting_at TEXT NOT NULL,
      transcript TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_speakers (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL REFERENCES memory_meetings(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      display_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_segments (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL REFERENCES memory_meetings(id) ON DELETE CASCADE,
      speaker_id TEXT REFERENCES memory_speakers(id) ON DELETE SET NULL,
      start_ms INTEGER NOT NULL,
      end_ms INTEGER NOT NULL,
      text TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_threads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      fingerprint TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_thread_links (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES memory_threads(id) ON DELETE CASCADE,
      meeting_id TEXT NOT NULL REFERENCES memory_meetings(id) ON DELETE CASCADE,
      note TEXT,
      UNIQUE(thread_id, meeting_id)
    );

    CREATE TABLE IF NOT EXISTS memory_actions (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES memory_threads(id) ON DELETE CASCADE,
      owner_label TEXT,
      due_hint TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memory_meetings_user ON memory_meetings(user_id);
    CREATE INDEX IF NOT EXISTS idx_memory_threads_user ON memory_threads(user_id);
    CREATE INDEX IF NOT EXISTS idx_memory_threads_fp ON memory_threads(user_id, fingerprint);
  `)
}

function upsertSpeaker(meetingId: string, label: string): string {
  const existing = db
    .prepare('SELECT id FROM memory_speakers WHERE meeting_id = ? AND label = ?')
    .get(meetingId, label) as { id: string } | undefined
  if (existing) return existing.id
  const id = uuid()
  db.prepare(
    `INSERT INTO memory_speakers (id, meeting_id, label, display_name) VALUES (?, ?, ?, ?)`,
  ).run(id, meetingId, label, label)
  return id
}

function linkThread(threadId: string, meetingId: string, note?: string) {
  const id = uuid()
  try {
    db.prepare(
      `INSERT INTO memory_thread_links (id, thread_id, meeting_id, note) VALUES (?, ?, ?, ?)`,
    ).run(id, threadId, meetingId, note ?? null)
  } catch {
    /* unique link already exists */
  }
}

export function ingestMeetingMemory(opts: {
  userId: string
  title: string
  transcript: string
  documentId?: string | null
  sourceProvider?: string | null
  meetingAt?: string
}): { meetingId: string; threadIds: string[]; actionCount: number } {
  const meetingId = uuid()
  const now = opts.meetingAt || new Date().toISOString()
  db.prepare(
    `INSERT INTO memory_meetings (id, user_id, document_id, title, source_provider, meeting_at, transcript, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    meetingId,
    opts.userId,
    opts.documentId ?? null,
    opts.title,
    opts.sourceProvider ?? null,
    now,
    opts.transcript,
    new Date().toISOString(),
  )

  const segments = extractSpeakerSegments(opts.transcript)
  for (const seg of segments) {
    const speakerId = upsertSpeaker(meetingId, seg.speaker)
    db.prepare(
      `INSERT INTO memory_segments (id, meeting_id, speaker_id, start_ms, end_ms, text)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(uuid(), meetingId, speakerId, seg.startMs, seg.endMs, seg.text)
  }

  const openThreads = db
    .prepare(`SELECT id, fingerprint, status FROM memory_threads WHERE user_id = ?`)
    .all(opts.userId) as Array<{ id: string; fingerprint: string; status: string }>

  const threadIds: string[] = []

  for (const decision of extractDecisionCandidates(opts.transcript)) {
    const fp = fingerprintDecision(decision)
    const merged = mergeThreadFingerprints(openThreads, fp)
    if (merged) {
      linkThread(merged, meetingId, 'Recurring decision linked')
      db.prepare(`UPDATE memory_threads SET updated_at = ? WHERE id = ?`).run(now, merged)
      threadIds.push(merged)
      continue
    }
    const threadId = uuid()
    db.prepare(
      `INSERT INTO memory_threads (id, user_id, kind, title, status, fingerprint, created_at, updated_at)
       VALUES (?, ?, 'decision', ?, 'open', ?, ?, ?)`,
    ).run(threadId, opts.userId, decision, fp, now, now)
    linkThread(threadId, meetingId)
    openThreads.push({ id: threadId, fingerprint: fp, status: 'open' })
    threadIds.push(threadId)
  }

  let actionCount = 0
  for (const action of extractActionCandidates(opts.transcript)) {
    const fp = fingerprintDecision(`action|${action.text}`)
    let threadId = mergeThreadFingerprints(openThreads, fp)
    if (!threadId) {
      threadId = uuid()
      db.prepare(
        `INSERT INTO memory_threads (id, user_id, kind, title, status, fingerprint, created_at, updated_at)
         VALUES (?, ?, 'action', ?, 'open', ?, ?, ?)`,
      ).run(threadId, opts.userId, action.text, fp, now, now)
      openThreads.push({ id: threadId, fingerprint: fp, status: 'open' })
    }
    linkThread(threadId, meetingId)
    db.prepare(
      `INSERT INTO memory_actions (id, thread_id, owner_label, due_hint, status, text, created_at)
       VALUES (?, ?, ?, ?, 'open', ?, ?)`,
    ).run(uuid(), threadId, action.ownerLabel, action.dueHint, action.text, now)
    threadIds.push(threadId)
    actionCount += 1
  }

  return { meetingId, threadIds: [...new Set(threadIds)], actionCount }
}

export function ensureDemoMemory(userId: string) {
  const count = db
    .prepare('SELECT COUNT(*) as c FROM memory_meetings WHERE user_id = ?')
    .get(userId) as { c: number }
  if (count.c > 0) return

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const yesterday = new Date(Date.now() - 86400000).toISOString()

  ingestMeetingMemory({
    userId,
    title: 'Sprint planning — Voice pipeline',
    sourceProvider: 'zoom',
    meetingAt: weekAgo,
    transcript: [
      'Alex: We need clearer stage feedback during transcription.',
      'Sam: Agreed — users lose trust when the bar stalls.',
      'Decision: Ship stage progress toasts this sprint.',
      'Alex will draft the toast copy by Friday.',
      'Action: Sam review integrations OAuth checklist (Sam)',
      'Decision: Keep Studio Amber as the default accent.',
    ].join('\n'),
  })

  ingestMeetingMemory({
    userId,
    title: 'Integrations sync review',
    sourceProvider: 'google_meet',
    meetingAt: yesterday,
    transcript: [
      'Sam: Zoom import is in demo mode until keys land.',
      'Jordan: Customers still want action continuity across meetings.',
      'Decision: Ship stage progress toasts this sprint.',
      'Jordan will prototype the Memory view by next week.',
      'Action: Alex wire meeting ingest on import (Alex)',
      'Decision: Keep Studio Amber as the default accent.',
    ].join('\n'),
  })
}

export function listThreads(userId: string) {
  ensureDemoMemory(userId)
  const threads = db
    .prepare(
      `SELECT t.id, t.kind, t.title, t.status, t.fingerprint, t.created_at, t.updated_at,
        (SELECT COUNT(*) FROM memory_thread_links l WHERE l.thread_id = t.id) as meeting_count,
        (SELECT COUNT(*) FROM memory_actions a WHERE a.thread_id = t.id AND a.status = 'open') as open_actions
       FROM memory_threads t
       WHERE t.user_id = ?
       ORDER BY t.updated_at DESC`,
    )
    .all(userId) as Array<{
    id: string
    kind: string
    title: string
    status: string
    fingerprint: string
    created_at: string
    updated_at: string
    meeting_count: number
    open_actions: number
  }>

  return threads.map((t) => ({
    id: t.id,
    kind: t.kind,
    title: t.title,
    status: t.status,
    fingerprint: t.fingerprint,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    meetingCount: t.meeting_count,
    openActions: t.open_actions,
    recurring: t.meeting_count > 1,
  }))
}

export function getThreadDetail(userId: string, threadId: string) {
  const thread = db
    .prepare(`SELECT * FROM memory_threads WHERE id = ? AND user_id = ?`)
    .get(threadId, userId) as
    | {
        id: string
        kind: string
        title: string
        status: string
        fingerprint: string
        created_at: string
        updated_at: string
      }
    | undefined
  if (!thread) return null

  const meetings = db
    .prepare(
      `SELECT m.id, m.title, m.source_provider, m.meeting_at, l.note
       FROM memory_thread_links l
       INNER JOIN memory_meetings m ON m.id = l.meeting_id
       WHERE l.thread_id = ?
       ORDER BY m.meeting_at DESC`,
    )
    .all(threadId) as Array<{
    id: string
    title: string
    source_provider: string | null
    meeting_at: string
    note: string | null
  }>

  const actions = db
    .prepare(
      `SELECT id, owner_label, due_hint, status, text, created_at FROM memory_actions WHERE thread_id = ? ORDER BY created_at`,
    )
    .all(threadId) as Array<{
    id: string
    owner_label: string | null
    due_hint: string | null
    status: string
    text: string
    created_at: string
  }>

  const speakers = meetings.flatMap((m) =>
    (
      db
        .prepare(`SELECT label, display_name FROM memory_speakers WHERE meeting_id = ?`)
        .all(m.id) as Array<{ label: string; display_name: string }>
    ).map((s) => ({ meetingId: m.id, ...s })),
  )

  return {
    id: thread.id,
    kind: thread.kind,
    title: thread.title,
    status: thread.status,
    fingerprint: thread.fingerprint,
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
    recurring: meetings.length > 1,
    meetings: meetings.map((m) => ({
      id: m.id,
      title: m.title,
      sourceProvider: m.source_provider,
      meetingAt: m.meeting_at,
      note: m.note,
    })),
    actions: actions.map((a) => ({
      id: a.id,
      ownerLabel: a.owner_label,
      dueHint: a.due_hint,
      status: a.status,
      text: a.text,
      createdAt: a.created_at,
    })),
    speakers,
  }
}

export function setThreadStatus(userId: string, threadId: string, status: 'open' | 'closed') {
  const result = db
    .prepare(`UPDATE memory_threads SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
    .run(status, new Date().toISOString(), threadId, userId)
  return result.changes > 0
}

export function listMeetings(userId: string) {
  ensureDemoMemory(userId)
  return (
    db
      .prepare(
        `SELECT id, title, source_provider, meeting_at, document_id,
          (SELECT COUNT(*) FROM memory_speakers s WHERE s.meeting_id = memory_meetings.id) as speaker_count
         FROM memory_meetings WHERE user_id = ? ORDER BY meeting_at DESC`,
      )
      .all(userId) as Array<{
      id: string
      title: string
      source_provider: string | null
      meeting_at: string
      document_id: string | null
      speaker_count: number
    }>
  ).map((m) => ({
    id: m.id,
    title: m.title,
    sourceProvider: m.source_provider,
    meetingAt: m.meeting_at,
    documentId: m.document_id,
    speakerCount: m.speaker_count,
  }))
}
