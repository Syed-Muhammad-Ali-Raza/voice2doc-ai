---
name: voice2doc-stack-patterns
description: Voice2Doc codebase layout, Express API conventions, React service layer, and SQLite patterns. Use when adding routes, services, migrations, or unsure where new code belongs in voice2doc-ai.
---

# Voice2Doc stack patterns

## Directory map

```
src/pages/          Route screens (orchestration only)
src/components/     Reusable UI
src/services/       API clients + mock adapters
src/store/          Zustand (auth, docs)
src/lib/            Pure helpers + types
src/i18n/locales/   Translation catalogs
src/theme/          Accent palettes, typography, applyTheme
server/src/routes/  Express routers
server/src/lib/     Migrations, business logic
server/src/ws/      WebSocket hubs
server/src/middleware/auth.js  JWT requireAuth
```

## Backend route template

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

export const featureRouter = Router()

featureRouter.get('/', requireAuth, (req: AuthedRequest, res) => {
  res.json({ items: listItems(req.user!.sub) })
})

featureRouter.post('/', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload' })
    return
  }
  // ...
})
```

Register in `server/src/index.ts` **after** `app.use(express.json())`.

## Frontend service template

```typescript
import { env } from '../config/env'
import { apiFetch } from '../lib/apiClient'

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

export const featureService = {
  async list() {
    if (env.useMockApi) return { items: [] }
    return apiFetch('/feature', {}, base())
  },
}
```

Export from `src/services/index.ts`.

## DB conventions

- SQLite via `better-sqlite3`; migrations in `migrate*()` called at startup
- IDs: `uuid()` strings; timestamps ISO strings
- JSON columns: `*_json` with `JSON.stringify` / `JSON.parse`
- Foreign keys: `REFERENCES users(id) ON DELETE CASCADE`

## Document access

Use `canAccessDocument(doc, userId)` from `server/src/lib/teams.js` before returning doc content.

## Import paths (server)

Use `.js` extension in TypeScript imports (Node ESM): `'../db.js'`, `'./memoryGraph.js'`.
