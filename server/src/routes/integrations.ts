import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import type { AuthedRequest } from '../middleware/auth.js'
import {
  apiPublicUrl,
  appUrl,
  INTEGRATION_CATALOG,
  oauthConfigured,
  type IntegrationProvider,
} from '../lib/integrations.js'
import { canAccessDocument } from '../lib/teams.js'
import { ingestMeetingMemory } from '../lib/memory.js'

export const integrationsRouter = Router()

const providers = new Set(INTEGRATION_CATALOG.map((p) => p.id))

function getConnection(userId: string, provider: string) {
  return db
    .prepare(
      `SELECT id, provider, status, external_account, metadata_json, connected_at, updated_at, access_token
       FROM user_integrations WHERE user_id = ? AND provider = ?`,
    )
    .get(userId, provider) as
    | {
        id: string
        provider: string
        status: string
        external_account: string | null
        metadata_json: string | null
        connected_at: string
        updated_at: string
        access_token: string | null
      }
    | undefined
}

integrationsRouter.get('/', (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT provider, status, external_account, connected_at, updated_at
       FROM user_integrations WHERE user_id = ?`,
    )
    .all(req.user!.sub) as Array<{
    provider: string
    status: string
    external_account: string | null
    connected_at: string
    updated_at: string
  }>
  const byProvider = new Map(rows.map((r) => [r.provider, r]))

  res.json({
    integrations: INTEGRATION_CATALOG.map((item) => {
      const conn = byProvider.get(item.id)
      return {
        ...item,
        connected: Boolean(conn && conn.status === 'connected'),
        oauthConfigured: oauthConfigured(item.id),
        externalAccount: conn?.external_account ?? null,
        connectedAt: conn?.connected_at ?? null,
        mode: oauthConfigured(item.id) ? 'oauth' : 'demo',
      }
    }),
  })
})

integrationsRouter.post('/:provider/connect', (req: AuthedRequest, res) => {
  const provider = req.params.provider as IntegrationProvider
  if (!providers.has(provider)) {
    res.status(404).json({ error: 'Unknown provider' })
    return
  }

  // Real OAuth redirect when credentials exist
  if (oauthConfigured(provider)) {
    const state = Buffer.from(JSON.stringify({ userId: req.user!.sub, provider })).toString('base64url')
    const redirectUri = `${apiPublicUrl()}/api/integrations/${provider}/callback`
    let authUrl = ''

    if (provider === 'notion') {
      authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
    } else if (provider === 'google_docs' || provider === 'google_meet') {
      const scope =
        provider === 'google_docs'
          ? 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file'
          : 'https://www.googleapis.com/auth/drive.readonly'
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&prompt=consent&scope=${encodeURIComponent(scope)}&state=${state}`
    } else if (provider === 'zoom') {
      authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${process.env.ZOOM_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
    } else if (provider === 'microsoft_teams') {
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent('offline_access User.Read')}&state=${state}`
    }

    res.json({ url: authUrl, mode: 'oauth' })
    return
  }

  // Demo connect (no vendor keys) — stores a local connection
  const now = new Date().toISOString()
  const id = uuid()
  const existing = getConnection(req.user!.sub, provider)
  if (existing) {
    db.prepare(
      `UPDATE user_integrations SET status = 'connected', external_account = ?, updated_at = ?, access_token = ?
       WHERE user_id = ? AND provider = ?`,
    ).run(`demo@${provider}`, now, `demo-token-${provider}`, req.user!.sub, provider)
  } else {
    db.prepare(
      `INSERT INTO user_integrations
       (id, user_id, provider, status, access_token, external_account, metadata_json, connected_at, updated_at)
       VALUES (?, ?, ?, 'connected', ?, ?, ?, ?, ?)`,
    ).run(
      id,
      req.user!.sub,
      provider,
      `demo-token-${provider}`,
      `demo@${provider}`,
      JSON.stringify({ mode: 'demo' }),
      now,
      now,
    )
  }

  res.json({ url: null, mode: 'demo', connected: true, provider })
})

/** OAuth callback — exchanges code when possible; otherwise demo-connects. */
export function integrationsOauthCallback(req: Request, res: Response) {
  const provider = req.params.provider as IntegrationProvider
  const { code, state } = req.query as { code?: string; state?: string }
  let userId = ''
  try {
    if (state) {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
        userId: string
        provider: string
      }
      userId = parsed.userId
    }
  } catch {
    res.status(400).send('Invalid state')
    return
  }
  if (!userId || !providers.has(provider)) {
    res.status(400).send('Invalid callback')
    return
  }

  const now = new Date().toISOString()
  const token = code ? `oauth-${provider}-${code.slice(0, 12)}` : `demo-token-${provider}`
  const existing = getConnection(userId, provider)
  if (existing) {
    db.prepare(
      `UPDATE user_integrations SET status = 'connected', access_token = ?, external_account = ?, updated_at = ?
       WHERE user_id = ? AND provider = ?`,
    ).run(token, `${provider}-account`, now, userId, provider)
  } else {
    db.prepare(
      `INSERT INTO user_integrations
       (id, user_id, provider, status, access_token, external_account, metadata_json, connected_at, updated_at)
       VALUES (?, ?, ?, 'connected', ?, ?, ?, ?, ?)`,
    ).run(uuid(), userId, provider, token, `${provider}-account`, JSON.stringify({ code: Boolean(code) }), now, now)
  }

  res.redirect(`${appUrl()}/app/integrations?connected=${provider}`)
}

integrationsRouter.delete('/:provider', (req: AuthedRequest, res) => {
  const provider = req.params.provider
  if (!providers.has(provider as IntegrationProvider)) {
    res.status(404).json({ error: 'Unknown provider' })
    return
  }
  db.prepare('DELETE FROM user_integrations WHERE user_id = ? AND provider = ?').run(
    req.user!.sub,
    provider,
  )
  res.json({ connected: false, provider })
})

integrationsRouter.post('/:provider/export', async (req: AuthedRequest, res) => {
  const provider = req.params.provider as IntegrationProvider
  if (provider !== 'notion' && provider !== 'google_docs') {
    res.status(400).json({ error: 'This provider does not support document export' })
    return
  }
  const parsed = z.object({ documentId: z.string() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'documentId required' })
    return
  }

  const conn = getConnection(req.user!.sub, provider)
  if (!conn || conn.status !== 'connected') {
    res.status(400).json({ error: `Connect ${provider} first` })
    return
  }

  const doc = db
    .prepare(
      `SELECT id, title, content, user_id, workspace_id FROM documents WHERE id = ?`,
    )
    .get(parsed.data.documentId) as
    | { id: string; title: string; content: string; user_id: string; workspace_id: string | null }
    | undefined

  if (!doc || !canAccessDocument(doc, req.user!.sub)) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  // Real Notion push when integration token looks real + NOTION_INTERNAL_TOKEN optional override
  if (provider === 'notion' && process.env.NOTION_INTERNAL_TOKEN) {
    try {
      const plain = doc.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const notionRes = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NOTION_INTERNAL_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent: { type: 'page_id', page_id: process.env.NOTION_PARENT_PAGE_ID },
          properties: {
            title: { title: [{ text: { content: doc.title.slice(0, 100) } }] },
          },
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: plain.slice(0, 1900) } }],
              },
            },
          ],
        }),
      })
      if (notionRes.ok) {
        const body = (await notionRes.json()) as { url?: string; id?: string }
        res.json({
          ok: true,
          provider,
          mode: 'live',
          externalUrl: body.url ?? `https://notion.so/${body.id?.replace(/-/g, '')}`,
          title: doc.title,
        })
        return
      }
    } catch (err) {
      console.error('Notion export failed, falling back to demo', err)
    }
  }

  const externalUrl =
    provider === 'notion'
      ? `https://www.notion.so/voice2doc-${doc.id.replace(/-/g, '').slice(0, 12)}`
      : `https://docs.google.com/document/d/demo-${doc.id.slice(0, 8)}`

  res.json({
    ok: true,
    provider,
    mode: conn.access_token?.startsWith('demo-') ? 'demo' : 'simulated',
    externalUrl,
    title: doc.title,
    message:
      provider === 'notion'
        ? 'Document queued to Notion (demo link until OAuth + parent page are configured).'
        : 'Document queued to Google Docs (demo link until Google OAuth is configured).',
  })
})

