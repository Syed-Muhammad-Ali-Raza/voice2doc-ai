import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })
dotenv.config() // also allow root .env overrides

import cors from 'cors'
import express from 'express'
import { authRouter } from './routes/auth.js'
import { billingRouter } from './routes/billing.js'
import { documentsRouter } from './routes/documents.js'
import { aiRouter } from './routes/ai.js'
import { requireAuth } from './middleware/auth.js'

const PORT = Number(process.env.PORT || 3001)
const app = express()

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'voice2doc-api',
    phase: 2,
    openai: Boolean(process.env.OPENAI_API_KEY),
  })
})

app.use('/api/auth', authRouter)
app.use('/api/billing', requireAuth, billingRouter)
app.use('/api/documents', requireAuth, documentsRouter)
app.use('/api/ai', requireAuth, aiRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const message = err instanceof Error ? err.message : 'Internal error'
  res.status(500).json({ error: message })
})

app.listen(PORT, () => {
  console.log(`Voice2Doc API listening on http://localhost:${PORT}`)
})
