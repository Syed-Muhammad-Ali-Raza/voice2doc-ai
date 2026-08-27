import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

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
import { migrateAtelierTables } from './lib/atelier.js'
import { atelierRouter } from './routes/atelier.js'
import { migrateCollabTables } from './lib/collab.js'
import { attachCollabWebSocket } from './ws/collabHub.js'
import { migrateChatTables } from './lib/chat.js'
import { chatRouter } from './routes/chat.js'
import { migrateEchoTables } from './lib/echo.js'
import { echoRouter } from './routes/echo.js'
import { migrateVoiceTwinTables } from './lib/voiceTwin.js'
import { voiceTwinRouter } from './routes/voiceTwin.js'
import { migrateComplianceTables } from './lib/compliance.js'
import { complianceRouter } from './routes/compliance.js'
import { pulseRouter } from './routes/pulse.js'
import { migrateRecipeTables } from './lib/studioRecipes.js'
import { recipesRouter } from './routes/recipes.js'
import { workspacesRouter } from './routes/workspaces.js'

migrateBillingColumns()
migrateTeamsColumns()
migrateIntegrationsColumns()
migratePreferencesColumn()
migrateMemoryTables()
migrateAtelierTables()
migrateCollabTables()
migrateChatTables()
migrateEchoTables()
migrateVoiceTwinTables()
migrateComplianceTables()
migrateRecipeTables()

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
    phase: 16,
    openai: Boolean(process.env.OPENAI_API_KEY),
    stripe: isStripeConfigured(),
    teams: true,
    integrations: true,
    preferences: true,
    memory: true,
    atelier: true,
    collab: true,
    chat: true,
    echo: true,
    voiceTwin: true,
    compliance: true,
    pulse: true,
    recipes: true,
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
app.use('/api/atelier', atelierRouter)
app.use('/api/chat', chatRouter)
app.use('/api/echo', echoRouter)
app.use('/api/voice-twins', voiceTwinRouter)
app.use('/api/compliance', complianceRouter)
app.use('/api/pulse', pulseRouter)
app.use('/api/recipes', recipesRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const message = err instanceof Error ? err.message : 'Internal error'
  res.status(500).json({ error: message })
})

const server = http.createServer(app)
attachCollabWebSocket(server)

server.listen(PORT, () => {
  console.log(
    `Voice2Doc API listening on http://localhost:${PORT} (phase 16, collab ws=/ws/collab, stripe=${isStripeConfigured()})`,
  )
})
