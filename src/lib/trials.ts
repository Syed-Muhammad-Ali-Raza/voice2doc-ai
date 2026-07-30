import { FREE_DOCUMENT_LIMIT } from '../config/plans'
import type { PlanId } from './types'

export { FREE_DOCUMENT_LIMIT }

export function isPaidPlan(plan: PlanId): boolean {
  return plan === 'pro' || plan === 'business'
}

export function canUseAiDocument(plan: PlanId, trialsUsed: number): boolean {
  if (isPaidPlan(plan)) return true
  return trialsUsed < FREE_DOCUMENT_LIMIT
}

/** Remaining free docs, or null when unlimited (paid). */
export function trialsRemaining(plan: PlanId, trialsUsed: number): number | null {
  if (isPaidPlan(plan)) return null
  return Math.max(0, FREE_DOCUMENT_LIMIT - trialsUsed)
}
