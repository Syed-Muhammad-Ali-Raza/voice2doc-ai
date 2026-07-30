import type { PlanId } from '../lib/types'

/** Product entitlements — keep in sync with server when you upscale. */
export const FREE_DOCUMENT_LIMIT = 10

export interface PlanDefinition {
  id: PlanId
  name: string
  priceMonthly: number
  aiDocuments: number | 'unlimited'
  perks: string[]
  highlight?: boolean
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    aiDocuments: FREE_DOCUMENT_LIMIT,
    perks: [`${FREE_DOCUMENT_LIMIT} free AI documents`, 'Basic AI formatting', 'TXT & Markdown export', 'Templates'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 19,
    aiDocuments: 'unlimited',
    highlight: true,
    perks: ['Unlimited AI documents', 'Premium AI', 'Faster processing', 'Unlimited exports'],
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 49,
    aiDocuments: 'unlimited',
    perks: ['Unlimited AI documents', 'Team collaboration', 'Shared workspaces', 'API access'],
  },
]

export function getPlan(id: PlanId): PlanDefinition {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]!
}

export function formatPlanPrice(plan: PlanDefinition): string {
  return plan.priceMonthly === 0 ? '$0' : `$${plan.priceMonthly}`
}
