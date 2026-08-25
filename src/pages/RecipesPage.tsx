import { useEffect, useState } from 'react'
import { Play, Plus, Trash2, Zap } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { RecipeRunLog } from '../components/RecipeRunLog'
import { useT } from '../i18n/useT'
import {
  recipeActionLabel,
  recipeTriggerLabel,
  type RecipeAction,
  type RecipeTrigger,
} from '../lib/studioRecipes'
import { recipesService, type RecipeRun, type StudioRecipe } from '../services/recipesService'
import { useDocsStore } from '../store/docs'

const TRIGGERS: RecipeTrigger[] = ['job.completed', 'echo.low', 'memory.ingested', 'manual']
const ACTIONS: RecipeAction[] = ['pulse.refresh', 'echo.recompute', 'audit.log']

export function RecipesPage() {
  const t = useT()
  const showToast = useDocsStore((s) => s.showToast)
  const [recipes, setRecipes] = useState<StudioRecipe[]>([])
  const [runs, setRuns] = useState<RecipeRun[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState<RecipeTrigger>('job.completed')
  const [echoThreshold, setEchoThreshold] = useState(70)
  const [selectedActions, setSelectedActions] = useState<RecipeAction[]>(['pulse.refresh', 'audit.log'])

  const load = async () => {
    try {
      const [recipeData, runData] = await Promise.all([
        recipesService.list(),
        recipesService.listRuns(20),
      ])
      setRecipes(recipeData.recipes)
      setRuns(runData.runs)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('recipes.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleAction = (action: RecipeAction) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action],
    )
  }

  const create = async () => {
    if (!name.trim()) {
      showToast(t('recipes.nameRequired'))
      return
    }
    if (selectedActions.length === 0) {
      showToast(t('recipes.actionsRequired'))
      return
    }
    setBusy(true)
    try {
      const recipe = await recipesService.create({
        name: name.trim(),
        trigger,
        triggerConfig: trigger === 'echo.low' ? { echoThreshold: echoThreshold } : undefined,
        actions: selectedActions,
      })
      setRecipes((prev) => [recipe, ...prev])
      setName('')
      showToast(t('recipes.created'))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('recipes.createFailed'))
    } finally {
      setBusy(false)
    }
  }

  const toggleEnabled = async (recipe: StudioRecipe) => {
    try {
      const updated = await recipesService.update(recipe.id, { enabled: !recipe.enabled })
      setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('recipes.updateFailed'))
    }
  }

  const runManual = async (recipe: StudioRecipe) => {
    setBusy(true)
    try {
      const run = await recipesService.run(recipe.id)
      setRuns((prev) => [run, ...prev])
      showToast(t('recipes.ran'))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('recipes.runFailed'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await recipesService.remove(id)
      setRecipes((prev) => prev.filter((r) => r.id !== id))
      showToast(t('recipes.deleted'))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('recipes.deleteFailed'))
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">
          {t('recipes.title')}
        </h1>
        <p className="mt-1 text-muted">{t('recipes.subtitle')}</p>
      </div>

      <GlassCard className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Plus className="text-accent" size={18} />
          <h2 className="font-semibold text-ink dark:text-dark-ink">{t('recipes.createTitle')}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted">{t('recipes.name')}</span>
            <input
              className="input mt-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('recipes.namePlaceholder')}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t('recipes.trigger')}</span>
            <select
              className="input mt-1 w-full"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as RecipeTrigger)}
            >
              {TRIGGERS.map((tr) => (
                <option key={tr} value={tr}>
                  {recipeTriggerLabel(tr)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {trigger === 'echo.low' && (
          <label className="block text-sm">
            <span className="text-muted">{t('recipes.echoThreshold')}</span>
            <input
              type="number"
              min={0}
              max={100}
              className="input mt-1 w-32"
              value={echoThreshold}
              onChange={(e) => setEchoThreshold(Number(e.target.value))}
            />
          </label>
        )}
        <div>
          <p className="text-sm text-muted">{t('recipes.actions')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                className={`rounded-full px-3 py-1 text-sm ${
                  selectedActions.includes(action)
                    ? 'bg-accent text-white'
                    : 'bg-black/5 text-muted dark:bg-white/10'
                }`}
                onClick={() => toggleAction(action)}
              >
                {recipeActionLabel(action)}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void create()}>
          {t('recipes.create')}
        </button>
      </GlassCard>

      <GlassCard className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Zap className="text-accent" size={18} />
          <h2 className="font-semibold text-ink dark:text-dark-ink">{t('recipes.library')}</h2>
        </div>
        {loading && <p className="text-sm text-muted">{t('common.loading')}</p>}
        <ul className="divide-y divide-border dark:divide-dark-border">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-medium text-ink dark:text-dark-ink">{recipe.name}</p>
                <p className="text-xs text-muted">
                  {recipeTriggerLabel(recipe.trigger)}
                  {recipe.trigger === 'echo.low' &&
                    recipe.triggerConfig?.echoThreshold !== undefined &&
                    ` · < ${recipe.triggerConfig.echoThreshold}`}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {recipe.actions.map(recipeActionLabel).join(' → ')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    recipe.enabled ? 'bg-signal/15 text-signal' : 'bg-black/5 text-muted'
                  }`}
                  onClick={() => void toggleEnabled(recipe)}
                >
                  {recipe.enabled ? t('recipes.enabled') : t('recipes.disabled')}
                </button>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-sm"
                  disabled={busy}
                  onClick={() => void runManual(recipe)}
                >
                  <Play size={14} className="inline mr-1" />
                  {t('recipes.run')}
                </button>
                <button
                  type="button"
                  className="btn-ghost text-danger px-2"
                  onClick={() => void remove(recipe.id)}
                  aria-label={t('recipes.delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
          {!loading && recipes.length === 0 && (
            <li className="py-6 text-sm text-muted">{t('recipes.empty')}</li>
          )}
        </ul>
      </GlassCard>

      <RecipeRunLog runs={runs} />
    </div>
  )
}
