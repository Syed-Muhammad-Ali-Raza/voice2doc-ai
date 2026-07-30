import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GlassCard } from '../components/GlassCard'
import { useAuthStore } from '../store/auth'
import { useDocsStore } from '../store/docs'
import {
  workspaceService,
  type Workspace,
  type WorkspaceAdmin,
  type WorkspaceMember,
} from '../services/workspaceService'
import type { DocItem } from '../lib/types'

export function WorkspaceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user)
  const showToast = useDocsStore((s) => s.showToast)
  const upsertDocument = useDocsStore((s) => s.upsertDocument)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [docs, setDocs] = useState<DocItem[]>([])
  const [admin, setAdmin] = useState<WorkspaceAdmin | null>(null)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [busy, setBusy] = useState(false)

  const canManage = workspace?.role === 'owner' || workspace?.role === 'admin'

  const refresh = async () => {
    if (!id) return
    try {
      const [ws, mems, documents] = await Promise.all([
        workspaceService.get(id),
        workspaceService.members(id),
        workspaceService.documents(id),
      ])
      setWorkspace(ws)
      setMembers(mems)
      setDocs(documents)
      documents.forEach((d) => upsertDocument(d))
      if (ws.role === 'owner' || ws.role === 'admin') {
        setAdmin(await workspaceService.admin(id))
      } else {
        setAdmin(null)
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Workspace unavailable')
      navigate('/app/workspaces')
    }
  }

  useEffect(() => {
    void refresh()
  }, [id])

  if (!workspace) {
    return <p className="text-sm text-muted">Loading workspace…</p>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/app/workspaces" className="text-sm text-accent hover:underline">
            ← Workspaces
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink dark:text-dark-ink">{workspace.name}</h1>
          <p className="mt-1 text-sm capitalize text-muted">Your role: {workspace.role}</p>
        </div>
        {workspace.role === 'owner' && (
          <button
            type="button"
            className="btn-ghost text-danger"
            onClick={async () => {
              if (!confirm('Delete this workspace? Documents become personal again.')) return
              try {
                await workspaceService.remove(workspace.id)
                showToast('Workspace deleted')
                navigate('/app/workspaces')
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Delete failed')
              }
            }}
          >
            Delete workspace
          </button>
        )}
      </div>

      {admin && (
        <GlassCard className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Members</p>
            <p className="mt-1 font-display text-2xl text-ink dark:text-dark-ink">{admin.memberCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Shared docs</p>
            <p className="mt-1 font-display text-2xl text-ink dark:text-dark-ink">{admin.documentCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Owner plan</p>
            <p className="mt-1 font-display text-2xl capitalize text-accent">{admin.ownerPlan}</p>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-5">
          <h2 className="font-semibold text-ink dark:text-dark-ink">Members</h2>
          {canManage && (
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={async (e) => {
                e.preventDefault()
                setBusy(true)
                try {
                  await workspaceService.addMember(workspace.id, email.trim(), inviteRole)
                  setEmail('')
                  showToast('Member added')
                  await refresh()
                } catch (err) {
                  showToast(err instanceof Error ? err.message : 'Invite failed')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <input
                className="input-field flex-1"
                type="email"
                placeholder="teammate@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <select
                className="input-field w-auto"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" className="btn-primary" disabled={busy}>
                Invite
              </button>
            </form>
          )}
          <ul className="divide-y divide-border dark:divide-dark-border">
            {members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium text-ink dark:text-dark-ink">{m.name}</p>
                  <p className="text-xs text-muted">
                    {m.email} · <span className="capitalize">{m.role}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {canManage && m.role !== 'owner' && (
                    <>
                      <select
                        className="input-field w-auto py-1.5 text-xs"
                        value={m.role}
                        onChange={async (e) => {
                          try {
                            await workspaceService.updateMember(
                              workspace.id,
                              m.userId,
                              e.target.value as 'admin' | 'member',
                            )
                            await refresh()
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : 'Update failed')
                          }
                        }}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        type="button"
                        className="btn-ghost text-danger"
                        onClick={async () => {
                          try {
                            await workspaceService.removeMember(workspace.id, m.userId)
                            await refresh()
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : 'Remove failed')
                          }
                        }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                  {m.userId === me?.id && m.role !== 'owner' && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={async () => {
                        await workspaceService.removeMember(workspace.id, m.userId)
                        navigate('/app/workspaces')
                      }}
                    >
                      Leave
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="space-y-3 p-5">
          <h2 className="font-semibold text-ink dark:text-dark-ink">Shared documents</h2>
          {docs.length === 0 ? (
            <p className="text-sm text-muted">
              No shared docs yet. Share from{' '}
              <Link to="/app/documents" className="text-accent underline">
                Documents
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border dark:divide-dark-border">
              {docs.map((d) => (
                <li key={d.id}>
                  <Link to={`/app/editor/${d.id}`} className="block py-3">
                    <p className="font-medium text-ink dark:text-dark-ink">{d.title}</p>
                    <p className="text-xs text-muted">{d.type}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
