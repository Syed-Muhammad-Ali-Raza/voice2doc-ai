import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import {
  leavePresence,
  listPresence,
  touchPresence,
  userCanAccessDocument,
  type PresenceMode,
} from '../lib/collab.js'
import { db } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'voice2doc-dev-secret-change-me'

type Client = {
  ws: WebSocket
  userId: string
  documentId: string
  name: string
  email: string
}

const clients = new Set<Client>()

function authorName(userId: string, email: string): string {
  const row = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined
  return row?.name || email.split('@')[0] || 'Teammate'
}

export function broadcastCollab(documentId: string, payload: unknown) {
  const raw = JSON.stringify(payload)
  for (const c of clients) {
    if (c.documentId === documentId && c.ws.readyState === c.ws.OPEN) {
      c.ws.send(raw)
    }
  }
}

export function attachCollabWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws/collab' })

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url || '', 'http://localhost')
      const token = url.searchParams.get('token') || ''
      const documentId = url.searchParams.get('documentId') || ''
      if (!token || !documentId) {
        ws.close(1008, 'token and documentId required')
        return
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string }
      if (!userCanAccessDocument(documentId, decoded.sub)) {
        ws.close(1008, 'forbidden')
        return
      }

      const client: Client = {
        ws,
        userId: decoded.sub,
        documentId,
        name: authorName(decoded.sub, decoded.email),
        email: decoded.email,
      }
      clients.add(client)

      const presence = touchPresence(documentId, {
        userId: client.userId,
        name: client.name,
        email: client.email,
        mode: 'editing',
      })
      broadcastCollab(documentId, { type: 'presence', presence })
      ws.send(JSON.stringify({ type: 'hello', presence: listPresence(documentId) }))

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(String(data)) as { type?: string; mode?: PresenceMode }
          if (msg.type === 'presence' || msg.type === 'ping') {
            const next = touchPresence(documentId, {
              userId: client.userId,
              name: client.name,
              email: client.email,
              mode: msg.mode,
            })
            broadcastCollab(documentId, { type: 'presence', presence: next })
          }
          if (msg.type === 'listen') {
            const next = touchPresence(documentId, {
              userId: client.userId,
              name: client.name,
              email: client.email,
              mode: 'listening',
            })
            broadcastCollab(documentId, { type: 'presence', presence: next })
          }
        } catch {
          /* ignore bad frames */
        }
      })

      ws.on('close', () => {
        clients.delete(client)
        const next = leavePresence(documentId, client.userId)
        broadcastCollab(documentId, { type: 'presence', presence: next })
      })
    } catch {
      ws.close(1008, 'unauthorized')
    }
  })

  return wss
}
