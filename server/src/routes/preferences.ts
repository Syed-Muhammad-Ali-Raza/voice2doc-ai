import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

export const preferencesRouter = Router()

const prefsSchema = z.object({
  locale: z.enum(['en', 'es', 'fr', 'de', 'ur', 'ar']).optional(),
  darkMode: z.boolean().optional(),
  accentId: z
    .enum([
      'studio-amber',
      'harbor-teal',
      'ember-clay',
      'brass-ink',
      'coastal-sage',
      'copper-dusk',
    ])
    .optional(),
  typographyId: z
    .enum([
      'fraunces-dm',
      'literata-figtree',
      'newsreader-source',
      'syne-outfit',
      'baskerville-karla',
      'bricolage-manrope',
    ])
    .optional(),
  notifications: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  privacyAnalytics: z.boolean().optional(),
})

export type StudioPreferences = z.infer<typeof prefsSchema> & {
  locale: string
  darkMode: boolean
  accentId: string
  typographyId: string
  notifications: boolean
  autoSave: boolean
  privacyAnalytics: boolean
}

export const DEFAULT_PREFERENCES: StudioPreferences = {
  locale: 'en',
  darkMode: false,
  accentId: 'studio-amber',
  typographyId: 'fraunces-dm',
  notifications: true,
  autoSave: true,
  privacyAnalytics: false,
}

export function migratePreferencesColumn() {
  const cols = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>
  const names = new Set(cols.map((c) => c.name))
  if (!names.has('preferences_json')) {
    db.exec(`ALTER TABLE users ADD COLUMN preferences_json TEXT`)
  }
}

function readPrefs(userId: string): StudioPreferences {
  const row = db.prepare('SELECT preferences_json FROM users WHERE id = ?').get(userId) as
    | { preferences_json: string | null }
    | undefined
  if (!row?.preferences_json) return { ...DEFAULT_PREFERENCES }
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(row.preferences_json) }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

function writePrefs(userId: string, prefs: StudioPreferences) {
  db.prepare('UPDATE users SET preferences_json = ? WHERE id = ?').run(JSON.stringify(prefs), userId)
}

preferencesRouter.get('/', requireAuth, (req: AuthedRequest, res) => {
  res.json(readPrefs(req.user!.sub))
})

preferencesRouter.put('/', requireAuth, (req: AuthedRequest, res) => {
  const parsed = prefsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid preferences payload' })
    return
  }
  const next = { ...readPrefs(req.user!.sub), ...parsed.data }
  writePrefs(req.user!.sub, next)
  res.json(next)
})
