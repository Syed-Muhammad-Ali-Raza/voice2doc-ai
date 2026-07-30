# Voice2Doc AI

**Turn voice notes into professional documents in seconds.**

**Phase 4 (current):** Team workspaces, roles, and shared documents.

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
| 0 Demo UI | Done |
| 1 Auth + 10 free AI docs | Done |
| 2 Audio jobs + STT/LLM | Done |
| 3 Stripe billing | Done |
| **4 Teams / workspaces** | **Current** |
| 5 Integrations | Next |

---

## Phase 4 — Teams

1. Upgrade to **Pro** or **Business** (Billing).
2. Open **Workspaces** → create a team.
3. Invite members by email (they must already have an account).
4. On **Documents**, use Share → pick a workspace.
5. Teammates see shared docs in their library and under the workspace.

### Roles

| Role | Can |
|------|-----|
| Owner | Everything + delete workspace |
| Admin | Invite/remove members, admin stats |
| Member | View/edit shared docs |

### API

| Method | Path |
|--------|------|
| GET/POST | `/api/workspaces` |
| GET/PATCH/DELETE | `/api/workspaces/:id` |
| GET/POST | `/api/workspaces/:id/members` |
| GET | `/api/workspaces/:id/documents` |
| GET | `/api/workspaces/:id/admin` |
| POST | `/api/documents/:id/share` |

---

## Docs

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.
