---
name: voice2doc-phase-delivery
description: Delivers a new Voice2Doc product phase end-to-end (backend migration, API route, frontend service/UI, i18n, docs, tests). Use when the user asks to implement the next phase, add a roadmap feature, or extend voice2doc-ai with a documented phase.
---

# Voice2Doc phase delivery

## Workflow

1. **Read spec** — `README.md` phase table + `docs/ARCHITECTURE.md` planned section.
2. **Pure helpers** — `src/lib/<feature>.ts` + `src/lib/<feature>.test.ts` (no SQLite/Express).
3. **Server**
   - `migrate*Tables()` in `server/src/lib/<feature>.ts`
   - Route in `server/src/routes/<feature>.ts`
   - Wire in `server/src/index.ts`: migrate, `app.use('/api/...')`, bump `phase` in `/api/health`
4. **Frontend**
   - `src/services/<feature>Service.ts` (mock + HTTP via `apiFetch`)
   - Page or panel component; route in `src/App.tsx`; nav in `AppShell.tsx` if needed
   - i18n keys in `src/i18n/locales/en.ts`
5. **Integrations** — hook pipeline, compliance audit, wipe/export if user data involved
6. **Docs** — mark previous phase complete; set new phase **current** in README + ARCHITECTURE
7. **Verify** — `npm test`, `npm run build`

## Checklist

```
- [ ] Migration idempotent (CREATE IF NOT EXISTS)
- [ ] Auth on all mutations
- [ ] Zod validation on POST/PATCH bodies
- [ ] Mock path in service when env.useMockApi
- [ ] Health phase number updated
- [ ] Unit tests for pure helpers
- [ ] No secrets committed
```

## Phase patterns already in repo

| Phase type | Example paths |
|------------|---------------|
| Graph / scoring | `src/lib/echoScore.ts`, `server/src/lib/echo.ts` |
| CRUD + UI page | `server/src/lib/voiceTwin.ts`, `src/pages/VoiceTwinPage.tsx` |
| Editor panel | `src/components/EchoScorePanel.tsx` |
| WebSocket | `server/src/ws/collabHub.ts` |
| Compliance hooks | `writeAudit()` in `server/src/lib/compliance.ts` |

Keep Studio Glass UI: warm accents, one primary action per screen, no generic purple SaaS theme.
