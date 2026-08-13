import { env } from '../config/env'
import { apiFetch, getToken } from '../lib/apiClient'
import type { DataRegion, RetentionPolicyInput } from '../lib/compliance'

export interface AuditEntry {
  id: string
  action: string
  resourceType: string | null
  resourceId: string | null
  meta: Record<string, unknown> | null
  createdAt: string
}

export type CompliancePolicy = RetentionPolicyInput & { updatedAt: string | null }

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const demoPolicy: CompliancePolicy = {
  audioRetentionDays: 30,
  keepDocuments: true,
  region: 'local',
  auditExports: true,
  updatedAt: null,
}

const demoAudit: AuditEntry[] = [
  {
    id: 'a1',
    action: 'compliance.policy_updated',
    resourceType: null,
    resourceId: null,
    meta: { audioRetentionDays: 30 },
    createdAt: new Date().toISOString(),
  },
]

export const complianceService = {
  getPolicy: async (): Promise<CompliancePolicy> => {
    if (env.useMockApi || !getToken()) return demoPolicy
    return apiFetch<CompliancePolicy>('/compliance/policy', {}, base())
  },

  setPolicy: async (patch: Partial<RetentionPolicyInput>) => {
    if (env.useMockApi || !getToken()) {
      Object.assign(demoPolicy, patch, { updatedAt: new Date().toISOString() })
      return demoPolicy
    }
    return apiFetch<CompliancePolicy>(
      '/compliance/policy',
      { method: 'PUT', body: JSON.stringify(patch) },
      base(),
    )
  },

  listAudit: async (limit = 50) => {
    if (env.useMockApi || !getToken()) return { entries: demoAudit }
    return apiFetch<{ entries: AuditEntry[] }>(`/compliance/audit?limit=${limit}`, {}, base())
  },

  purgeAudio: async () => {
    if (env.useMockApi || !getToken()) return { deleted: 0, retentionDays: demoPolicy.audioRetentionDays }
    return apiFetch<{ deleted: number; retentionDays: number }>(
      '/compliance/purge-audio',
      { method: 'POST', body: '{}' },
      base(),
    )
  },

  exportData: async () => {
    if (env.useMockApi || !getToken()) {
      return {
        exportedAt: new Date().toISOString(),
        user: null,
        policy: demoPolicy,
        documents: [],
        integrations: [],
        audit: demoAudit,
      }
    }
    return apiFetch<Record<string, unknown>>('/compliance/export', { method: 'POST', body: '{}' }, base())
  },

  wipe: async () => {
    if (env.useMockApi || !getToken()) return { ok: true }
    return apiFetch<{ ok: boolean }>('/compliance/wipe', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'WIPE' }),
    }, base())
  },

  logVoiceCommand: async (command: string) => {
    if (env.useMockApi || !getToken()) {
      demoAudit.unshift({
        id: 'a' + Math.random().toString(36).slice(2, 10),
        action: 'ui.voice_command',
        resourceType: null,
        resourceId: null,
        meta: { command },
        createdAt: new Date().toISOString(),
      })
      return { ok: true }
    }
    return apiFetch<{ ok: boolean }>(
      '/compliance/log-voice-command',
      { method: 'POST', body: JSON.stringify({ command }) },
      base(),
    )
  },
}

export type { DataRegion }
