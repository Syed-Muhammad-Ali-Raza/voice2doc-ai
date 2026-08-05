import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { canAccessDocument } from './teams.js'
import { getThreadDetail } from './memory.js'
import { writeAudit } from './compliance.js'

export type ChatMode = 'help' | 'document' | 'meeting'

export interface ChatSessionRow {
  id: string
  mode: ChatMode
  title: string
  documentId: string | null
  memoryThreadId: string | null
  createdAt: string
  updatedAt: string
}

export function migrateChatTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      title TEXT NOT NULL,
      document_id TEXT,
      memory_thread_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
  `)
}

function shouldPersistChat(userId: string): boolean {
  const row = db
    .prepare(`SELECT preferences_json FROM users WHERE id = ?`)
    .get(userId) as { preferences_json: string | null } | undefined
  if (!row?.preferences_json) return true
  try {
    const parsed = JSON.parse(row.preferences_json) as { privacyAnalytics?: boolean }
    if (parsed.privacyAnalytics === false) return false
  } catch {
    return true
  }
  return true
}

function rowToSession(row: {
  id: string
  mode: string
  title: string
  document_id: string | null
  memory_thread_id: string | null
  created_at: string
  updated_at: string
}): ChatSessionRow {
  return {
    id: row.id,
    mode: row.mode as ChatMode,
    title: row.title,
    documentId: row.document_id,
    memoryThreadId: row.memory_thread_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listChatSessions(userId: string) {
  const rows = db
    .prepare(
      `SELECT id, mode, title, document_id, memory_thread_id, created_at, updated_at
       FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC`,
    )
    .all(userId) as Array<{
    id: string
    mode: string
    title: string
    document_id: string | null
    memory_thread_id: string | null
    created_at: string
    updated_at: string
  }>
  return rows.map(rowToSession)
}

export function createChatSession(
  userId: string,
  input: { mode: ChatMode; title?: string; documentId?: string; memoryThreadId?: string },
) {
  const now = new Date().toISOString()
  const id = uuid()
  const title =
    input.title?.trim() ||
    (input.mode === 'document'
      ? 'Document copilot'
      : input.mode === 'meeting'
        ? 'Meeting copilot'
        : 'Help copilot')

  if (input.documentId) {
    const doc = db
      .prepare(`SELECT id, user_id, workspace_id FROM documents WHERE id = ?`)
      .get(input.documentId) as { id: string; user_id: string; workspace_id: string | null } | undefined
    if (!doc || !canAccessDocument(doc, userId)) return null
  }

  db.prepare(
    `INSERT INTO chat_sessions (id, user_id, mode, title, document_id, memory_thread_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.mode,
    title,
    input.documentId ?? null,
    input.memoryThreadId ?? null,
    now,
    now,
  )
  writeAudit(userId, 'chat.session_created', { resourceType: 'chat_session', resourceId: id })
  return getChatSession(userId, id)
}

export function getChatSession(userId: string, sessionId: string) {
  const row = db
    .prepare(
      `SELECT id, mode, title, document_id, memory_thread_id, created_at, updated_at
       FROM chat_sessions WHERE id = ? AND user_id = ?`,
    )
    .get(sessionId, userId) as
    | {
        id: string
        mode: string
        title: string
        document_id: string | null
        memory_thread_id: string | null
        created_at: string
        updated_at: string
      }
    | undefined
  return row ? rowToSession(row) : null
}

export function listChatMessages(userId: string, sessionId: string) {
  if (!getChatSession(userId, sessionId)) return null
  const rows = db
    .prepare(
      `SELECT id, role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
    )
    .all(sessionId) as Array<{ id: string; role: string; content: string; created_at: string }>
  return rows.map((r) => ({
    id: r.id,
    role: r.role as 'user' | 'assistant' | 'system',
    content: r.content,
    createdAt: r.created_at,
  }))
}

function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  at = new Date().toISOString(),
) {
  const id = uuid()
  db.prepare(
    `INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, sessionId, role, content, at)
  db.prepare(`UPDATE chat_sessions SET updated_at = ? WHERE id = ?`).run(at, sessionId)
  return { id, role, content, createdAt: at }
}

