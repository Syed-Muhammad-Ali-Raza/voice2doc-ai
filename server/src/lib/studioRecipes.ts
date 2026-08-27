import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { writeAudit } from './compliance.js'
import { recomputeEchoScore } from './echo.js'
import { refreshStudioPulse } from './studioPulse.js'
import {
  buildExecutionPlan,
  matchRecipes,
  STARTER_RECIPES,
  validateRecipe,
  type RecipeAction,
  type RecipeEvent,
  type StudioRecipe,
  type StudioRecipeInput,
} from './studioRecipesGraph.js'

export type RecipeRunStatus = 'success' | 'partial' | 'failed'

export interface RecipeRun {
  id: string
  recipeId: string
  recipeName: string
  trigger: string
  status: RecipeRunStatus
  results: Array<{ action: RecipeAction; ok: boolean; detail?: string }>
  createdAt: string
}

export function migrateRecipeTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS studio_recipes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      trigger TEXT NOT NULL,
      trigger_config_json TEXT,
      actions_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipe_runs (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL REFERENCES studio_recipes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      trigger TEXT NOT NULL,
      status TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_studio_recipes_user ON studio_recipes(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_recipe_runs_user ON recipe_runs(user_id, created_at DESC);
  `)
}

function mapRow(row: {
  id: string
  name: string
  enabled: number
  trigger: string
  trigger_config_json: string | null
  actions_json: string
  created_at: string
  updated_at: string
}): StudioRecipe {
  return {
    id: row.id,
    name: row.name,
    enabled: Boolean(row.enabled),
    trigger: row.trigger as StudioRecipe['trigger'],
    triggerConfig: row.trigger_config_json
      ? (JSON.parse(row.trigger_config_json) as StudioRecipe['triggerConfig'])
      : undefined,
    actions: JSON.parse(row.actions_json) as StudioRecipe['actions'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function ensureStarterRecipes(userId: string) {
  const count = db
    .prepare(`SELECT COUNT(*) AS c FROM studio_recipes WHERE user_id = ?`)
    .get(userId) as { c: number }
  if (count.c > 0) return

  const now = new Date().toISOString()
  const insert = db.prepare(
    `INSERT INTO studio_recipes (id, user_id, name, enabled, trigger, trigger_config_json, actions_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const starter of STARTER_RECIPES) {
    insert.run(
      uuid(),
      userId,
      starter.name,
      starter.enabled === false ? 0 : 1,
      starter.trigger,
      starter.triggerConfig ? JSON.stringify(starter.triggerConfig) : null,
      JSON.stringify(starter.actions),
      now,
      now,
    )
  }
}

export function listRecipes(userId: string): StudioRecipe[] {
  ensureStarterRecipes(userId)
  const rows = db
    .prepare(
      `SELECT id, name, enabled, trigger, trigger_config_json, actions_json, created_at, updated_at
       FROM studio_recipes WHERE user_id = ? ORDER BY updated_at DESC`,
    )
    .all(userId) as Array<{
    id: string
    name: string
    enabled: number
    trigger: string
    trigger_config_json: string | null
    actions_json: string
    created_at: string
    updated_at: string
  }>
  return rows.map(mapRow)
}

export function getRecipe(userId: string, recipeId: string): StudioRecipe | null {
  const row = db
    .prepare(
      `SELECT id, name, enabled, trigger, trigger_config_json, actions_json, created_at, updated_at
       FROM studio_recipes WHERE id = ? AND user_id = ?`,
    )
    .get(recipeId, userId) as
    | {
        id: string
        name: string
        enabled: number
        trigger: string
        trigger_config_json: string | null
        actions_json: string
        created_at: string
        updated_at: string
      }
    | undefined
  return row ? mapRow(row) : null
}

export function createRecipe(userId: string, input: StudioRecipeInput): StudioRecipe {
  const error = validateRecipe(input)
  if (error) throw new Error(error)

  const id = uuid()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO studio_recipes (id, user_id, name, enabled, trigger, trigger_config_json, actions_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.name.trim(),
    input.enabled === false ? 0 : 1,
    input.trigger,
    input.triggerConfig ? JSON.stringify(input.triggerConfig) : null,
    JSON.stringify(input.actions),
    now,
    now,
  )
  writeAudit(userId, 'recipe.created', { resourceType: 'recipe', resourceId: id, meta: { trigger: input.trigger } })
  return getRecipe(userId, id)!
}

export function updateRecipe(
  userId: string,
  recipeId: string,
  patch: Partial<StudioRecipeInput>,
): StudioRecipe | null {
  const existing = getRecipe(userId, recipeId)
  if (!existing) return null

  const next: StudioRecipeInput = {
    name: patch.name ?? existing.name,
    enabled: patch.enabled ?? existing.enabled,
    trigger: patch.trigger ?? existing.trigger,
    triggerConfig: patch.triggerConfig ?? existing.triggerConfig,
    actions: patch.actions ?? existing.actions,
  }
  const error = validateRecipe(next)
  if (error) throw new Error(error)

  const now = new Date().toISOString()
  db.prepare(
    `UPDATE studio_recipes SET name = ?, enabled = ?, trigger = ?, trigger_config_json = ?, actions_json = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    next.name.trim(),
    next.enabled === false ? 0 : 1,
    next.trigger,
    next.triggerConfig ? JSON.stringify(next.triggerConfig) : null,
    JSON.stringify(next.actions),
    now,
    recipeId,
    userId,
  )
  writeAudit(userId, 'recipe.updated', { resourceType: 'recipe', resourceId: recipeId })
  return getRecipe(userId, recipeId)
}

export function deleteRecipe(userId: string, recipeId: string): boolean {
  const result = db.prepare(`DELETE FROM studio_recipes WHERE id = ? AND user_id = ?`).run(recipeId, userId)
  if (result.changes > 0) {
    writeAudit(userId, 'recipe.deleted', { resourceType: 'recipe', resourceId: recipeId })
    return true
  }
  return false
}

async function executeAction(
  userId: string,
  action: RecipeAction,
  event: RecipeEvent,
  recipeName: string,
): Promise<{ ok: boolean; detail?: string }> {
  try {
    switch (action) {
      case 'pulse.refresh':
        refreshStudioPulse(userId)
        return { ok: true, detail: 'Pulse refreshed' }
      case 'echo.recompute': {
        if (!event.documentId) return { ok: false, detail: 'Missing documentId' }
        const record = recomputeEchoScore(userId, event.documentId)
        return record
          ? { ok: true, detail: `Echo score ${record.score}` }
          : { ok: false, detail: 'Document not found' }
      }
      case 'audit.log':
        writeAudit(userId, 'recipe.action', {
          meta: {
            recipe: recipeName,
            trigger: event.type,
            documentId: event.documentId,
            score: event.score,
            meetingId: event.meetingId,
          },
        })
        return { ok: true, detail: 'Audit logged' }
      default:
        return { ok: false, detail: 'Unknown action' }
    }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'Action failed' }
  }
}

function recordRun(
  userId: string,
  recipe: StudioRecipe,
  event: RecipeEvent,
  results: Array<{ action: RecipeAction; ok: boolean; detail?: string }>,
): RecipeRun {
  const okCount = results.filter((r) => r.ok).length
  const status: RecipeRunStatus =
    okCount === results.length ? 'success' : okCount === 0 ? 'failed' : 'partial'
  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO recipe_runs (id, recipe_id, user_id, trigger, status, result_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, recipe.id, userId, event.type, status, JSON.stringify(results), now)

  writeAudit(userId, 'recipe.run', {
    resourceType: 'recipe',
    resourceId: recipe.id,
    meta: { trigger: event.type, status, actions: results.length },
  })

  return {
    id,
    recipeId: recipe.id,
    recipeName: recipe.name,
    trigger: event.type,
    status,
    results,
    createdAt: now,
  }
}

export async function runRecipe(userId: string, recipeId: string, event: RecipeEvent): Promise<RecipeRun | null> {
  const recipe = getRecipe(userId, recipeId)
  if (!recipe) return null
  if (!recipe.enabled && event.type !== 'manual') return null

  const plan = buildExecutionPlan(recipe, event)
  const results: Array<{ action: RecipeAction; ok: boolean; detail?: string }> = []
  for (const step of plan) {
    results.push(await executeAction(userId, step.action, event, recipe.name))
  }
  return recordRun(userId, recipe, event, results)
}

export async function dispatchRecipeEvent(userId: string, event: RecipeEvent): Promise<void> {
  try {
    ensureStarterRecipes(userId)
    const recipes = listRecipes(userId)
    const matched = matchRecipes(recipes, event)
    for (const recipe of matched) {
      await runRecipe(userId, recipe.id, event)
    }
  } catch (err) {
    console.error('Recipe dispatch failed', err)
  }
}

export function listRecipeRuns(userId: string, limit = 50): RecipeRun[] {
  const rows = db
    .prepare(
      `SELECT r.id, r.recipe_id, r.trigger, r.status, r.result_json, r.created_at, s.name AS recipe_name
       FROM recipe_runs r
       INNER JOIN studio_recipes s ON s.id = r.recipe_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ?`,
    )
    .all(userId, Math.min(200, Math.max(1, limit))) as Array<{
    id: string
    recipe_id: string
    trigger: string
    status: string
    result_json: string
    created_at: string
    recipe_name: string
  }>

  return rows.map((row) => ({
    id: row.id,
    recipeId: row.recipe_id,
    recipeName: row.recipe_name,
    trigger: row.trigger,
    status: row.status as RecipeRunStatus,
    results: JSON.parse(row.result_json) as RecipeRun['results'],
    createdAt: row.created_at,
  }))
}

export async function runRecipeManual(userId: string, recipeId: string): Promise<RecipeRun | null> {
  const recipe = getRecipe(userId, recipeId)
  if (!recipe) return null
  return runRecipe(userId, recipeId, { type: 'manual' })
}
