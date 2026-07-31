import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })
dotenv.config()

import cors from 'cors'
import express from 'express'
import { authRouter } from './routes/auth.js'
import { billingRouter, handleStripeWebhook } from './routes/billing.js'
import { documentsRouter } from './routes/documents.js'
import { aiRouter } from './routes/ai.js'
import { integrationsOauthCallback, integrationsRouter } from './routes/integrations.js'
import { requireAuth } from './middleware/auth.js'
import { isStripeConfigured, migrateBillingColumns } from './lib/stripe.js'
import { migrateTeamsColumns } from './lib/teams.js'
import { migrateIntegrationsColumns } from './lib/integrations.js'
import { migratePreferencesColumn, preferencesRouter } from './routes/preferences.js'
import { migrateMemoryTables } from './lib/memory.js'
import { memoryRouter } from './routes/memory.js'
import { workspacesRouter } from './routes/workspaces.js'

migrateBillingColumns()
migrateTeamsColumns()
migrateIntegrationsColumns()
migratePreferencesColumn()
migrateMemoryTables()

const PORT = Number(process.env.PORT || 3001)
const app = express()

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ],
    credentials: true,
  }),
)

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const result = await handleStripeWebhook(
      req.body as Buffer,
      req.headers['stripe-signature'] as string | undefined,
    )
    res.json(result)
  } catch (err) {
    console.error('Webhook error', err)
    res.status(400).json({ error: err instanceof Error ? err.message : 'Webhook failed' })
  }
})

app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'voice2doc-api',
    phase: 7,
    openai: Boolean(process.env.OPENAI_API_KEY),
    stripe: isStripeConfigured(),
    teams: true,
    integrations: true,
    preferences: true,
    memory: true,
  })
})

app.use('/api/auth', authRouter)
app.get('/api/billing/config', (_req, res) => {
  res.json({
    stripeEnabled: isStripeConfigured(),
    pricesConfigured: {
      pro: Boolean(process.env.STRIPE_PRICE_PRO),
      business: Boolean(process.env.STRIPE_PRICE_BUSINESS),
    },
  })
})
app.get('/api/integrations/:provider/callback', integrationsOauthCallback)
app.use('/api/billing', requireAuth, billingRouter)
app.use('/api/workspaces', requireAuth, workspacesRouter)
app.use('/api/documents', requireAuth, documentsRouter)
app.use('/api/ai', requireAuth, aiRouter)
app.use('/api/integrations', requireAuth, integrationsRouter)
app.use('/api/preferences', preferencesRouter)
app.use('/api/memory', memoryRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const message = err instanceof Error ? err.message : 'Internal error'
  res.status(500).json({ error: message })
})

app.listen(PORT, () => {
  console.log(`Voice2Doc API listening on http://localhost:${PORT} (phase 7, stripe=${isStripeConfigured()})`)
})
