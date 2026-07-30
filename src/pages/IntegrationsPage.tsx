import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GlassCard } from '../components/GlassCard'
import { env } from '../config/env'
import { useDocsStore } from '../store/docs'
import {
  integrationService,
  type IntegrationItem,
  type IntegrationProvider,
} from '../services/integrationService'

export function IntegrationsPage() {
  const showToast = useDocsStore((s) => s.showToast)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<IntegrationItem[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [meetingUrl, setMeetingUrl] = useState('')

  const refresh = async () => {
    if (env.useMockApi) {
      setItems([])
      return
    }
    try {
      const data = await integrationService.list()
      setItems(data.integrations)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load integrations')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    const connected = params.get('connected')
    if (!connected) return
    showToast(`Connected ${connected.replace('_', ' ')}`)
    setParams({}, { replace: true })
    void refresh()
  }, [params, setParams, showToast])

  const meetings = items.filter((i) => i.category === 'meeting')
  const docs = items.filter((i) => i.category === 'docs')

  const connect = async (provider: IntegrationProvider) => {
    setBusy(provider)
    try {
      const result = await integrationService.connect(provider)
      if (result.url) {
        window.location.href = result.url
        return
      }
      showToast(`Connected ${provider.replace('_', ' ')} (${result.mode})`)
      await refresh()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Connect failed')
    } finally {
      setBusy(null)
    }
  }

  const disconnect = async (provider: IntegrationProvider) => {
    setBusy(provider)
    try {
      await integrationService.disconnect(provider)
      showToast('Disconnected')
      await refresh()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Integrations</h1>
        <p className="mt-1 text-muted">
          Connect meeting platforms and doc tools. Without vendor OAuth keys, connections run in demo mode.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink dark:text-dark-ink">Meetings</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meetings.map((item) => (
            <IntegrationCard
              key={item.id}
              item={item}
              busy={busy === item.id}
              onConnect={() => connect(item.id)}
              onDisconnect={() => disconnect(item.id)}
            />
          ))}
        </div>
        <GlassCard className="space-y-3 p-5">
          <h3 className="font-semibold text-ink dark:text-dark-ink">Import meeting notes</h3>
          <p className="text-sm text-muted">Creates a Meeting Notes draft from a connected platform.</p>
          <div className="flex flex-wrap gap-2">
            <input
              className="input-field min-w-[240px] flex-1"
              placeholder="https://zoom.us/j/… or Meet link"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />
            {meetings
              .filter((m) => m.connected)
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="btn-primary"
                  disabled={busy === `import-${m.id}`}
                  onClick={async () => {
                    setBusy(`import-${m.id}`)
                    try {
                      const result = await integrationService.importMeeting(
                        m.id as 'zoom' | 'google_meet' | 'microsoft_teams',
                        { meetingUrl: meetingUrl || undefined, title: undefined },
                      )
                      showToast(result.message || 'Meeting notes created')
                      navigate(`/app/editor/${result.documentId}`)
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : 'Import failed')
                    } finally {
                      setBusy(null)
                    }
                  }}
                >
                  Import via {m.name}
                </button>
              ))}
          </div>
          {meetings.every((m) => !m.connected) && (
            <p className="text-xs text-muted">Connect Zoom, Meet, or Teams first.</p>
          )}
        </GlassCard>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink dark:text-dark-ink">Documents</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {docs.map((item) => (
            <IntegrationCard
              key={item.id}
              item={item}
              busy={busy === item.id}
              onConnect={() => connect(item.id)}
              onDisconnect={() => disconnect(item.id)}
            />
          ))}
        </div>
        <p className="text-sm text-muted">Export from the document editor with “Send to Notion / Google Docs”.</p>
      </section>
    </div>
  )
}

function IntegrationCard({
  item,
  busy,
  onConnect,
  onDisconnect,
}: {
  item: IntegrationItem
  busy: boolean
  onConnect: () => void
  onDisconnect: () => void
}) {
  return (
    <GlassCard className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-ink dark:text-dark-ink">{item.name}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            item.connected ? 'bg-signal/15 text-signal' : 'bg-black/5 text-muted dark:bg-white/10'
          }`}
        >
          {item.connected ? 'Connected' : 'Off'}
        </span>
      </div>
      <p className="mt-2 flex-1 text-sm text-muted">{item.description}</p>
      <p className="mt-2 text-xs text-muted">
        {item.oauthConfigured ? 'OAuth configured' : 'Demo mode'}
        {item.externalAccount ? ` · ${item.externalAccount}` : ''}
      </p>
      <button
        type="button"
        className={`mt-4 w-full ${item.connected ? 'btn-secondary' : 'btn-primary'}`}
        disabled={busy}
        onClick={item.connected ? onDisconnect : onConnect}
      >
        {busy ? 'Working…' : item.connected ? 'Disconnect' : 'Connect'}
      </button>
    </GlassCard>
  )
}
