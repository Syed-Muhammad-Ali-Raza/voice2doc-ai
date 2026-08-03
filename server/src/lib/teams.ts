import { db } from '../db.js'

/** Phase 4 schema migrations (safe on existing SQLite DBs). */
export function migrateTeamsColumns() {
  const cols = db.prepare(`PRAGMA table_info(documents)`).all() as Array<{ name: string }>
  const names = new Set(cols.map((c) => c.name))
  if (!names.has('workspace_id')) {
    db.exec(`ALTER TABLE documents ADD COLUMN workspace_id TEXT`)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member')),
      created_at TEXT NOT NULL,
      PRIMARY KEY (workspace_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents(workspace_id);
  `)
}

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export function getUserPlan(userId: string): string | null {
  const row = db.prepare('SELECT plan FROM users WHERE id = ?').get(userId) as
    | { plan: string }
    | undefined
  return row?.plan ?? null
}

/** Creating workspaces requires Pro or Business. */
export function canCreateWorkspace(plan: string): boolean {
  return plan === 'pro' || plan === 'business' || plan === 'enterprise'
}

export function getMembership(
  workspaceId: string,
  userId: string,
): { role: WorkspaceRole } | null {
  const row = db
    .prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(workspaceId, userId) as { role: WorkspaceRole } | undefined
  return row ?? null
}

export function requireMember(workspaceId: string, userId: string): WorkspaceRole | null {
  return getMembership(workspaceId, userId)?.role ?? null
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'admin'
}

export function canAccessDocument(doc: { user_id: string; workspace_id: string | null }, userId: string): boolean {
  if (doc.user_id === userId) return true
  if (!doc.workspace_id) return false
  return Boolean(getMembership(doc.workspace_id, userId))
}
