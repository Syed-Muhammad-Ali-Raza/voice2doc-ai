import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import {
  addChatMessage,
  createChatSession,
  getChatSession,
  listChatMessages,
  listChatSessions,
  type ChatMode,
} from '../lib/chat.js'

export const chatRouter = Router()

chatRouter.get('/sessions', requireAuth, (req: AuthedRequest, res) => {
  res.json({ sessions: listChatSessions(req.user!.sub) })
})

chatRouter.post('/sessions', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      mode: z.enum(['help', 'document', 'meeting']),
      title: z.string().min(1).max(120).optional(),
      documentId: z.string().optional(),
      memoryThreadId: z.string().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid chat session payload' })
    return
  }

  const session = createChatSession(req.user!.sub, {
    mode: parsed.data.mode as ChatMode,
    title: parsed.data.title,
    documentId: parsed.data.documentId,
    memoryThreadId: parsed.data.memoryThreadId,
  })
  if (!session) {
    res.status(404).json({ error: 'Referenced document was not found' })
    return
  }
  res.status(201).json(session)
})

chatRouter.get('/sessions/:id/messages', requireAuth, (req: AuthedRequest, res) => {
  const messages = listChatMessages(req.user!.sub, req.params.id as string)
  if (!messages) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  res.json({ messages })
})

chatRouter.post('/sessions/:id/messages', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ content: z.string().min(1).max(6000) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid message payload' })
    return
  }

  const session = getChatSession(req.user!.sub, req.params.id as string)
  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  const asStream =
    String(req.query.stream || '') === '1' ||
    req.headers.accept?.includes('text/event-stream') === true
  const result = await addChatMessage(req.user!.sub, session.id, parsed.data.content)
  if (!result) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  if (!asStream) {
    res.json(result)
    return
  }

  // Lightweight SSE stream for chat typing effect.
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const chunks = chunkText(result.assistantMessage.content, 120)
  for (const chunk of chunks) {
    res.write(`event: delta\n`)
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    await delay(35)
  }
  res.write(`event: done\n`)
  res.write(`data: ${JSON.stringify(result)}\n\n`)
  res.end()
})

function chunkText(text: string, size: number): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size))
  return out.length ? out : ['']
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

