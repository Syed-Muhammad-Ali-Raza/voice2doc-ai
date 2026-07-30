# Voice2Doc AI

**Turn voice notes into professional documents in seconds.**

**Phase 5 (current):** Integrations — Zoom, Google Meet, Microsoft Teams, Notion, Google Docs.

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

| Phase | Status |
|-------|--------|
| 0–4 | Done (UI, auth, jobs, Stripe, teams) |
| **5 Integrations** | **Current** |

---

## Phase 5 — Integrations

Open **Integrations** in the sidebar:

1. **Connect** Zoom / Meet / Teams / Notion / Google Docs (works in demo mode without keys).
2. **Import meeting** → creates a Meeting Notes draft.
3. In the **editor**, Export → **Send to Notion / Google Docs**.

### Optional OAuth / live export (`server/.env`)

```env
APP_URL=http://localhost:5173
API_PUBLIC_URL=http://localhost:3001

# Zoom
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=

# Google (Meet + Docs)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft Teams
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Notion OAuth
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=

# Optional live Notion page create
NOTION_INTERNAL_TOKEN=
NOTION_PARENT_PAGE_ID=
```

Without these, Connect uses **demo mode** and still stores connection state in SQLite.

### API

| Method | Path |
|--------|------|
| GET | `/api/integrations` |
| POST | `/api/integrations/:provider/connect` |
| GET | `/api/integrations/:provider/callback` |
| DELETE | `/api/integrations/:provider` |
| POST | `/api/integrations/:provider/export` |
| POST | `/api/integrations/:provider/import-meeting` |

---

## Docs

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.
