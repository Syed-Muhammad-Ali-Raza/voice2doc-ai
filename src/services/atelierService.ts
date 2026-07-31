import { env } from '../config/env'
import { apiFetch } from '../lib/apiClient'
import { applyBrandLetterhead, buildToneDnaPrompt, scoreToneFit } from '../lib/atelier'

export interface BrandKit {
  id: string
  name: string
  accentHex: string
  logoText: string
  footerLine: string
  letterheadTitle: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ToneProfile {
  id: string
  name: string
  voiceSummary: string
  doList: string[]
  dontList: string[]
  sampleOpening: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  prompt?: string
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const demoKits: BrandKit[] = [
  {
    id: 'kit-demo',
    name: 'Studio Amber Letterhead',
    accentHex: '#c47b2d',
    logoText: 'Voice2Doc Studio',
    footerLine: 'Confidential — generated with Voice2Doc AI',
    letterheadTitle: 'Studio Document',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const demoTones: ToneProfile[] = [
  {
    id: 'tone-board',
    name: 'Board brief',
    voiceSummary: 'Crisp executive summary. Lead with decision, then risk, then ask.',
    doList: ['Lead with the decision', 'Use short paragraphs', 'Name owners'],
    dontList: ['Hedging language', 'Long anecdotes', 'Emoji'],
    sampleOpening: 'Recommendation: proceed with the staged rollout.',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tone-email',
    name: 'Customer email',
    voiceSummary: 'Warm, clear, and actionable without jargon.',
    doList: ['Thank the reader', 'One clear next step', 'Friendly closings'],
    dontList: ['Blame', 'Internal slang', 'Walls of text'],
    sampleOpening: 'Thanks for your patience — here is the update you asked for.',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const atelierService = {
  listBrandKits: async () => {
    if (env.useMockApi) return { brandKits: demoKits }
    return apiFetch<{ brandKits: BrandKit[] }>('/atelier/brand-kits', {}, base())
  },
  listToneProfiles: async () => {
    if (env.useMockApi) {
      return {
        toneProfiles: demoTones.map((t) => ({ ...t, prompt: buildToneDnaPrompt(t) })),
      }
    }
    return apiFetch<{ toneProfiles: ToneProfile[] }>('/atelier/tone-profiles', {}, base())
  },
  createBrandKit: async (payload: Omit<BrandKit, 'id' | 'createdAt' | 'updatedAt' | 'isDefault'> & { isDefault?: boolean }) => {
    if (env.useMockApi) {
      const kit: BrandKit = {
        ...payload,
        id: `kit-${Date.now()}`,
        isDefault: Boolean(payload.isDefault),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      demoKits.unshift(kit)
      return kit
    }
    return apiFetch<BrandKit>('/atelier/brand-kits', { method: 'POST', body: JSON.stringify(payload) }, base())
  },
  createToneProfile: async (
    payload: Omit<ToneProfile, 'id' | 'createdAt' | 'updatedAt' | 'isDefault' | 'prompt'> & { isDefault?: boolean },
  ) => {
    if (env.useMockApi) {
      const tone: ToneProfile = {
        ...payload,
        id: `tone-${Date.now()}`,
        isDefault: Boolean(payload.isDefault),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        prompt: buildToneDnaPrompt(payload),
      }
      demoTones.unshift(tone)
      return tone
    }
    return apiFetch<ToneProfile>(
      '/atelier/tone-profiles',
      { method: 'POST', body: JSON.stringify(payload) },
      base(),
    )
  },
  preview: async (payload: { contentHtml: string; brandKitId?: string; toneProfileId?: string }) => {
    if (env.useMockApi) {
      const kit = demoKits.find((k) => k.id === payload.brandKitId) || demoKits[0]!
      const tone = demoTones.find((t) => t.id === payload.toneProfileId) || demoTones[0]!
      return {
        html: applyBrandLetterhead(payload.contentHtml, kit),
        brandKit: kit,
        toneProfile: tone,
        toneFitScore: scoreToneFit(payload.contentHtml.replace(/<[^>]+>/g, ' '), tone),
      }
    }
    return apiFetch<{
      html: string
      brandKit: BrandKit | null
      toneProfile: ToneProfile | null
      toneFitScore: number | null
    }>('/atelier/preview', { method: 'POST', body: JSON.stringify(payload) }, base())
  },
}
