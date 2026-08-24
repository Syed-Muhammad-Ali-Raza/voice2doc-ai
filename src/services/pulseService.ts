import { env } from '../config/env'
import { apiFetch } from '../lib/apiClient'
import { buildPulseBrief, type PulseBrief, type PulseItem } from '../lib/studioPulse'

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const MOCK_ITEMS: PulseItem[] = [
  {
    id: 'action-1',
    kind: 'action',
    title: 'Alex will send the client recap tonight',
    detail: 'Q3 roadmap follow-up',
    href: '/app/memory',
    priority: 90,
    at: new Date().toISOString(),
  },
  {
    id: 'echo-1',
    kind: 'echo',
    title: 'Harbor launch summary',
    detail: 'Echo Score 58',
    href: '/app/documents',
    score: 58,
    priority: 80,
    at: new Date().toISOString(),
  },
]

function mockBrief(): PulseBrief {
  return buildPulseBrief(MOCK_ITEMS, {
    docsUpdatedWeek: 3,
    openThreads: 2,
    openActions: 1,
    lowEchoCount: 1,
    voiceCommandsWeek: 4,
  })
}

export const pulseService = {
  async get(): Promise<PulseBrief> {
    if (env.useMockApi) return mockBrief()
    return apiFetch<PulseBrief>('/pulse', {}, base())
  },

  async refresh(): Promise<PulseBrief> {
    if (env.useMockApi) return mockBrief()
    return apiFetch<PulseBrief>('/pulse/refresh', { method: 'POST' }, base())
  },
}

export type { PulseBrief, PulseItem }
