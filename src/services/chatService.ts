import { env } from '../config/env'
import { apiFetch } from '../lib/apiClient'

export type ChatMode = 'help' | 'document' | 'meeting'

export interface ChatSession {
  id: string
  mode: ChatMode
  title: string
  documentId: string | null
  memoryThreadId: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const demoSession: ChatSession = {
  id: 'chat-demo',
  mode: 'help',
  title: 'Studio assistant',
  documentId: null,
  memoryThreadId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const demoMessages: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    content:
      'Hi! I can help with product walkthroughs, document rewrites, and meeting-memory summaries.',
    createdAt: new Date().toISOString(),
  },
]

export const chatService = {
  async listSessions() {
    if (env.useMockApi) return { sessions: [demoSession] }
    return apiFetch<{ sessions: ChatSession[] }>('/chat/sessions', {}, base())
  },

  async createSession(payload: {
    mode: ChatMode
    title?: string
    documentId?: string
    memoryThreadId?: string
  }) {
    if (env.useMockApi) return { ...demoSession, ...payload, id: `chat-${Date.now()}` }
    return apiFetch<ChatSession>('/chat/sessions', { method: 'POST', body: JSON.stringify(payload) }, base())
  },

  async listMessages(sessionId: string) {
    if (env.useMockApi) return { messages: demoMessages }
    return apiFetch<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`, {}, base())
  },

  async sendMessage(sessionId: string, content: string) {
    if (env.useMockApi) {
      const user: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() }
      const assistant: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content:
          'Demo response: try asking me to summarize this document, explain Memory, or suggest a next action.',
        createdAt: new Date().toISOString(),
      }
      demoMessages.push(user, assistant)
      return { userMessage: user, assistantMessage: assistant, persisted: true }
    }
    return apiFetch<{
      userMessage: ChatMessage
      assistantMessage: ChatMessage
      persisted: boolean
    }>(
      `/chat/sessions/${sessionId}/messages`,
      { method: 'POST', body: JSON.stringify({ content }) },
      base(),
    )
  },
}

