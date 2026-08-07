import { env } from '../config/env'
import { apiFetch } from '../lib/apiClient'
import {
  applyVoiceTwinLocally,
  buildVoiceTwinProfile,
  scoreVoiceMatch,
  type WritingMarkers,
} from '../lib/voiceTwin'

export interface VoiceTwin {
  id: string
  name: string
  version: number
  workspaceId: string | null
  voiceSummary: string
  doList: string[]
  dontList: string[]
  sampleOpening: string
  markers: WritingMarkers
  sourceDocIds: string[]
  createdAt: string
  updatedAt: string
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const demoSamples = [
  '<p>Recommendation: proceed with the staged rollout this week. Alex owns QA. Keep the update concise and board-ready.</p>',
  '<p>We decided to ship the Harbor launch notes by Friday. Avoid hedging language in the summary.</p>',
]

function demoTwin(overrides?: Partial<VoiceTwin>): VoiceTwin {
  const profile = buildVoiceTwinProfile(demoSamples, ['Ship Harbor launch'])
  return {
    id: 'twin-demo',
    name: 'My Voice Twin',
    version: 1,
    workspaceId: null,
    voiceSummary: profile.voiceSummary,
    doList: profile.doList,
    dontList: profile.dontList,
    sampleOpening: profile.sampleOpening,
    markers: profile.markers,
    sourceDocIds: ['doc-demo-1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

export const voiceTwinService = {
  async list(workspaceId?: string) {
    if (env.useMockApi) return { twins: [demoTwin()] }
    const q = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''
    return apiFetch<{ twins: VoiceTwin[] }>(`/voice-twins${q}`, {}, base())
  },

  async train(payload: {
    name?: string
    documentIds?: string[]
    includeMemory?: boolean
    workspaceId?: string | null
  }) {
    if (env.useMockApi) {
      return demoTwin({
        id: `twin-${Date.now()}`,
        name: payload.name || 'My Voice Twin',
        version: 2,
        sourceDocIds: payload.documentIds ?? [],
      })
    }
    return apiFetch<VoiceTwin>(
      '/voice-twins/train',
      { method: 'POST', body: JSON.stringify(payload) },
      base(),
    )
  },

  async apply(twinId: string, html: string) {
    if (env.useMockApi) {
      const twin = demoTwin({ id: twinId })
      const next = applyVoiceTwinLocally(html, {
        voiceSummary: twin.voiceSummary,
        doList: twin.doList,
        dontList: twin.dontList,
        sampleOpening: twin.sampleOpening,
        markers: twin.markers,
      })
      return { html: next, matchScore: scoreVoiceMatch(next, twin), twin }
    }
    return apiFetch<{ html: string; matchScore: number; twin: VoiceTwin }>(
      `/voice-twins/${twinId}/apply`,
      { method: 'POST', body: JSON.stringify({ html }) },
      base(),
    )
  },

  async remove(twinId: string) {
    if (env.useMockApi) return
    await apiFetch<void>(`/voice-twins/${twinId}`, { method: 'DELETE' }, base())
  },
}
