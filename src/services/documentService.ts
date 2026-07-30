import { env } from '../config/env'
import { delay } from '../lib/mockAi'
import { apiFetch } from '../lib/apiClient'
import type { DocItem } from '../lib/types'

export interface DocumentService {
  list: () => Promise<DocItem[]>
  get: (id: string) => Promise<DocItem | null>
  create: (doc: Omit<DocItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DocItem>
  update: (id: string, patch: Partial<DocItem>) => Promise<DocItem>
  remove: (id: string) => Promise<void>
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const httpDocuments: DocumentService = {
  async list() {
    return apiFetch<DocItem[]>('/documents', {}, base())
  },
  async get(id) {
    try {
      return await apiFetch<DocItem>(`/documents/${id}`, {}, base())
    } catch {
      return null
    }
  },
  async create(doc) {
    return apiFetch<DocItem>('/documents', { method: 'POST', body: JSON.stringify(doc) }, base())
  },
  async update(id, patch) {
    return apiFetch<DocItem>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, base())
  },
  async remove(id) {
    await apiFetch<void>(`/documents/${id}`, { method: 'DELETE' }, base())
  },
}

const mockDocuments: DocumentService = {
  async list() {
    await delay(100)
    return []
  },
  async get() {
    await delay(100)
    return null
  },
  async create(doc) {
    await delay(150)
    const now = new Date().toISOString()
    return { ...doc, id: `remote-${Date.now()}`, createdAt: now, updatedAt: now }
  },
  async update(id, patch) {
    await delay(150)
    return { ...(patch as DocItem), id, updatedAt: new Date().toISOString() }
  },
  async remove() {
    await delay(100)
  },
}

export const documentService: DocumentService = env.useMockApi ? mockDocuments : httpDocuments
