import { GlassCard } from '../components/GlassCard'
import { FREE_DOCUMENT_LIMIT, formatPlanPrice, PLANS } from '../config/plans'
import { trialsRemaining } from '../lib/trials'
import { billingService } from '../services/billingService'
import { useDocsStore } from '../store/docs'
import { useSettingsStore } from '../store/auth'

export function BillingPage() {
  const plan = useSettingsStore((s) => s.plan)
  const setPlan = useSettingsStore((s) => s.setPlan)
  const usage = useDocsStore((s) => s.usage)
  const setTrials = useDocsStore((s) => s.setTrials)
  const showToast = useDocsStore((s) => s.showToast)
  const remaining = trialsRemaining(plan, usage.trialsUsed)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">Billing</h1>
        <p className="mt-1 text-muted">
          Current plan: <span className="capitalize text-accent">{plan}</span>
          {remaining === null ? (
            <span> · Unlimited AI documents</span>
          ) : (
            <span>
              {' '}
              · {remaining} of {FREE_DOCUMENT_LIMIT} free AI documents left
            </span>
          )}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <GlassCard key={p.id} strong={plan === p.id} className={`p-6 ${plan === p.id ? 'ring-1 ring-accent/40' : ''}`}>
            <h2 className="font-display text-2xl font-semibold text-ink dark:text-dark-ink">{p.name}</h2>
            <p className="mt-2 font-display text-3xl text-accent">
              {formatPlanPrice(p)}
              <span className="text-sm text-muted">/mo</span>
            </p>
            <ul className="mt-4 space-y-1 text-sm text-muted">
              {p.perks.map((perk) => (
                <li key={perk}>• {perk}</li>
              ))}
            </ul>
            <button
              type="button"
              className={`mt-6 w-full ${plan === p.id ? 'btn-secondary' : 'btn-primary'}`}
              onClick={async () => {
                const session = await billingService.createCheckoutSession(p.id)
                if (session.url) {
                  window.location.href = session.url
                  return
                }
                setPlan(session.plan ?? p.id)
                try {
                  const entitlements = await billingService.getEntitlements(session.plan ?? p.id, usage.trialsUsed)
                  setPlan(entitlements.plan)
                  setTrials(entitlements.trialsUsed, entitlements.trialsLimit)
                } catch {
                  /* mock path */
                }
                showToast(
                  p.id === 'free'
                    ? `Switched to Free — ${Math.max(0, FREE_DOCUMENT_LIMIT - usage.trialsUsed)} docs left`
                    : `Switched to ${p.name} — unlimited AI documents`,
                )
              }}
              disabled={plan === p.id}
            >
              {plan === p.id ? 'Current plan' : `Choose ${p.name}`}
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
