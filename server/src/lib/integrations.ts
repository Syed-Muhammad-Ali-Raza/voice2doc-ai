import { db } from '../db.js'

export type IntegrationProvider =
  | 'zoom'
  | 'google_meet'
  | 'microsoft_teams'
  | 'notion'
  | 'google_docs'

export const INTEGRATION_CATALOG: Array<{
  id: IntegrationProvider
  name: string
  category: 'meeting' | 'docs'
  description: string
  actions: string[]
}> = [
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'meeting',
    description: 'Pull meeting recordings into Voice2Doc for transcription.',
    actions: ['import_meeting'],
  },
  {
    id: 'google_meet',
    name: 'Google Meet',
    category: 'meeting',
    description: 'Import Meet recordings and generate notes.',
    actions: ['import_meeting'],
  },
  {
    id: 'microsoft_teams',
    name: 'Microsoft Teams',
    category: 'meeting',
    description: 'Sync Teams meeting recordings into the pipeline.',
    actions: ['import_meeting'],
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'docs',
    description: 'Export polished documents to a Notion page.',
    actions: ['export_doc'],
  },
  {
    id: 'google_docs',
    name: 'Google Docs',
    category: 'docs',
    description: 'Send documents to Google Docs for collaboration.',
    actions: ['export_doc'],
  },
]

export function migrateIntegrationsColumns() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_integrations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'connected',
      access_token TEXT,
      refresh_token TEXT,
      external_account TEXT,
      metadata_json TEXT,
      connected_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, provider)
    );

    CREATE INDEX IF NOT EXISTS idx_user_integrations_user ON user_integrations(user_id);
  `)
}

export function oauthConfigured(provider: IntegrationProvider): boolean {
  switch (provider) {
    case 'zoom':
      return Boolean(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET)
    case 'google_meet':
    case 'google_docs':
      return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    case 'microsoft_teams':
      return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
    case 'notion':
      return Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET)
    default:
      return false
  }
}

export function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
}

export function apiPublicUrl(): string {
  return (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`).replace(
    /\/$/,
    '',
  )
}
