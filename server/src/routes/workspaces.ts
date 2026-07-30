import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import type { AuthedRequest } from '../middleware/auth.js'
import {
  canCreateWorkspace,
  canManageMembers,
  getUserPlan,
  requireMember,
  type WorkspaceRole,
} from '../lib/teams.js'

export const workspacesRouter = Router()

function mapWorkspace(row: {
  id: string
  name: string
  owner_id: string
  created_at: string
  role?: string
  member_count?: number
}) {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    role: row.role,
    memberCount: row.member_count,
  }
}

workspacesRouter.get('/', (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT w.id, w.name, w.owner_id, w.created_at, m.role,
              (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) AS member_count
       FROM workspaces w
       INNER JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ?
       ORDER BY w.created_at DESC`,
    )
    .all(req.user!.sub) as Array<{
    id: string
    name: string
    owner_id: string
    created_at: string
    role: string
    member_count: number
  }>
  res.json(rows.map(mapWorkspace))
})

workspacesRouter.post('/', (req: AuthedRequest, res) => {
  const parsed = z.object({ name: z.string().min(1).max(120) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Name is required' })
    return
  }
  const plan = getUserPlan(req.user!.sub)
  if (!plan || !canCreateWorkspace(plan)) {
    res.status(403).json({ error: 'Upgrade to Pro or Business to create workspaces' })
    return
  }

  const id = uuid()
  const now = new Date().toISOString()
  const create = db.transaction(() => {
    db.prepare('INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)').run(
      id,
      parsed.data.name,
      req.user!.sub,
      now,
    )
    db.prepare(
      'INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
    ).run(id, req.user!.sub, 'owner', now)
  })
  create()

  res.status(201).json(
    mapWorkspace({
      id,
      name: parsed.data.name,
      owner_id: req.user!.sub,
      created_at: now,
      role: 'owner',
      member_count: 1,
    }),
  )
})

workspacesRouter.get('/:id', (req: AuthedRequest, res) => {
  const role = requireMember(req.params.id, req.user!.sub)
  if (!role) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  const row = db
    .prepare(
      `SELECT w.id, w.name, w.owner_id, w.created_at,
              (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) AS member_count
       FROM workspaces w WHERE w.id = ?`,
    )
    .get(req.params.id) as {
    id: string
    name: string
    owner_id: string
    created_at: string
    member_count: number
  }
  res.json(mapWorkspace({ ...row, role }))
})

workspacesRouter.patch('/:id', (req: AuthedRequest, res) => {
  const role = requireMember(req.params.id, req.user!.sub)
  if (!role || !canManageMembers(role)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const parsed = z.object({ name: z.string().min(1).max(120) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid name' })
    return
  }
  db.prepare('UPDATE workspaces SET name = ? WHERE id = ?').run(parsed.data.name, req.params.id)
  const row = db
    .prepare('SELECT id, name, owner_id, created_at FROM workspaces WHERE id = ?')
    .get(req.params.id) as { id: string; name: string; owner_id: string; created_at: string }
  res.json(mapWorkspace({ ...row, role }))
})

workspacesRouter.delete('/:id', (req: AuthedRequest, res) => {
  const role = requireMember(req.params.id, req.user!.sub)
  if (role !== 'owner') {
    res.status(403).json({ error: 'Only the owner can delete a workspace' })
    return
  }
  db.prepare('UPDATE documents SET workspace_id = NULL WHERE workspace_id = ?').run(req.params.id)
  db.prepare('DELETE FROM workspaces WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

workspacesRouter.get('/:id/members', (req: AuthedRequest, res) => {
  if (!requireMember(req.params.id, req.user!.sub)) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  const rows = db
    .prepare(
      `SELECT m.user_id, m.role, m.created_at, u.name, u.email
       FROM workspace_members m
       INNER JOIN users u ON u.id = m.user_id
       WHERE m.workspace_id = ?
       ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name`,
    )
    .all(req.params.id) as Array<{
    user_id: string
    role: string
    created_at: string
    name: string
    email: string
  }>
  res.json(
    rows.map((r) => ({
      userId: r.user_id,
      role: r.role,
      name: r.name,
      email: r.email,
      joinedAt: r.created_at,
    })),
  )
})

workspacesRouter.post('/:id/members', (req: AuthedRequest, res) => {
  const role = requireMember(req.params.id, req.user!.sub)
  if (!role || !canManageMembers(role)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const parsed = z
    .object({
      email: z.string().email(),
      role: z.enum(['admin', 'member']).default('member'),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Valid email required' })
    return
  }

  const invitee = db
    .prepare('SELECT id, name, email FROM users WHERE email = ?')
    .get(parsed.data.email.toLowerCase()) as { id: string; name: string; email: string } | undefined
  if (!invitee) {
    res.status(404).json({ error: 'No account found for that email. Ask them to register first.' })
    return
  }
  if (invitee.id === req.user!.sub) {
    res.status(400).json({ error: 'You are already a member' })
    return
  }

  const existing = requireMember(req.params.id, invitee.id)
  if (existing) {
    res.status(409).json({ error: 'User is already a member' })
    return
  }

  const now = new Date().toISOString()
  db.prepare(
    'INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
  ).run(req.params.id, invitee.id, parsed.data.role, now)

  res.status(201).json({
    userId: invitee.id,
    role: parsed.data.role,
    name: invitee.name,
    email: invitee.email,
    joinedAt: now,
  })
})

workspacesRouter.patch('/:id/members/:userId', (req: AuthedRequest, res) => {
  const role = requireMember(req.params.id, req.user!.sub)
  if (!role || !canManageMembers(role)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const parsed = z.object({ role: z.enum(['admin', 'member']) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }
  const target = requireMember(req.params.id, req.params.userId)
  if (!target) {
    res.status(404).json({ error: 'Member not found' })
    return
  }
  if (target === 'owner') {
    res.status(400).json({ error: 'Cannot change the owner role' })
    return
  }
  db.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?').run(
    parsed.data.role,
    req.params.id,
    req.params.userId,
  )
  res.json({ userId: req.params.userId, role: parsed.data.role })
})

workspacesRouter.delete('/:id/members/:userId', (req: AuthedRequest, res) => {
  const role = requireMember(req.params.id, req.user!.sub)
  const targetId = req.params.userId
  const isSelf = targetId === req.user!.sub

  if (!role) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  if (!isSelf && !canManageMembers(role)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const target = requireMember(req.params.id, targetId)
  if (!target) {
    res.status(404).json({ error: 'Member not found' })
    return
  }
  if (target === 'owner') {
    res.status(400).json({ error: 'Owner cannot leave; transfer or delete the workspace' })
    return
  }

  db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').run(
    req.params.id,
    targetId,
  )
  res.status(204).end()
})

workspacesRouter.get('/:id/documents', (req: AuthedRequest, res) => {
  if (!requireMember(req.params.id, req.user!.sub)) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  const rows = db
    .prepare(
      `SELECT id, title, type, content, tone, language, favorite, created_at, updated_at, user_id, workspace_id
       FROM documents WHERE workspace_id = ? ORDER BY updated_at DESC`,
    )
    .all(req.params.id) as Array<{
    id: string
    title: string
    type: string
    content: string
    tone: string
    language: string
    favorite: number
    created_at: string
    updated_at: string
    user_id: string
    workspace_id: string
  }>
  res.json(
    rows.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      content: r.content,
      tone: r.tone,
      language: r.language,
      favorite: Boolean(r.favorite),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      ownerId: r.user_id,
      workspaceId: r.workspace_id,
    })),
  )
})

/** Business admin snapshot for workspace owners. */
workspacesRouter.get('/:id/admin', (req: AuthedRequest, res) => {
  const role = requireMember(req.params.id, req.user!.sub)
  if (role !== 'owner' && role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  const plan = getUserPlan(req.user!.sub)
  const memberCount = (
    db.prepare('SELECT COUNT(*) AS c FROM workspace_members WHERE workspace_id = ?').get(req.params.id) as {
      c: number
    }
  ).c
  const docCount = (
    db.prepare('SELECT COUNT(*) AS c FROM documents WHERE workspace_id = ?').get(req.params.id) as {
      c: number
    }
  ).c
  const recent = db
    .prepare(
      `SELECT title, updated_at FROM documents WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 5`,
    )
    .all(req.params.id) as Array<{ title: string; updated_at: string }>

  res.json({
    workspaceId: req.params.id,
    memberCount,
    documentCount: docCount,
    ownerPlan: plan,
    recentDocuments: recent.map((r) => ({ title: r.title, updatedAt: r.updated_at })),
    roles: ['owner', 'admin', 'member'] satisfies WorkspaceRole[],
  })
})
