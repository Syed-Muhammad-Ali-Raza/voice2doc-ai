# Voice2Doc AI

**Turn voice notes into professional documents in seconds.**

**Phase 11 (current):** Studio AI Chatbot — floating in-app assistant with Help, Document, and Meeting modes.

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
| Collab WS | `ws://localhost:3001/ws/collab` |

```bash
npm test
```

---

## Phases

| Phase | Status | Focus |
|-------|--------|-------|
| 0–4 | Done | UI, auth, jobs, Stripe, teams |
| 5 Integrations | Done | Zoom / Meet / Teams / Notion / Docs |
| 6 Localization & Studio Personalization | Done | i18n, RTL, color + typography atelier |
| 7 Meeting Memory Graph | Done | Speakers, actions, recurring decisions |
| 8 Document Atelier | Done | Brand kits, Tone DNA, voice guide |
| 9 Live Studio Collab | Done | Presence, timestamp comments, conflict saves |
| 10 Trust & Compliance Vault | Done | Retention, audit, residency, Enterprise plan |
| **11 Studio AI Chatbot** | **Current** | In-app assistant for docs & help |
| 12 Echo Score | Planned | Spoken-intent vs draft fidelity |
| 13 Voice Twin | Planned | Personal writing voice from past docs |
| 14 Speak-the-UI | Planned | Voice-controlled navigation |

---

## Plans

| Plan | Monthly | Highlights |
|------|---------|------------|
| Free | $0 | 10 AI docs, templates, voice guide |
| Pro | $19 | Unlimited AI, Atelier, Memory |
| Business | $49 | Teams, live collab, audit preview |
| **Enterprise** | **$149** | Compliance Vault, retention, export/wipe |

---

## Phase 11 — Studio AI Chatbot

Inside the **app shell**:

1. Open the floating **Studio AI** bubble.
2. Pick mode: **Help**, **Document**, or **Meeting**.
3. Ask for guidance, rewrite hints, or action summaries.
4. If privacy analytics is disabled, replies still work but chat history is ephemeral.

### API

| Method | Path |
|--------|------|
| GET | `/api/chat/sessions` |
| POST | `/api/chat/sessions` |
| GET | `/api/chat/sessions/:id/messages` |
| POST | `/api/chat/sessions/:id/messages` |
| POST (SSE) | `/api/chat/sessions/:id/messages?stream=1` |

---

## Phase 10 — Trust & Compliance

Open **Trust** in the sidebar:

1. Set **audio retention days** (0 = keep forever) and residency hint.
2. Save policy — changes appear in the **audit log**.
3. **Purge expired audio**, **Export my data** (JSON), or type `WIPE` to clear studio content.

### API

| Method | Path |
|--------|------|
| GET/PUT | `/api/compliance/policy` |
| GET | `/api/compliance/audit` |
| POST | `/api/compliance/purge-audio` |
| POST | `/api/compliance/export` |
| POST | `/api/compliance/wipe` |

---

## Phase 9 — Live Studio Collab

Open any document in the **editor**:

1. **Presence** avatars show who is in the room (WebSocket + heartbeat).
2. Set mode to **Editing**, **Listen along**, or **Recording**.
3. Add a **timestamp comment** (`m:ss`) — it mirrors into the document HTML.
4. Saves send `baseUpdatedAt`; a **409 conflict** reloads the newer version.

### API

| Method | Path |
|--------|------|
| GET | `/api/documents/:id/comments` |
| POST | `/api/documents/:id/comments` |
| DELETE | `/api/documents/:id/comments/:commentId` |
| POST | `/api/documents/:id/comments/presence` |
| WS | `/ws/collab?documentId=&token=` |

---

## Voice guide (demo / how-to)

Floating **headphones** button (bottom-right) on marketing pages and inside the app:

1. Open the panel and pick a tour (Welcome, Record, Memory, Settings, Atelier, Help).
2. Your browser speaks the steps (Web Speech API) — no API key required.
3. Stop anytime. Uses your current UI language when the browser has a matching voice.

---

## Phase 8 — Document Atelier

Open **Atelier** in the sidebar:

1. Choose or create a **brand kit** (logo text, accent, letterhead title, footer).
2. Choose or create a **Tone DNA** profile (do / don’t / sample opening).
3. Live **letterhead preview** + **tone fit score** for a sample draft.

### API

| Method | Path |
|--------|------|
| GET/POST | `/api/atelier/brand-kits` |
| GET/POST | `/api/atelier/tone-profiles` |
| POST | `/api/atelier/preview` |

---

## Phase 7 — Meeting Memory Graph

Open **Memory** in the sidebar:

1. View **threads** (decisions / actions) seeded from demo meetings or created when you **Import meeting**.
2. Recurring decisions that appear in multiple meetings are linked automatically (fingerprint merge).
3. Open a thread for linked meetings, speakers, and action owners/due hints.
4. Mark threads resolved when done.

### API

| Method | Path |
|--------|------|
| GET | `/api/memory/threads` |
| GET | `/api/memory/threads/:id` |
| PATCH | `/api/memory/threads/:id` |
| GET | `/api/memory/meetings` |
| POST | `/api/memory/ingest` |

### Unit tests

Pure graph helpers live in `src/lib/memoryGraph.ts` (mirrored on the server). Run `npm test`.

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

## Public pages

| Path | Page |
|------|------|
| `/privacy` | Privacy Policy |
| `/help` | Help Center |

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
