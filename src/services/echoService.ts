import { env } from '../config/env'
import { apiFetch } from '../lib/apiClient'
import { computeEchoScore, type EchoScoreResult } from '../lib/echoScore'

export interface EchoScoreRecord extends EchoScoreResult {
  id: string
  documentId: string
  jobId: string | null
  transcriptExcerpt: string
  createdAt: string
  updatedAt: string
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const DEMO_TRANSCRIPT =
  'We decided to ship the Q3 roadmap by Friday. Alex will send the client recap tonight. Keep the budget under twelve thousand. Also mention the Harbor launch date in the summary.'

export const echoService = {
  async get(documentId: string): Promise<EchoScoreRecord | null> {
    if (env.useMockApi) {
      return {
        id: `echo-${documentId}`,
        documentId,
        jobId: null,
        transcriptExcerpt: DEMO_TRANSCRIPT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...computeEchoScore(DEMO_TRANSCRIPT, '<p>Q3 roadmap summary. Budget note included.</p>'),
      }
    }
    try {
      return await apiFetch<EchoScoreRecord>(`/echo/${documentId}`, {}, base())
    } catch {
      return null
    }
  },

  async recompute(documentId: string, content?: string): Promise<EchoScoreRecord> {
    if (env.useMockApi) {
      return {
        id: `echo-${documentId}`,
        documentId,
        jobId: null,
        transcriptExcerpt: DEMO_TRANSCRIPT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...computeEchoScore(DEMO_TRANSCRIPT, content || '<p></p>'),
      }
    }
    return apiFetch<EchoScoreRecord>(
      `/echo/${documentId}/recompute`,
      { method: 'POST', body: JSON.stringify({ content }) },
      base(),
    )
  },
}
