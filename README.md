# Voice2Doc AI

**Turn voice notes into professional documents in seconds.**

Phase 2 upscale: audio upload → job queue → STT → LLM formatting → polled progress.  
Phase 1 auth (JWT + SQLite + free trial enforcement) is included.

---

## Quick start

```bash
cd voice2doc-ai
npm install
npm run dev
```

| Process | URL |
|---------|-----|
| Web | `http://localhost:5173` (or next free port) |
| API | `http://localhost:3001` |

| Script | Purpose |
|--------|---------|
| `npm run dev` | Web + API |
| `npm run server` | API only |
| `npm run build` | Frontend production build |

### Environment

**Root `.env`**
```
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:3001/api
```

**`server/.env`**
```
PORT=3001
JWT_SECRET=change-me
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# Optional — enables real Whisper + GPT formatting
# OPENAI_API_KEY=sk-...
```

Without `OPENAI_API_KEY`, the pipeline still runs end-to-end with **mock STT/LLM** (audio is stored and stages are real).

---

## Phase 2 pipeline

```
Record/Upload → POST /api/ai/jobs (multipart audio + config)
             → job queued (SQLite)
             → Uploading → Transcribing → Understanding → Formatting → Finalizing
             → GET /api/ai/jobs/:id (poll)
             → document saved + trial consumed
```

Audio files land in `server/uploads/` (gitignored). Job rows live in SQLite (`jobs`, `audio_assets`).

---

## Phase checklist

| Phase | Status |
|-------|--------|
| 0 Demo UI | Done |
| 1 Real accounts + trial enforcement | Done |
| 2 Audio jobs + STT/LLM pipeline | **Current** |
| 3 Stripe | Next |
| 4 Teams | Planned |
| 5 Integrations | Planned |

Details: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Design

Studio Glass — amber `#C47B2D`, Fraunces + DM Sans, frosted panels.
