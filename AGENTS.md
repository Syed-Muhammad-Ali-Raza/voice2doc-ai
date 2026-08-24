# Voice2Doc AI — agent instructions

Turn voice notes into professional documents. Monorepo-style SPA + Express API (SQLite).

## Stack

| Layer | Path | Notes |
|-------|------|-------|
| Frontend | `src/` | React 19, Vite, Tailwind v4, Zustand, react-i18next |
| Backend | `server/src/` | Express 5, better-sqlite3, JWT auth, WebSocket collab |
| Shared pure helpers | `src/lib/*.ts` | Mirror on server as `server/src/lib/*Graph.ts` when needed |
| Docs | `README.md`, `docs/ARCHITECTURE.md` | Bump `phase` in `server/src/index.ts` health + docs |

## Commands

```bash
npm run dev          # web :5173 + api :3001
npm test             # vitest
npm run build        # tsc + vite build
npm run sync:skills  # mirror .agents/skills → IDE folders
```

## Product phases

Features ship as numbered phases (see README phase table). Current phase is reflected in `/api/health` (`phase` field) and documentation.

When implementing a phase:

1. Pure logic → `src/lib/` + `*.test.ts`
2. Server migration + lib → `server/src/lib/` + route → wire in `server/src/index.ts`
3. Frontend service → page/component → nav/route → i18n keys in `src/i18n/locales/en.ts`
4. Update README + `docs/ARCHITECTURE.md`, plans if needed
5. Run `npm test` and `npm run build`

## Conventions

- **Auth**: all mutations via `requireAuth`; use `canAccessDocument` for doc scope
- **API**: REST under `/api/*`; Zod validate bodies; map DB snake_case → camelCase in responses
- **Frontend services**: `src/services/*Service.ts`; mock branch when `env.useMockApi`
- **i18n**: add keys to `en.ts` first; use `useT()` with dotted keys
- **Theme**: Studio Glass — warm accents from `src/theme/palettes.ts`, no default purple SaaS look
- **Tests**: Vitest for pure helpers only; no DB in unit tests
- **Quality**: pass lint/types/prettier; avoid editing unrelated files

## Agent skills

Load skills from `.agents/skills/` (or IDE mirrors). Prefer:

- `voice2doc-phase-delivery` — end-to-end phase workflow
- `voice2doc-stack-patterns` — file placement & API shapes
- `voice2doc-testing` — Vitest patterns
- `voice2doc-i18n-theme` — localization & theming

After skill edits: `npm run sync:skills`.
