import { env } from '../config/env'
import { apiFetch } from '../lib/apiClient'

export type IntegrationProvider =
  | 'zoom'
  | 'google_meet'
  | 'microsoft_teams'
  | 'notion'
  | 'google_docs'

export interface IntegrationItem {
  id: IntegrationProvider
  name: string
  category: 'meeting' | 'docs'
  description: string
  actions: string[]
  connected: boolean
  oauthConfigured: boolean
  externalAccount: string | null
  connectedAt: string | null
  mode: 'oauth' | 'demo'
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

export const integrationService = {
  list: () => apiFetch<{ integrations: IntegrationItem[] }>('/integrations', {}, base()),
  connect: (provider: IntegrationProvider) =>
    apiFetch<{ url: string | null; mode: string; connected?: boolean }>(
      `/integrations/${provider}/connect`,
      { method: 'POST', body: '{}' },
      base(),
    ),
  disconnect: (provider: IntegrationProvider) =>
    apiFetch<{ connected: boolean }>(`/integrations/${provider}`, { method: 'DELETE' }, base()),
  exportDoc: (provider: 'notion' | 'google_docs', documentId: string) =>
    apiFetch<{
      ok: boolean
      provider: string
      mode: string
      externalUrl: string
      title: string
      message?: string
    }>(`/integrations/${provider}/export`, { method: 'POST', body: JSON.stringify({ documentId }) }, base()),
  importMeeting: (
    provider: 'zoom' | 'google_meet' | 'microsoft_teams',
    payload: { meetingUrl?: string; meetingId?: string; title?: string },
  ) =>
    apiFetch<{
      ok: boolean
      documentId: string
      title: string
      message?: string
    }>(`/integrations/${provider}/import-meeting`, { method: 'POST', body: JSON.stringify(payload) }, base()),
}
