import { env } from '../config/env'
import { FREE_DOCUMENT_LIMIT, getPlan } from '../config/plans'
import { delay } from '../lib/mockAi'
import { apiFetch } from '../lib/apiClient'
import type { PlanId } from '../lib/types'

export interface Entitlements {
  plan: PlanId
  trialsUsed: number
  trialsLimit: number
  unlimitedAi: boolean
}

export interface BillingService {
  getEntitlements: (plan: PlanId, trialsUsed: number) => Promise<Entitlements>
  createCheckoutSession: (plan: PlanId) => Promise<{ url: string | null; plan?: PlanId }>
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const mockBilling: BillingService = {
  async getEntitlements(plan, trialsUsed) {
    await delay(100)
    const def = getPlan(plan)
    return {
      plan,
      trialsUsed,
      trialsLimit: FREE_DOCUMENT_LIMIT,
      unlimitedAi: def.aiDocuments === 'unlimited',
    }
  },
  async createCheckoutSession(plan) {
    await delay(200)
    return { url: null, plan }
  },
}

const httpBilling: BillingService = {
  async getEntitlements() {
    return apiFetch<Entitlements>('/billing/entitlements', {}, base())
  },
  async createCheckoutSession(plan) {
    return apiFetch<{ url: string | null; plan: PlanId }>(
      '/billing/checkout',
      { method: 'POST', body: JSON.stringify({ plan }) },
      base(),
    )
  },
}

export const billingService: BillingService = env.useMockApi ? mockBilling : httpBilling
