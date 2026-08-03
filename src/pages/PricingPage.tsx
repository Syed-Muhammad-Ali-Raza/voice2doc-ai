import { Link } from 'react-router-dom'
import { GlassCard } from '../components/GlassCard'
import { formatPlanPrice, PLANS } from '../config/plans'

export function PricingPage() {
  return (
    <div className="page-enter mx-auto max-w-6xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink dark:text-dark-ink">Pricing</h1>
      <p className="mt-3 text-muted">Transparent plans for individuals and teams.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <GlassCard key={p.id} strong={p.highlight} className={`p-7 ${p.highlight ? 'ring-1 ring-accent/40' : ''}`}>
            <h2 className="font-display text-2xl font-semibold text-ink dark:text-dark-ink">{p.name}</h2>
            <p className="mt-3 font-display text-4xl text-accent">
              {formatPlanPrice(p)}
              <span className="text-base text-muted">/mo</span>
            </p>
            <ul className="mt-6 space-y-2 text-sm text-muted">
              {p.perks.map((perk) => (
                <li key={perk}>• {perk}</li>
              ))}
            </ul>
            <Link to="/register" className={`mt-8 w-full ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}>
              Get started
            </Link>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