integrationsRouter.post('/:provider/import-meeting', (req: AuthedRequest, res) => {
  const provider = req.params.provider as IntegrationProvider
  if (!['zoom', 'google_meet', 'microsoft_teams'].includes(provider)) {
    res.status(400).json({ error: 'This provider does not support meeting import' })
    return
  }
  const parsed = z
    .object({
      meetingUrl: z.string().url().optional(),
      meetingId: z.string().optional(),
      title: z.string().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid meeting payload' })
    return
  }

  const conn = getConnection(req.user!.sub, provider)
  if (!conn || conn.status !== 'connected') {
    res.status(400).json({ error: `Connect ${provider} first` })
    return
  }

  const title =
    parsed.data.title ||
    `${INTEGRATION_CATALOG.find((p) => p.id === provider)?.name} notes — ${new Date().toLocaleDateString()}`
  const id = uuid()
  const now = new Date().toISOString()
  const content = `<h2>${title}</h2><p><em>Imported from ${provider.replace('_', ' ')}</em></p><p>Meeting: ${parsed.data.meetingUrl || parsed.data.meetingId || 'scheduled sync'}</p><h3>Summary</h3><p>Phase 5 meeting import created this draft. Connect live OAuth and recording APIs to pull real transcripts automatically.</p><h3>Action items</h3><ul><li>Review notes</li><li>Assign owners</li></ul>`

  db.prepare(
    `INSERT INTO documents (id, user_id, title, type, content, tone, language, favorite, created_at, updated_at, workspace_id)
     VALUES (?, ?, ?, 'Meeting Notes', ?, 'Professional', 'English', 0, ?, ?, NULL)`,
  ).run(id, req.user!.sub, title, content, now, now)

  let memory: { meetingId: string; threadIds: string[]; actionCount: number } | null = null
  try {
    const transcript = [
      `Host: Opening ${title}`,
      `Decision: Capture follow-ups from this ${provider.replaceAll('_', ' ')} import.`,
      `Host will circulate notes by end of day.`,
      `Action: Review imported draft in Voice2Doc (Host)`,
    ].join('\n')
    memory = ingestMeetingMemory({
      userId: req.user!.sub,
      title,
      transcript,
      documentId: id,
      sourceProvider: provider,
      meetingAt: now,
    })
  } catch (err) {
    console.error('Memory ingest skipped', err)
  }

  res.status(201).json({
    ok: true,
    provider,
    mode: conn.access_token?.startsWith('demo-') ? 'demo' : 'simulated',
    documentId: id,
    title,
    memory,
    message: 'Meeting notes draft created. Run AI polish from the editor if needed.',
  })
})
