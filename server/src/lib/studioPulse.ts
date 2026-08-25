import { db } from '../db.js'
import { writeAudit } from './compliance.js'
import { ensureDemoMemory } from './memory.js'
import { buildPulseBrief, type PulseBrief, type PulseItem } from './studioPulseGraph.js'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function weekAgoIso(now = Date.now()): string {
  return new Date(now - WEEK_MS).toISOString()
}

export function gatherPulseBrief(userId: string): PulseBrief {
  ensureDemoMemory(userId)
  const since = weekAgoIso()

  const docs = db
    .prepare(
      `SELECT id, title, updated_at FROM documents
       WHERE user_id = ? AND updated_at >= ?
       ORDER BY updated_at DESC LIMIT 10`,
    )
    .all(userId, since) as Array<{ id: string; title: string; updated_at: string }>

  const actions = db
    .prepare(
      `SELECT a.id, a.text, a.created_at, t.title AS thread_title, t.id AS thread_id
       FROM memory_actions a
       INNER JOIN memory_threads t ON t.id = a.thread_id
       WHERE t.user_id = ? AND a.status = 'open' AND t.status = 'open'
       ORDER BY a.created_at DESC LIMIT 10`,
    )
    .all(userId) as Array<{
    id: string
    text: string
    created_at: string
    thread_title: string
    thread_id: string
  }>

  const lowEcho = db
    .prepare(
      `SELECT e.document_id, e.score, e.updated_at, d.title
       FROM echo_scores e
       INNER JOIN documents d ON d.id = e.document_id
       WHERE e.user_id = ? AND e.score < 70
       ORDER BY e.score ASC LIMIT 5`,
    )
    .all(userId) as Array<{
    document_id: string
    score: number
    updated_at: string
    title: string
  }>

  const openThreads = db
    .prepare(`SELECT COUNT(*) AS c FROM memory_threads WHERE user_id = ? AND status = 'open'`)
    .get(userId) as { c: number }

  const openActionsTotal = db
    .prepare(
      `SELECT COUNT(*) AS c FROM memory_actions a
       INNER JOIN memory_threads t ON t.id = a.thread_id
       WHERE t.user_id = ? AND a.status = 'open' AND t.status = 'open'`,
    )
    .get(userId) as { c: number }

  const voiceCommands = db
    .prepare(
      `SELECT COUNT(*) AS c FROM audit_log
       WHERE user_id = ? AND action = 'ui.voice_command' AND created_at >= ?`,
    )
    .get(userId, since) as { c: number }

  const items: PulseItem[] = []

  for (const action of actions) {
    items.push({
      id: `action-${action.id}`,
      kind: 'action',
      title: action.text,
      detail: action.thread_title,
      href: `/app/memory?thread=${action.thread_id}`,
      priority: 90,
      at: action.created_at,
    })
  }

  for (const echo of lowEcho) {
    items.push({
      id: `echo-${echo.document_id}`,
      kind: 'echo',
      title: echo.title,
      detail: `Echo Score ${echo.score}`,
      href: `/app/editor/${echo.document_id}`,
      score: echo.score,
      priority: 80,
      at: echo.updated_at,
    })
  }

  const threads = db
    .prepare(
      `SELECT id, title, updated_at,
        (SELECT COUNT(*) FROM memory_actions a WHERE a.thread_id = t.id AND a.status = 'open') AS open_actions
       FROM memory_threads t
       WHERE t.user_id = ? AND t.status = 'open'
       ORDER BY t.updated_at DESC LIMIT 5`,
    )
    .all(userId) as Array<{ id: string; title: string; updated_at: string; open_actions: number }>

  for (const thread of threads) {
    if (thread.open_actions > 0) continue
    items.push({
      id: `thread-${thread.id}`,
      kind: 'thread',
      title: thread.title,
      href: `/app/memory?thread=${thread.id}`,
      priority: 70,
      at: thread.updated_at,
    })
  }

  for (const doc of docs.slice(0, 5)) {
    items.push({
      id: `doc-${doc.id}`,
      kind: 'doc',
      title: doc.title,
      href: `/app/editor/${doc.id}`,
      priority: 40,
      at: doc.updated_at,
    })
  }

  if (voiceCommands.c > 0) {
    items.push({
      id: 'voice-week',
      kind: 'voice',
      title: `${voiceCommands.c} voice command${voiceCommands.c === 1 ? '' : 's'} this week`,
      href: '/app/compliance',
      priority: 20,
      at: new Date().toISOString(),
    })
  }

  return buildPulseBrief(items, {
    docsUpdatedWeek: docs.length,
    openThreads: openThreads.c,
    openActions: openActionsTotal.c,
    lowEchoCount: lowEcho.length,
    voiceCommandsWeek: voiceCommands.c,
  })
}

export function getStudioPulse(userId: string): PulseBrief {
  return gatherPulseBrief(userId)
}

export function refreshStudioPulse(userId: string): PulseBrief {
  const brief = gatherPulseBrief(userId)
  writeAudit(userId, 'pulse.refresh', {
    meta: {
      openActions: brief.stats.openActions,
      lowEchoCount: brief.stats.lowEchoCount,
    },
  })
  return brief
}
