import { describe, expect, it } from 'vitest'
import {
  buildExecutionPlan,
  matchRecipes,
  validateRecipe,
  type StudioRecipe,
} from './studioRecipes'

const baseRecipe = (overrides: Partial<StudioRecipe>): StudioRecipe => ({
  id: 'r1',
  name: 'Test',
  enabled: true,
  trigger: 'job.completed',
  actions: ['pulse.refresh'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('validateRecipe', () => {
  it('accepts a valid recipe', () => {
    expect(
      validateRecipe({
        name: 'Finish flow',
        trigger: 'job.completed',
        actions: ['pulse.refresh', 'audit.log'],
      }),
    ).toBeNull()
  })

  it('rejects empty name and actions', () => {
    expect(validateRecipe({ name: '', trigger: 'manual', actions: [] })).toBe('Recipe name is required')
    expect(validateRecipe({ name: 'X', trigger: 'manual', actions: [] })).toBe(
      'At least one action is required',
    )
  })

  it('rejects bad echo threshold', () => {
    expect(
      validateRecipe({
        name: 'Low',
        trigger: 'echo.low',
        triggerConfig: { echoThreshold: 120 },
        actions: ['audit.log'],
      }),
    ).toBe('Echo threshold must be between 0 and 100')
  })
})

describe('matchRecipes', () => {
  it('matches enabled recipes by trigger', () => {
    const recipes = [
      baseRecipe({ id: 'a', trigger: 'job.completed' }),
      baseRecipe({ id: 'b', trigger: 'echo.low', triggerConfig: { echoThreshold: 70 } }),
      baseRecipe({ id: 'c', enabled: false, trigger: 'job.completed' }),
    ]
    const matched = matchRecipes(recipes, { type: 'job.completed', documentId: 'd1' })
    expect(matched.map((r) => r.id)).toEqual(['a'])
  })

  it('filters echo.low by score threshold', () => {
    const recipes = [
      baseRecipe({
        id: 'low',
        trigger: 'echo.low',
        triggerConfig: { echoThreshold: 70 },
        actions: ['audit.log'],
      }),
    ]
    expect(matchRecipes(recipes, { type: 'echo.low', score: 65, documentId: 'd1' })).toHaveLength(1)
    expect(matchRecipes(recipes, { type: 'echo.low', score: 85, documentId: 'd1' })).toHaveLength(0)
  })
})

describe('buildExecutionPlan', () => {
  it('skips echo.recompute without documentId', () => {
    const recipe = baseRecipe({
      trigger: 'memory.ingested',
      actions: ['echo.recompute', 'pulse.refresh'],
    })
    const plan = buildExecutionPlan(recipe, { type: 'memory.ingested', meetingId: 'm1' })
    expect(plan.map((s) => s.action)).toEqual(['pulse.refresh'])
  })
})
