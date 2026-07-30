import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { env } from '../config/env'
import { useSettingsStore } from '../store/auth'
import { useDocsStore } from '../store/docs'
import { workspaceService, type Workspace } from '../services/workspaceService'

export function WorkspacesPage() {
  const plan = useSettingsStore((s) => s.plan)
  const showToast = useDocsStore((s) => s.showToast)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const canCreate = plan === 'pro' || plan === 'business'

  const refresh = async () => {
    if (env.useMockApi) {
      setWorkspaces([])
      setLoading(false)
      return
    }
    try {
      setWorkspaces(await workspaceService.list())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Workspaces</h1>
        <p className="mt-1 text-muted">Share documents with your team. Roles: owner, admin, member.</p>
      </div>

      <GlassCard className="space-y-3 p-5">
        <h2 className="font-semibold text-ink dark:text-dark-ink">Create workspace</h2>
        {!canCreate ? (
          <p className="text-sm text-muted">
            Upgrade to Pro or Business to create workspaces.{' '}
            <Link to="/app/billing" className="text-accent underline">
              Billing
            </Link>
          </p>
        ) : (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!name.trim()) return
              setBusy(true)
              try {
                await workspaceService.create(name.trim())
                setName('')
                showToast('Workspace created')
                await refresh()
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Could not create workspace')
              } finally {
                setBusy(false)
              }
            }}
          >
            <input
              className="input-field min-w-[220px] flex-1"
              placeholder="Team name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={busy}>
              <Plus size={16} /> {busy ? 'Creating…' : 'Create'}
            </button>
          </form>
        )}
      </GlassCard>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : workspaces.length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-muted">
          <Users className="mx-auto mb-3 text-accent" />
          No workspaces yet. Create one or ask a teammate to invite your email.
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {workspaces.map((ws) => (
            <Link key={ws.id} to={`/app/workspaces/${ws.id}`} className="glass block p-5 transition hover:ring-1 hover:ring-accent/30">
              <h3 className="font-display text-xl font-semibold text-ink dark:text-dark-ink">{ws.name}</h3>
              <p className="mt-2 text-xs capitalize text-muted">
                {ws.role} · {ws.memberCount ?? 1} members
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
