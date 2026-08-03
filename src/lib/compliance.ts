/**
 * Trust & Compliance helpers (Phase 10).
 */

export type DataRegion = 'local' | 'us' | 'eu' | 'apac'

export interface RetentionPolicyInput {
  audioRetentionDays: number
  keepDocuments: boolean
  region: DataRegion
  auditExports: boolean
}

export const DEFAULT_RETENTION: RetentionPolicyInput = {
  audioRetentionDays: 30,
  keepDocuments: true,
  region: 'local',
  auditExports: true,
}

export const REGION_LABELS: Record<DataRegion, string> = {
  local: 'This device / local API',
  us: 'United States (planned)',
  eu: 'European Union (planned)',
  apac: 'Asia Pacific (planned)',
}

/** Audio older than retention window is eligible for purge. */
export function isAudioExpired(createdAtIso: string, audioRetentionDays: number, now = Date.now()): boolean {
  if (audioRetentionDays <= 0) return false
  const created = new Date(createdAtIso).getTime()
  if (Number.isNaN(created)) return false
  const ageMs = now - created
  return ageMs >= audioRetentionDays * 24 * 60 * 60 * 1000
}

export function validateRetentionDays(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_RETENTION.audioRetentionDays
  return Math.max(0, Math.min(3650, Math.floor(days)))
}

export function isDataRegion(value: string): value is DataRegion {
  return value === 'local' || value === 'us' || value === 'eu' || value === 'apac'
}

export function summarizePolicy(policy: RetentionPolicyInput): string {
  if (policy.audioRetentionDays === 0) {
    return `Keep audio indefinitely · docs ${policy.keepDocuments ? 'retained' : 'may be wiped'} · region ${policy.region}`
  }
  return `Purge audio after ${policy.audioRetentionDays} days · docs ${policy.keepDocuments ? 'kept' : 'not guaranteed'} · region ${policy.region}`
}
