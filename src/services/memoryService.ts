import { env } from '../config/env'
import { apiFetch } from '../lib/apiClient'

export interface MemoryThreadSummary {
  id: string
  kind: string
  title: string
  status: string
  fingerprint: string
  createdAt: string
  updatedAt: string
  meetingCount: number
  openActions: number
  recurring: boolean
}

export interface MemoryMeetingSummary {
  id: string
  title: string
  sourceProvider: string | null
  meetingAt: string
  documentId: string | null
  speakerCount: number
}

export interface MemoryThreadDetail {
  id: string
  kind: string
  title: string
  status: string
  fingerprint: string
  createdAt: string
  updatedAt: string
  recurring: boolean
  meetings: Array<{
    id: string
    title: string
    sourceProvider: string | null
    meetingAt: string
    note: string | null
  }>
  actions: Array<{
    id: string
    ownerLabel: string | null
    dueHint: string | null
    status: string
    text: string
    createdAt: string
  }>
  speakers: Array<{ meetingId: string; label: string; display_name: string }>
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const demoThreads: MemoryThreadSummary[] = [
  {
    id: 'mem-demo-1',
    kind: 'decision',
    title: 'Ship stage progress toasts this sprint',
    status: 'open',
    fingerprint: 'ship stage progress toasts sprint',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    meetingCount: 2,
    openActions: 1,
    recurring: true,
  },
  {
    id: 'mem-demo-2',
    kind: 'action',
    title: 'Prototype the Memory view',
    status: 'open',
    fingerprint: 'action prototype memory view',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    meetingCount: 1,
    openActions: 1,
    recurring: false,
  },
]

export const memoryService = {
  listThreads: async () => {
    if (env.useMockApi) return { threads: demoThreads }
    return apiFetch<{ threads: MemoryThreadSummary[] }>('/memory/threads', {}, base())
  },
  listMeetings: async () => {
    if (env.useMockApi) {
      return {
        meetings: [
          {
            id: 'mtg-1',
            title: 'Sprint planning — Voice pipeline',
            sourceProvider: 'zoom',
            meetingAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            documentId: null,
            speakerCount: 2,
          },
        ] satisfies MemoryMeetingSummary[],
      }
    }
    return apiFetch<{ meetings: MemoryMeetingSummary[] }>('/memory/meetings', {}, base())
  },
  getThread: async (id: string) => {
    if (env.useMockApi) {
      return {
        ...demoThreads[0]!,
        id,
        meetings: [
          {
            id: 'mtg-1',
            title: 'Sprint planning',
            sourceProvider: 'zoom',
            meetingAt: new Date().toISOString(),
            note: 'Recurring decision linked',
          },
        ],
        actions: [
          {
            id: 'act-1',
            ownerLabel: 'Alex',
            dueHint: 'Friday',
            status: 'open',
            text: 'draft the toast copy',
            createdAt: new Date().toISOString(),
          },
        ],
        speakers: [{ meetingId: 'mtg-1', label: 'Alex', display_name: 'Alex' }],
      } satisfies MemoryThreadDetail
    }
    return apiFetch<MemoryThreadDetail>(`/memory/threads/${id}`, {}, base())
  },
  setStatus: async (id: string, status: 'open' | 'closed') => {
    if (env.useMockApi) return memoryService.getThread(id)
    return apiFetch<MemoryThreadDetail>(
      `/memory/threads/${id}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      base(),
    )
  },
}
