/** Pure Studio Recipes helpers for the API (Phase 16). */

export type RecipeTrigger = 'job.completed' | 'echo.low' | 'memory.ingested' | 'manual'

export type RecipeAction = 'pulse.refresh' | 'echo.recompute' | 'audit.log'

export interface RecipeTriggerConfig {
  echoThreshold?: number
}

export interface StudioRecipeInput {
  name: string
  enabled?: boolean
  trigger: RecipeTrigger
  triggerConfig?: RecipeTriggerConfig
  actions: RecipeAction[]
}

export interface StudioRecipe extends StudioRecipeInput {
  id: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type RecipeEventType = RecipeTrigger

export interface RecipeEvent {
  type: RecipeEventType
  documentId?: string
  jobId?: string
  score?: number
  meetingId?: string
}

export interface RecipeExecutionStep {
  action: RecipeAction
  reason: string
}

const VALID_TRIGGERS = new Set<RecipeTrigger>([
  'job.completed',
  'echo.low',
  'memory.ingested',
  'manual',
])

const VALID_ACTIONS = new Set<RecipeAction>(['pulse.refresh', 'echo.recompute', 'audit.log'])

const DEFAULT_ECHO_THRESHOLD = 70

export function validateRecipe(input: StudioRecipeInput): string | null {
  if (!input.name.trim()) return 'Recipe name is required'
  if (!VALID_TRIGGERS.has(input.trigger)) return 'Invalid trigger'
  if (!input.actions.length) return 'At least one action is required'
  if (input.actions.length > 5) return 'Too many actions (max 5)'
  for (const action of input.actions) {
    if (!VALID_ACTIONS.has(action)) return `Invalid action: ${action}`
  }
  const threshold = input.triggerConfig?.echoThreshold
  if (threshold !== undefined && (threshold < 0 || threshold > 100)) {
    return 'Echo threshold must be between 0 and 100'
  }
  return null
}

export function matchRecipes(recipes: StudioRecipe[], event: RecipeEvent): StudioRecipe[] {
  if (event.type === 'manual') return []
  return recipes.filter((recipe) => {
    if (!recipe.enabled || recipe.trigger !== event.type) return false
    if (event.type === 'echo.low') {
      const threshold = recipe.triggerConfig?.echoThreshold ?? DEFAULT_ECHO_THRESHOLD
      return typeof event.score === 'number' && event.score < threshold
    }
    return true
  })
}

export function buildExecutionPlan(
  recipe: StudioRecipe,
  event: RecipeEvent,
): RecipeExecutionStep[] {
  const steps: RecipeExecutionStep[] = []
  for (const action of recipe.actions) {
    if (action === 'echo.recompute' && !event.documentId) continue
    steps.push({
      action,
      reason: `${recipe.name} · ${event.type}`,
    })
  }
  return steps
}

export const STARTER_RECIPES: StudioRecipeInput[] = [
  {
    name: 'Finish → Echo + Pulse',
    enabled: true,
    trigger: 'job.completed',
    actions: ['echo.recompute', 'pulse.refresh', 'audit.log'],
  },
  {
    name: 'Low Echo alert',
    enabled: true,
    trigger: 'echo.low',
    triggerConfig: { echoThreshold: 70 },
    actions: ['audit.log', 'pulse.refresh'],
  },
  {
    name: 'Meeting import refresh',
    enabled: true,
    trigger: 'memory.ingested',
    actions: ['pulse.refresh', 'audit.log'],
  },
]
