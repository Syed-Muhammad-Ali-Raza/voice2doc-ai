# Voice2Doc AI — Architecture

This document describes how the app is organized today (frontend demo) and how to grow it into a multi-tenant SaaS.

---

## 1. High-level system (today)

```mermaid
flowchart TB
  subgraph client [Browser SPA]
    Pages[Pages / Routes]
    Store[Zustand Stores]
    Services[Service Layer]
    Mock[Mock Adapters]
    Pages --> Store
    Pages --> Services
    Services --> Mock
    Store --> LocalStorage[(localStorage)]
  end
```

- **No backend required** for the demo.
- Services return mock data with realistic delays so UI can later call the same interfaces over HTTP.

---

## 2. Target system (upscale)

```mermaid
flowchart LR
  SPA[React SPA] --> API[API Gateway]
  API --> Auth[Auth Service]
  API --> Docs[Documents API]
  API --> Jobs[Job Queue]
  Jobs --> STT[Speech-to-Text]
  Jobs --> LLM[LLM Format]
  Docs --> DB[(Postgres)]
  Auth --> DB
  API --> Stripe[Stripe Webhooks]
  Jobs --> ObjectStore[Audio Object Storage]
```

| Component | Suggested stack |
|-----------|-----------------|
| API | Node (Nest/Fastify) or Python (FastAPI) |
| Auth | Clerk, Auth0, or Supabase Auth |
| DB | PostgreSQL |
| Queue | Redis + BullMQ / SQS |
| STT | Whisper API / Deepgram |
| LLM | OpenAI / Anthropic |
| Files | S3 / R2 |
| Billing | Stripe Checkout + Customer Portal |

---

## 3. Frontend module map

| Path | Responsibility |
|------|----------------|
| `src/pages/*` | Route-level screens; orchestration only |
| `src/components/*` | Reusable UI (AppShell, GlassCard, Waveform…) |
| `src/store/*` | Client state + persistence (auth, settings, docs/usage) |
| `src/services/*` | Side effects & remote I/O contracts |
| `src/config/*` | Env, plans, feature flags (single source of truth) |
| `src/lib/*` | Pure helpers: types, mock generation, trial math |

**Rule of thumb:** pages talk to stores + services; services own async work; config owns product rules (limits, plan perks).

---

## 4. Core user flows

### 4.1 Auth (demo)

```
Register/Login → useAuthStore → persist → ProtectedRoute → /app
```

Upscale: replace store login with `authService.login()` → JWT/session cookie → hydrate user + plan from API.

### 4.2 Voice → Document

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Record/Upload
  participant S as aiService
  participant Store as docsStore
  participant Ed as Editor

  U->>UI: Record or upload + config
  UI->>UI: canUseAiDocument check
  UI->>Store: setPendingConfig
  UI->>Ed: navigate /processing
  Ed->>S: processAudio mock stages
  S-->>Store: create document + consumeTrial
  Store-->>Ed: open editor/:id
```

Free plan: `trialsUsed < FREE_DOCUMENT_LIMIT` (10). Paid plans skip consumption checks for unlimited.

### 4.3 Billing (demo)

Plan lives in `useSettingsStore.plan`. Choosing Pro/Business unlocks unlimited AI docs immediately in the client.

Upscale: Stripe Checkout → webhook sets `users.plan` → SPA refetches entitlements.

---

## 5. Entitlements model

Centralized in `src/config/plans.ts`:

| Plan | AI documents | Notes |
|------|--------------|-------|
| Free | 10 lifetime (demo) | Enforce on server in production |
| Pro | Unlimited | Premium AI flags |
| Business | Unlimited | Team / API flags (future) |

Helpers: `src/lib/trials.ts` → `canUseAiDocument`, `trialsRemaining`.

**Production rule:** never trust the client for `trialsUsed`. Increment in a transaction after a successful job:

```sql
UPDATE users
SET trials_used = trials_used + 1
WHERE id = $1 AND plan = 'free' AND trials_used < trials_limit
RETURNING *;
```

If `RETURNING` is empty → return `402 Payment Required`.

---

## 6. Suggested database sketch

```text
users
  id, email, name, plan, trials_used, trials_limit, created_at

documents
  id, user_id, title, type, content, tone, language, favorite, created_at, updated_at

audio_assets
  id, user_id, storage_key, duration_sec, mime, created_at

jobs
  id, user_id, audio_id, status, stage, document_id, error, created_at, finished_at

subscriptions
  id, user_id, stripe_customer_id, stripe_sub_id, status, plan, current_period_end
