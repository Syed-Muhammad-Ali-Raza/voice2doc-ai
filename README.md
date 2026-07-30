# Voice2Doc AI

**Turn voice notes into professional documents in seconds.**

**Phase 3 (current):** Stripe Checkout + webhooks for paid plans, with local billing fallback when Stripe isn’t configured.

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

## Phase overview

| Phase | Status |
|-------|--------|
| 0 Demo UI | Done |
| 1 Auth + free trial (10 docs) | Done |
| 2 Audio jobs + STT/LLM pipeline | Done |
| **3 Stripe billing** | **Current** |
| 4 Teams | Next |
| 5 Integrations | Planned |

---

## Stripe setup (Phase 3)

1. Create Products/Prices in [Stripe Dashboard](https://dashboard.stripe.com) (Pro $19/mo, Business $49/mo).
2. Add to `server/.env`:

```env
APP_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Forward webhooks locally:

```bash
stripe listen --forward-to localhost:3001/api/billing/webhook
```

4. Restart `npm run server`. Health should show `"stripe": true`.

**Without Stripe keys**, Billing still works in **local mode** (instant plan switch for demos).

---

## API (billing)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/billing/config` | Public — is Stripe enabled? |
| GET | `/api/billing/entitlements` | Auth — plan + trials + stripe status |
| POST | `/api/billing/checkout` | Auth — Checkout URL or local switch |
| POST | `/api/billing/portal` | Auth — Customer portal |
| POST | `/api/billing/webhook` | Stripe signature — raw body |

---

## Docs

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for full system design.
