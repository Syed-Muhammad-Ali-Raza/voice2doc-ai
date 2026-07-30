import { useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/GlassCard'
import { templates } from '../lib/seed'
import { useDocsStore } from '../store/docs'

export function TemplatesPage() {
  const createFromTemplate = useDocsStore((s) => s.createFromTemplate)
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Templates</h1>
        <p className="mt-1 text-muted">Start from a ready structure, then refine with AI.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <GlassCard key={tpl.id} className="flex flex-col p-5">
            <h2 className="font-display text-xl font-semibold text-ink dark:text-dark-ink">{tpl.name}</h2>
            <p className="mt-2 flex-1 text-sm text-muted">{tpl.description}</p>
            <button
              type="button"
              className="btn-primary mt-5 w-full"
              onClick={() => {
                const doc = createFromTemplate(tpl.type, tpl.name)
                navigate(`/app/editor/${doc.id}`)
              }}
            >
              Use template
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
