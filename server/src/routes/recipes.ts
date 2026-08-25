import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import {
  createRecipe,
  deleteRecipe,
  listRecipeRuns,
  listRecipes,
  runRecipeManual,
  updateRecipe,
} from '../lib/studioRecipes.js'

const recipeBody = z.object({
  name: z.string().min(1).max(120),
  enabled: z.boolean().optional(),
  trigger: z.enum(['job.completed', 'echo.low', 'memory.ingested', 'manual']),
  triggerConfig: z.object({ echoThreshold: z.number().min(0).max(100).optional() }).optional(),
  actions: z
    .array(z.enum(['pulse.refresh', 'echo.recompute', 'audit.log']))
    .min(1)
    .max(5),
})

export const recipesRouter = Router()

recipesRouter.get('/runs', requireAuth, (req: AuthedRequest, res) => {
  const limit = Number(req.query.limit || 50)
  res.json({ runs: listRecipeRuns(req.user!.sub, Number.isFinite(limit) ? limit : 50) })
})

recipesRouter.get('/', requireAuth, (req: AuthedRequest, res) => {
  res.json({ recipes: listRecipes(req.user!.sub) })
})

recipesRouter.post('/', requireAuth, (req: AuthedRequest, res) => {
  const parsed = recipeBody.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid recipe payload' })
    return
  }
  try {
    const recipe = createRecipe(req.user!.sub, parsed.data)
    res.status(201).json(recipe)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create recipe' })
  }
})

recipesRouter.patch('/:id', requireAuth, (req: AuthedRequest, res) => {
  const parsed = recipeBody.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid recipe patch' })
    return
  }
  try {
    const recipe = updateRecipe(req.user!.sub, req.params.id as string, parsed.data)
    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' })
      return
    }
    res.json(recipe)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not update recipe' })
  }
})

recipesRouter.delete('/:id', requireAuth, (req: AuthedRequest, res) => {
  const ok = deleteRecipe(req.user!.sub, req.params.id as string)
  if (!ok) {
    res.status(404).json({ error: 'Recipe not found' })
    return
  }
  res.json({ ok: true })
})

recipesRouter.post('/:id/run', requireAuth, async (req: AuthedRequest, res) => {
  const run = await runRecipeManual(req.user!.sub, req.params.id as string)
  if (!run) {
    res.status(404).json({ error: 'Recipe not found' })
    return
  }
  res.json(run)
})
