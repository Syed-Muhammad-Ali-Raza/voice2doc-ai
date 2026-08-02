import { env } from '../config/env'
import { apiFetch, getToken } from '../lib/apiClient'
import { formatVoiceTimestamp, parseVoiceTimestamp } from '../lib/collab'

export type PresenceMode = 'editing' | 'listening' | 'recording'

export interface CollabComment {
  id: string
  documentId: string
  userId: string
  authorName: string
  body: string
  timestampMs: number
  timestampLabel: string
  mirrored: boolean
  createdAt: string
  updatedAt: string
}

export interface PresencePeer {
  userId: string
  name: string
  email: string
  color: string
  mode: PresenceMode
  joinedAt: string
  lastSeenAt: string
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

function wsBase() {
  const api = env.apiBaseUrl || 'http://localhost:3001/api'
  const root = api.replace(/\/api\/?$/, '')
  return root.replace(/^http/, 'ws')
}

const demoComments: CollabComment[] = [
  {
    id: 'c-demo-1',
    documentId: 'demo',
    userId: 'u1',
    authorName: 'Alex',
    body: 'Clarify the action owner here.',
    timestampMs: 95000,
    timestampLabel: '1:35',
    mirrored: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const collabService = {
  list: async (documentId: string) => {
    if (env.useMockApi) {
      return {
        comments: demoComments.map((c) => ({ ...c, documentId })),
        presence: [
          {
            userId: 'u1',
            name: 'Alex',
            email: 'alex@voice2doc.ai',
            color: '#c47b2d',
            mode: 'editing' as const,
            joinedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
          },
        ],
      }
    }
    return apiFetch<{ comments: CollabComment[]; presence: PresencePeer[] }>(
      `/documents/${documentId}/comments`,
      {},
      base(),
    )
  },

  create: async (
    documentId: string,
    payload: { body: string; timestampMs: number; mirror?: boolean },
  ) => {
    if (env.useMockApi) {
      const comment: CollabComment = {
        id: `c-${Date.now()}`,
        documentId,
        userId: 'local',
        authorName: 'You',
        body: payload.body,
        timestampMs: payload.timestampMs,
        timestampLabel: formatVoiceTimestamp(payload.timestampMs),
        mirrored: payload.mirror !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      demoComments.push(comment)
      return comment
    }
    return apiFetch<CollabComment>(
      `/documents/${documentId}/comments`,
      { method: 'POST', body: JSON.stringify(payload) },
      base(),
    )
  },

  remove: async (documentId: string, commentId: string) => {
    if (env.useMockApi) {
      const i = demoComments.findIndex((c) => c.id === commentId)
      if (i >= 0) demoComments.splice(i, 1)
      return
    }
    await apiFetch<void>(`/documents/${documentId}/comments/${commentId}`, { method: 'DELETE' }, base())
  },

  heartbeat: async (documentId: string, mode?: PresenceMode) => {
    if (env.useMockApi) return { presence: [] as PresencePeer[] }
    return apiFetch<{ presence: PresencePeer[] }>(
      `/documents/${documentId}/comments/presence`,
      { method: 'POST', body: JSON.stringify({ mode }) },
      base(),
    )
  },

  connectSocket: (
    documentId: string,
    handlers: {
      onPresence?: (peers: PresencePeer[]) => void
      onCommentCreated?: (comment: CollabComment) => void
      onCommentDeleted?: (commentId: string) => void
      onClose?: () => void
    },
  ) => {
    if (env.useMockApi || typeof WebSocket === 'undefined') {
      return { close: () => undefined, sendMode: (_mode: PresenceMode) => undefined }
    }
    const token = getToken()
    if (!token) {
      return { close: () => undefined, sendMode: (_mode: PresenceMode) => undefined }
    }

    const url = `${wsBase()}/ws/collab?documentId=${encodeURIComponent(documentId)}&token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as {
          type?: string
          presence?: PresencePeer[]
          comment?: CollabComment
          commentId?: string
        }
        if (msg.type === 'presence' || msg.type === 'hello') handlers.onPresence?.(msg.presence || [])
        if (msg.type === 'comment:created' && msg.comment) handlers.onCommentCreated?.(msg.comment)
        if (msg.type === 'comment:deleted' && msg.commentId) handlers.onCommentDeleted?.(msg.commentId)
      } catch {
        /* ignore */
      }
    }
    ws.onclose = () => handlers.onClose?.()

    const ping = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
    }, 15000)

    return {
      close: () => {
        window.clearInterval(ping)
        ws.close()
      },
      sendMode: (mode: PresenceMode) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'presence', mode }))
      },
    }
  },

  parseTimestampInput: (value: string) => parseVoiceTimestamp(value),
}
