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
  stripeEnabled?: boolean
  stripeStatus?: string | null
  hasStripeCustomer?: boolean
}

export interface BillingConfig {
  stripeEnabled: boolean
  pricesConfigured: { pro: boolean; business: boolean }
}

export interface CheckoutResult {
  url: string | null
  plan?: PlanId
  mode?: 'stripe' | 'local'
}

export interface BillingService {
  getConfig: () => Promise<BillingConfig>
  getEntitlements: (plan: PlanId, trialsUsed: number) => Promise<Entitlements>
  createCheckoutSession: (plan: PlanId) => Promise<CheckoutResult>
  openCustomerPortal: () => Promise<{ url: string }>
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const mockBilling: BillingService = {
  async getConfig() {
    return { stripeEnabled: false, pricesConfigured: { pro: false, business: false } }
  },
  async getEntitlements(plan, trialsUsed) {
    await delay(100)
    const def = getPlan(plan)
    return {
      plan,
      trialsUsed,
      trialsLimit: FREE_DOCUMENT_LIMIT,
      unlimitedAi: def.aiDocuments === 'unlimited',
      stripeEnabled: false,
    }
  },
  async createCheckoutSession(plan) {
    await delay(200)
    return { url: null, plan, mode: 'local' }
  },
  async openCustomerPortal() {
    throw new Error('Stripe portal unavailable in mock mode')
  },
}

const httpBilling: BillingService = {
  async getConfig() {
    return apiFetch<BillingConfig>('/billing/config', {}, base())
  },
  async getEntitlements() {
    return apiFetch<Entitlements>('/billing/entitlements', {}, base())
  },
  async createCheckoutSession(plan) {
    return apiFetch<CheckoutResult>(
      '/billing/checkout',
      { method: 'POST', body: JSON.stringify({ plan }) },
      base(),
    )
  },
  async openCustomerPortal() {
    return apiFetch<{ url: string }>('/billing/portal', { method: 'POST', body: '{}' }, base())
  },
}

export const billingService: BillingService = env.useMockApi ? mockBilling : httpBilling
