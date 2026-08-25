import { GlassCard } from './GlassCard'
import { useT } from '../i18n/useT'
import type { RecipeRun } from '../services/recipesService'

interface RecipeRunLogProps {
  runs: RecipeRun[]
}

export function RecipeRunLog({ runs }: RecipeRunLogProps) {
  const t = useT()

  return (
    <GlassCard className="space-y-4 p-5">
      <h2 className="font-semibold text-ink dark:text-dark-ink">{t('recipes.runLog')}</h2>
      <ul className="divide-y divide-border dark:divide-dark-border">
        {runs.map((run) => (
          <li key={run.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-ink dark:text-dark-ink">{run.recipeName}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  run.status === 'success'
                    ? 'bg-signal/15 text-signal'
                    : run.status === 'partial'
                      ? 'bg-accent/15 text-accent'
                      : 'bg-danger/15 text-danger'
                }`}
              >
                {t(`recipes.status.${run.status}`)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {run.trigger} · {new Date(run.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted">
              {run.results.map((r) => `${r.action}${r.ok ? '' : ' ✗'}`).join(' · ')}
            </p>
          </li>
        ))}
        {runs.length === 0 && <li className="py-4 text-sm text-muted">{t('recipes.noRuns')}</li>}
      </ul>
    </GlassCard>
  )
}
