---
name: voice2doc-frontend
description: Voice2Doc React frontend patterns — pages, components, services, routing, Zustand, and i18n. Use when building UI, wiring API clients, adding routes/nav, or implementing phase frontend work.
---

# Voice2Doc frontend

## Quick commands

```bash
npm run dev          # Vite :5173 + API :3001
npm run build        # tsc + vite build (typecheck + bundle)
npm test             # Vitest (pure helpers; run after lib changes)
```

## File placement

| Task | Path |
|------|------|
| Route screen | `src/pages/<Name>Page.tsx` |
| Reusable UI | `src/components/<Name>.tsx` |
| API + mock | `src/services/<feature>Service.ts` |
| Pure logic | `src/lib/<feature>.ts` |
| Strings | `src/i18n/locales/en.ts` → `useT()` dotted keys |
| Route | `src/App.tsx` under `/app` ProtectedRoute |
| Sidebar nav | `src/components/AppShell.tsx` nav array |

## Service template

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

## Page template

- `useT()` for all visible strings
- `useDocsStore((s) => s.showToast)` for errors/success
- `GlassCard` + Studio Glass tokens (`text-ink`, `text-accent`, `glass`)
- Load data in `useEffect`; guard with `busy` / `loading` state

## i18n checklist

1. Add keys to `en.ts` first (nested object matching feature name)
2. Use `t('feature.key')` — never hardcode user-facing English in JSX
3. Nav labels: `nav.<feature>`

## Routing checklist

1. Import page in `src/App.tsx`
2. Add `<Route path="feature" element={<FeaturePage />} />` inside AppShell
3. Add nav item in `AppShell.tsx` with lucide icon
4. Optional: voice command in `src/lib/speechRecognition.ts`

## Voice / accessibility

- Voice nav commands: extend `VoiceCommandId` + `VOICE_COMMANDS` in `speechRecognition.ts`
- Voice tours: `src/lib/voiceGuide.ts` — bump test in `atelier.test.ts` if tour count changes

## Quality

- Match existing import style and component patterns (see `VoiceTwinPage.tsx`, `StudioPulseCard.tsx`)
- No default purple SaaS styling — warm accents from theme
- Run `npm run build` before finishing phase work
