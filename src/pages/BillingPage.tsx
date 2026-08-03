import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GlassCard } from '../components/GlassCard'
import { FREE_DOCUMENT_LIMIT, formatPlanPrice, PLANS } from '../config/plans'
import { trialsRemaining } from '../lib/trials'
import type { PlanId } from '../lib/types'
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
  const [params, setParams] = useSearchParams()
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)

  const refreshEntitlements = async () => {
    try {
      const entitlements = await billingService.getEntitlements(plan, usage.trialsUsed)
      setPlan(entitlements.plan)
      setTrials(entitlements.trialsUsed, entitlements.trialsLimit)
      setStripeEnabled(Boolean(entitlements.stripeEnabled))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void billingService.getConfig().then((c) => setStripeEnabled(c.stripeEnabled))
    void refreshEntitlements()
  }, [])

  useEffect(() => {
    const checkout = params.get('checkout')
    if (!checkout) return
    if (checkout === 'success') {
      showToast('Payment successful — refreshing your plan…')
      void refreshEntitlements()
    } else if (checkout === 'cancel') {
      showToast('Checkout canceled')
    }
    setParams({}, { replace: true })
  }, [params, setParams, showToast])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
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
          <p className="mt-1 text-xs text-muted">
            {stripeEnabled
              ? 'Stripe mode — paid upgrades open Checkout; webhooks sync entitlements.'
              : 'Local mode — set STRIPE_SECRET_KEY in server/.env to enable real payments.'}
          </p>
        </div>
        {stripeEnabled && (
          <button
            type="button"
            className="btn-secondary"
            disabled={portalBusy}
            onClick={async () => {
              setPortalBusy(true)
              try {
                const { url } = await billingService.openCustomerPortal()
                window.location.href = url
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Could not open billing portal')
              } finally {
                setPortalBusy(false)
              }
            }}
          >
            {portalBusy ? 'Opening…' : 'Manage subscription'}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              disabled={plan === p.id || busyPlan !== null}
              onClick={async () => {
                setBusyPlan(p.id)
                try {
                  const session = await billingService.createCheckoutSession(p.id)
                  if (session.url) {
                    window.location.href = session.url
                    return
                  }
                  setPlan(session.plan ?? p.id)
                  await refreshEntitlements()
                  showToast(
                    p.id === 'free'
                      ? `Switched to Free — ${Math.max(0, FREE_DOCUMENT_LIMIT - usage.trialsUsed)} docs left`
                      : session.mode === 'stripe'
                        ? `Moved to ${p.name}`
                        : `Switched to ${p.name} (local demo billing)`,
                  )
                } catch (err) {
                  showToast(err instanceof Error ? err.message : 'Billing update failed')
                } finally {
                  setBusyPlan(null)
                }
              }}
            >
              {plan === p.id ? 'Current plan' : busyPlan === p.id ? 'Working…' : p.id === 'free' ? 'Downgrade to Free' : `Upgrade to ${p.name}`}
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
