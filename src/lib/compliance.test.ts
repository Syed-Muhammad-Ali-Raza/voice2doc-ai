import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RETENTION,
  isAudioExpired,
  isDataRegion,
  summarizePolicy,
  validateRetentionDays,
} from './compliance'

describe('compliance retention', () => {
  it('validates retention day bounds', () => {
    expect(validateRetentionDays(-1)).toBe(0)
    expect(validateRetentionDays(4000)).toBe(3650)
    expect(validateRetentionDays(Number.NaN)).toBe(DEFAULT_RETENTION.audioRetentionDays)
  })

  it('detects expired audio', () => {
    const old = new Date(Date.now() - 40 * 86400000).toISOString()
    expect(isAudioExpired(old, 30)).toBe(true)
    expect(isAudioExpired(old, 0)).toBe(false)
    expect(isAudioExpired(new Date().toISOString(), 30)).toBe(false)
  })

  it('validates regions', () => {
    expect(isDataRegion('eu')).toBe(true)
    expect(isDataRegion('mars')).toBe(false)
  })

  it('summarizes policy', () => {
    expect(summarizePolicy({ ...DEFAULT_RETENTION, audioRetentionDays: 0 })).toContain('indefinitely')
    expect(summarizePolicy(DEFAULT_RETENTION)).toContain('30 days')
  })
})
