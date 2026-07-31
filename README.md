# Voice2Doc AI

**Turn voice notes into professional documents in seconds.**

**Phase 6 (current):** Localization & Studio Personalization — interface languages (incl. RTL), accent color atelier, typography pairs.

---

## Quick start

```bash
cd voice2doc-ai
npm install
npm run dev
```

| Process | URL |
|---------|-----|
| Web | `http://localhost:5173` |
| API | `http://localhost:3001` |

---

## Phases

| Phase | Status | Focus |
|-------|--------|-------|
| 0–4 | Done | UI, auth, jobs, Stripe, teams |
| 5 Integrations | Done | Zoom / Meet / Teams / Notion / Docs |
| **6 Localization & Studio Personalization** | **Current** | i18n, RTL, color + typography atelier |
| 7 Meeting Memory Graph | Planned | Speakers, action continuity across meetings |
| 8 Document Atelier | Planned | Brand kits, tone DNA, export polish |
| 9 Live Studio Collab | Planned | Presence, timestamp comments |
| 10 Trust & Compliance Vault | Planned | Retention, audit, residency |
| 11 Studio AI Chatbot | Planned | In-app assistant for docs & help |

---

## Public pages

| Path | Page |
|------|------|
| `/privacy` | Privacy Policy |
| `/help` | Help Center |

---

## Phase 6 — Localization & Studio Personalization

Open **Settings** (or the language selector on the marketing header):

1. **Language** — English, Spanish, French, German, Urdu, Arabic. Urdu/Arabic flip the layout to RTL (`dir=rtl` on `<html>`).
2. **Accent color** — six Studio Glass palettes (Studio Amber, Harbor Teal, Ember Clay, Brass & Ink, Coastal Sage, Copper Dusk). Updates CTAs, signals, and ambient gradients live.
3. **Typography** — six display/body pairs (Fraunces+DM Sans, Literata+Figtree, Newsreader+Source Sans, Syne+Outfit, Libre Baskerville+Karla, Bricolage+Manrope).
4. Preferences persist in `localStorage` and sync to `PUT /api/preferences` when logged in.

### API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/preferences` | Auth required |
| PUT | `/api/preferences` | Partial update; stored as `users.preferences_json` |

### Code map

| Area | Path |
|------|------|
| Locale catalogs | `src/i18n/locales/*` |
| Engine | `i18next` + `react-i18next` (`src/i18n/index.ts`) |
| `useT()` | `src/i18n/useT.ts` → `useTranslation()` |
| Accents | `src/theme/palettes.ts` |
| Type pairs | `src/theme/typography.ts` |
| Apply CSS vars | `src/theme/applyTheme.ts` |
| Settings UI | `src/pages/SettingsPage.tsx` |
| Server | `server/src/routes/preferences.ts` |

### Extending i18n

Add keys to `src/i18n/locales/en.ts`, mirror them in other locale files, then call `t('group.key')` via `useT()`.

---

## Phase 5 — Integrations

Open **Integrations** in the sidebar:

1. **Connect** Zoom / Meet / Teams / Notion / Google Docs (demo mode without keys).
2. **Import meeting** → Meeting Notes draft.
3. Editor **Export** → Notion / Google Docs.

Optional OAuth keys live in `server/.env` (see Architecture).

---

## Docs

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full phased roadmap and system design.