async function generateAssistantReply(
  userId: string,
  session: ChatSessionRow | null,
  prompt: string,
): Promise<string> {
  if (!session) return 'Session not found.'
  const mode = session.mode

  const docs = db
    .prepare(`SELECT title, content, updated_at FROM documents WHERE user_id = ? ORDER BY updated_at DESC LIMIT 4`)
    .all(userId) as Array<{ title: string; content: string; updated_at: string }>
  const recentDoc = docs[0]

  const memoryThreads = db
    .prepare(`SELECT title, status FROM memory_threads WHERE user_id = ? ORDER BY updated_at DESC LIMIT 4`)
    .all(userId) as Array<{ title: string; status: string }>

  let modeContext = ''
  if (mode === 'document' && session.documentId) {
    const doc = db
      .prepare(`SELECT title, content FROM documents WHERE id = ?`)
      .get(session.documentId) as { title: string; content: string } | undefined
    if (doc) {
      modeContext = `Focused document: ${doc.title}\nSnippet: ${stripHtml(doc.content).slice(0, 800)}`
    }
  }
  if (mode === 'meeting' && session.memoryThreadId) {
    const thread = getThreadDetail(userId, session.memoryThreadId)
    if (thread) {
      modeContext = `Meeting thread: ${thread.title}\nActions: ${thread.actions
        .map((a) => `${a.ownerLabel || 'Unassigned'} -> ${a.text}`)
        .join('; ')
        .slice(0, 900)}`
    }
  }

  const fallback = buildFallbackReply({
    mode,
    prompt,
    recentDocTitle: recentDoc?.title,
    memoryThreadTitles: memoryThreads.map((m) => m.title),
  })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return fallback

  try {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are the Voice2Doc Studio AI Chatbot. Keep responses concise, practical, and action-oriented. Offer explicit next actions in the product.',
        },
        {
          role: 'system',
          content: `Mode: ${mode}\n${modeContext}\nRecent docs: ${docs
            .map((d) => d.title)
            .join(', ')}\nRecent memory threads: ${memoryThreads.map((m) => m.title).join(', ')}`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
    })
    return completion.choices[0]?.message?.content?.trim() || fallback
  } catch {
    return fallback
  }
}

function buildFallbackReply(input: {
  mode: ChatMode
  prompt: string
  recentDocTitle?: string
  memoryThreadTitles: string[]
}) {
  const p = input.prompt.toLowerCase()
  if (input.mode === 'help') {
    if (p.includes('export')) return 'Use Export in the editor (TXT/MD/PDF/DOCX) or Send to Notion/Google Docs from the same menu.'
    if (p.includes('memory')) return 'Open Memory in the sidebar to review recurring decisions and action threads across meetings.'
    if (p.includes('billing') || p.includes('plan')) return 'Open Billing to compare Free, Pro, Business, and Enterprise plans and switch your plan.'
  }
  if (input.mode === 'document') {
    return `I can help rewrite your draft${input.recentDocTitle ? ` (${input.recentDocTitle})` : ''}. Ask: "shorten this", "make it executive", or "extract action items".`
  }
  if (input.mode === 'meeting') {
    const hints =
      input.memoryThreadTitles.length > 0
        ? `Recent threads: ${input.memoryThreadTitles.slice(0, 3).join(', ')}.`
        : 'No threads yet — import a meeting first.'
    return `For meeting mode, I can summarize decisions and owners from Memory. ${hints}`
  }
  return 'I can help with product guidance, document rewrite prompts, and meeting action summaries.'
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function addChatMessage(userId: string, sessionId: string, content: string) {
  const session = getChatSession(userId, sessionId)
  if (!session) return null

  const persist = shouldPersistChat(userId)
  const now = new Date().toISOString()
  const userMsg = persist
    ? saveMessage(sessionId, 'user', content, now)
    : { id: `tmp-u-${Date.now()}`, role: 'user' as const, content, createdAt: now }

  const reply = await generateAssistantReply(userId, session, content)
  const assistantMsg = persist
    ? saveMessage(sessionId, 'assistant', reply)
    : { id: `tmp-a-${Date.now()}`, role: 'assistant' as const, content: reply, createdAt: new Date().toISOString() }

  writeAudit(userId, 'chat.message_sent', {
    resourceType: 'chat_session',
    resourceId: sessionId,
    meta: { mode: session.mode, persisted: persist },
  })

  return {
    session,
    persisted: persist,
    userMessage: userMsg,
    assistantMessage: assistantMsg,
  }
}

