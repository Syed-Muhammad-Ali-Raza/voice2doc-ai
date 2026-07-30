import { env } from '../config/env'
import { apiFetch } from '../lib/apiClient'
import type { DocItem } from '../lib/types'

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface Workspace {
  id: string
  name: string
  ownerId: string
  createdAt: string
  role?: WorkspaceRole
  memberCount?: number
}

export interface WorkspaceMember {
  userId: string
  role: WorkspaceRole
  name: string
  email: string
  joinedAt: string
}

export interface WorkspaceAdmin {
  workspaceId: string
  memberCount: number
  documentCount: number
  ownerPlan: string | null
  recentDocuments: Array<{ title: string; updatedAt: string }>
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

export const workspaceService = {
  list: () => apiFetch<Workspace[]>('/workspaces', {}, base()),
  create: (name: string) =>
    apiFetch<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }, base()),
  get: (id: string) => apiFetch<Workspace>(`/workspaces/${id}`, {}, base()),
  rename: (id: string, name: string) =>
    apiFetch<Workspace>(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }, base()),
  remove: (id: string) => apiFetch<void>(`/workspaces/${id}`, { method: 'DELETE' }, base()),
  members: (id: string) => apiFetch<WorkspaceMember[]>(`/workspaces/${id}/members`, {}, base()),
  addMember: (id: string, email: string, role: 'admin' | 'member' = 'member') =>
    apiFetch<WorkspaceMember>(
      `/workspaces/${id}/members`,
      { method: 'POST', body: JSON.stringify({ email, role }) },
      base(),
    ),
  updateMember: (id: string, userId: string, role: 'admin' | 'member') =>
    apiFetch<{ userId: string; role: string }>(
      `/workspaces/${id}/members/${userId}`,
      { method: 'PATCH', body: JSON.stringify({ role }) },
      base(),
    ),
  removeMember: (id: string, userId: string) =>
    apiFetch<void>(`/workspaces/${id}/members/${userId}`, { method: 'DELETE' }, base()),
  documents: (id: string) => apiFetch<DocItem[]>(`/workspaces/${id}/documents`, {}, base()),
  admin: (id: string) => apiFetch<WorkspaceAdmin>(`/workspaces/${id}/admin`, {}, base()),
  shareDocument: (docId: string, workspaceId: string | null) =>
    apiFetch<DocItem>(
      `/documents/${docId}/share`,
      { method: 'POST', body: JSON.stringify({ workspaceId }) },
      base(),
    ),
}
