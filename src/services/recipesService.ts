import { env } from '../config/env'
import { apiFetch } from '../lib/apiClient'
import {
  STARTER_RECIPES,
  type RecipeAction,
  type RecipeTrigger,
  type StudioRecipe,
} from '../lib/studioRecipes'

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

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

export interface CreateRecipeInput {
  name: string
  enabled?: boolean
  trigger: RecipeTrigger
  triggerConfig?: { echoThreshold?: number }
  actions: RecipeAction[]
}

let mockRecipes: StudioRecipe[] = STARTER_RECIPES.map((r, i) => ({
  ...r,
  id: `mock-recipe-${i + 1}`,
  enabled: r.enabled ?? true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}))

let mockRuns: RecipeRun[] = []

export const recipesService = {
  async list(): Promise<{ recipes: StudioRecipe[] }> {
    if (env.useMockApi) return { recipes: mockRecipes }
    return apiFetch('/recipes', {}, base())
  },

  async listRuns(limit = 50): Promise<{ runs: RecipeRun[] }> {
    if (env.useMockApi) return { runs: mockRuns.slice(0, limit) }
    return apiFetch(`/recipes/runs?limit=${limit}`, {}, base())
  },

  async create(input: CreateRecipeInput): Promise<StudioRecipe> {
    if (env.useMockApi) {
      const recipe: StudioRecipe = {
        ...input,
        id: `mock-recipe-${Date.now()}`,
        enabled: input.enabled ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockRecipes = [recipe, ...mockRecipes]
      return recipe
    }
    return apiFetch('/recipes', { method: 'POST', body: JSON.stringify(input) }, base())
  },

  async update(id: string, patch: Partial<CreateRecipeInput>): Promise<StudioRecipe> {
    if (env.useMockApi) {
      mockRecipes = mockRecipes.map((r) =>
        r.id === id
          ? { ...r, ...patch, updatedAt: new Date().toISOString() }
          : r,
      )
      const recipe = mockRecipes.find((r) => r.id === id)
      if (!recipe) throw new Error('Recipe not found')
      return recipe
    }
    return apiFetch(`/recipes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, base())
  },

  async remove(id: string): Promise<void> {
    if (env.useMockApi) {
      mockRecipes = mockRecipes.filter((r) => r.id !== id)
      return
    }
    await apiFetch(`/recipes/${id}`, { method: 'DELETE' }, base())
  },

  async run(id: string): Promise<RecipeRun> {
    if (env.useMockApi) {
      const recipe = mockRecipes.find((r) => r.id === id)
      if (!recipe) throw new Error('Recipe not found')
      const run: RecipeRun = {
        id: `mock-run-${Date.now()}`,
        recipeId: id,
        recipeName: recipe.name,
        trigger: 'manual',
        status: 'success',
        results: recipe.actions.map((action) => ({ action, ok: true })),
        createdAt: new Date().toISOString(),
      }
      mockRuns = [run, ...mockRuns]
      return run
    }
    return apiFetch(`/recipes/${id}/run`, { method: 'POST' }, base())
  },
}

export type { StudioRecipe, RecipeAction, RecipeTrigger }
