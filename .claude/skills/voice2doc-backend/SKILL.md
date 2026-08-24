---
name: voice2doc-backend
description: Voice2Doc Express API patterns — migrations, lib logic, routes, auth, Zod validation, and health wiring. Use when adding API endpoints, SQLite tables, server lib, or implementing phase backend work.
---

# Voice2Doc backend

## Quick commands

```bash
npm run server       # tsx watch server/src/index.ts (:3001)
npm test             # Vitest (includes src/lib pure tests)
curl http://localhost:3001/api/health
```

## File placement

| Task | Path |
|------|------|
| Express router | `server/src/routes/<feature>.ts` |
| Business logic + migration | `server/src/lib/<feature>.ts` |
| Pure mirror of `src/lib/*` | `server/src/lib/<feature>Graph.ts` |
| Wire router + migrate | `server/src/index.ts` |
| Auth middleware | `server/src/middleware/auth.js` |

## Route template

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

export const featureRouter = Router()

featureRouter.get('/', requireAuth, (req: AuthedRequest, res) => {
  res.json(listItems(req.user!.sub))
})

featureRouter.post('/', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload' })
    return
  }
  res.json(createItem(req.user!.sub, parsed.data))
})
```

Register **after** `app.use(express.json())`:

```typescript
app.use('/api/feature', featureRouter)
```

## Migration template

Call at startup in `index.ts` before routes:

```typescript
export function migrateFeatureTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feature_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_feature_user ON feature_items(user_id);
  `)
}
```

## Conventions

- IDs: `uuid()` from `uuid` package
- Timestamps: `new Date().toISOString()`
- JSON columns: `*_json` with `JSON.stringify` / `JSON.parse`
- Responses: map snake_case DB → camelCase in lib mappers
- Imports: ESM with `.js` extension (`'../db.js'`)
- Document scope: `canAccessDocument()` from `server/src/lib/teams.js`

## Auth & compliance

- All mutations: `requireAuth`
- User data changes: `writeAudit(userId, 'action.name', { meta: {...} })` in `compliance.ts`
- Export/wipe: extend `compliance.ts` if new user-owned tables

## Phase delivery checklist

1. `migrate*()` idempotent (`CREATE IF NOT EXISTS`)
2. Lib functions take `userId` from JWT `req.user!.sub`
3. Bump `phase` in `GET /api/health`
4. Add feature flag in health JSON (e.g. `pulse: true`)
5. Mirror pure helpers to `*Graph.ts` if shared with frontend tests
6. Update README API table + `docs/ARCHITECTURE.md`

## Health bump

In `server/src/index.ts`:

```typescript
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, phase: 15, pulse: true, /* ... */ })
})
```

## Quality

- Validate POST/PATCH bodies with Zod
- Return `{ error: 'message' }` with 400/404/500 as appropriate
- No secrets in code — use `server/.env`
- Run `npm test` and `npm run build` after changes