```

---

## 7. Service layer contracts

Located under `src/services/`:

| Module | Methods (illustrative) |
|--------|------------------------|
| `authService` | `login`, `register`, `logout`, `getSession` |
| `documentService` | `list`, `get`, `create`, `update`, `remove` |
| `aiService` | `enqueueProcess`, `getJobStatus`, `transformText` |
| `billingService` | `getEntitlements`, `createCheckoutSession` |

Toggle via `VITE_USE_MOCK_API` in `.env`. When `false`, adapters should call `VITE_API_BASE_URL`.

---

## 8. Phased roadmap

### Phase 0 — Demo (complete)
- Full UX, mock AI, local entitlements

### Phase 1 — Real accounts (complete)
- Express API + SQLite + JWT
- Server-enforced free trial (`trials_used`)
- Documents CRUD + billing plan row
- Frontend: `VITE_USE_MOCK_API=false`

### Phase 2 — Real pipeline (complete)
- Multipart audio upload to `server/uploads`
- `jobs` + `audio_assets` tables; async worker
- Stages: Uploading → Transcribing → Understanding → Formatting → Finalizing
- Optional `OPENAI_API_KEY` for Whisper + GPT; otherwise mock STT/LLM with real job flow
- Client polls `GET /api/ai/jobs/:id`

### Phase 3 — Monetization (complete)
- Stripe Checkout for Pro/Business when `STRIPE_SECRET_KEY` + price IDs are set
- Webhook `POST /api/billing/webhook` syncs plan from subscription events
- Customer portal (`POST /api/billing/portal`)
- Without Stripe keys: local plan switch (dev/demo fallback)
- Success/cancel return URLs → `/app/billing?checkout=…`

### Phase 4 — Teams (complete)
- Workspaces with roles: owner / admin / member
- Invite by registered email; share documents into a workspace
- Document list includes personal + shared workspace docs
- Admin snapshot (member/doc counts) for owners & admins
- Create workspace requires Pro or Business plan

### Phase 5 — Integrations (complete)
- Providers: Zoom, Google Meet, Microsoft Teams, Notion, Google Docs
- Connect/disconnect (demo mode without vendor OAuth keys)
- OAuth redirect flow when client IDs/secrets are configured
- Import meeting → creates Meeting Notes draft
- Export document → Notion / Google Docs (demo URL or live Notion with `NOTION_INTERNAL_TOKEN`)
- UI: `/app/integrations` + editor Export menu

### Phase 6 — Localization & Studio Personalization (current)
**Unique product angle:** a “Studio Atelier” — users do not merely toggle dark mode; they compose a personal glass studio (accent + type + language) that re-skins the entire product, including marketing pages.

| Capability | Detail |
|------------|--------|
| Locales | `i18next` + `react-i18next`; catalogs `en`/`es`/`fr`/`de`/`ur`/`ar` under `src/i18n/locales/` |
| RTL | Urdu & Arabic set `html[dir=rtl]` + `lang` via `applyStudioTheme` (synced with `i18n.changeLanguage`) |
| Accent atelier | 6 curated palettes → CSS `--color-accent`, `--color-signal`, `--studio-*-rgb` |
| Typography | 6 display/body pairs → `--font-display`, `--font-sans` |
| Persistence | Zustand `v2d-settings` + `users.preferences_json` via `GET/PUT /api/preferences` |
| Surfaces wired | Public header/footer, landing hero, auth, app shell nav, Settings atelier |

### Phase 7 — Meeting Memory Graph (planned)
Build a cross-meeting knowledge graph unique to Voice2Doc:

- Speaker diarization labels attached to transcript segments
- Action-item extraction with owner + due-date candidates
- “Memory” view: open threads that span imported Zoom/Meet/Teams sessions
- Deduplicate recurring decisions (“same decision, new meeting”)
- API sketch: `GET /api/memory/threads`, `POST /api/memory/link`

### Phase 8 — Document Atelier (planned)
Turn exports into brand-faithful artifacts (not generic PDF dumps):

- Per-workspace **brand kit** (logo, accent inherited from Phase 6, letterhead)
- **Tone DNA** — reusable voice profiles (“Board brief”, “Customer email”) applied at job config time
- Template studio with live preview using selected typography pair
- Honest PDF/DOCX exporters replacing stub toasts
- API sketch: `CRUD /api/brand-kits`, `CRUD /api/tone-profiles`

### Phase 9 — Live Studio Collab (planned)
Collaboration anchored to *voice time*, not just document paragraphs:

- Presence avatars in the editor
- Comments pinned to transcript timestamps (and mirrored into the formatted doc)
- Shared workspace editing with conflict-safe saves
- Optional live listen-along while a teammate records
- API sketch: WebSocket `/ws/collab/:documentId`, `CRUD /api/comments`

### Phase 10 — Trust & Compliance Vault (planned)
Enterprise trust without losing Studio Glass clarity:

- Retention policies (auto-delete audio after N days; keep docs)
- Immutable audit log for exports, imports, and preference changes
- Region / residency hint for future multi-region storage
- Data export & account wipe endpoints
- API sketch: `GET /api/audit`, `PUT /api/compliance/policy`

### Phase 11 — Studio AI Chatbot (planned)
An in-product assistant that lives in the Studio Glass shell — not a generic widget:

- Floating studio chat with accent/typography inherited from Phase 6 preferences
- Context modes: **Help** (product FAQs), **Document** (ask about the open draft/transcript), **Meeting** (summarize action items from Memory Graph)
- Streaming replies via existing AI job worker patterns; cite transcript timestamps when answering from audio
- Optional tools: “insert reply into editor”, “create Meeting Notes draft”, “open Help Center article”
- Respect privacy analytics toggle + future compliance retention (no chat logs when opted out)
- API sketch: `POST /api/chat/sessions`, `POST /api/chat/sessions/:id/messages` (SSE), `GET /api/chat/sessions`

### Public legal & support surfaces
- `/privacy` — Privacy Policy (collection, audio, integrations, rights)
- `/help` — Help Center (topics + FAQ, including Phase 11 chatbot preview note)

---

## 9. Non-functional targets (when upscaling)

| Area | Target |
|------|--------|
| API latency (non-AI) | p95 &lt; 300ms |
| Job feedback | Stage updates ≤ 2s |
| Security | Auth on every mutation; signed upload URLs |
| Observability | Request IDs, job traces, error tracking |
| Cost control | Cap concurrent jobs per free user |

---

## 10. Design constraints to keep

- Studio Glass identity (not generic purple SaaS)
- One primary action per screen
- Honest stubs (e.g. PDF export toast) until real exporters ship
- Phase 6 accents stay warm/neutral (amber, teal, clay, brass, sage, copper) — never default purple glow
