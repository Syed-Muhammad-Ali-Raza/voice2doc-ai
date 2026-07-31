import { describe, expect, it } from 'vitest'
import {
  extractActionCandidates,
  extractDecisionCandidates,
  fingerprintDecision,
  mergeThreadFingerprints,
} from './memoryGraph'

describe('server memoryGraph', () => {
  it('dedupes recurring decisions via fingerprints', () => {
    const a = fingerprintDecision('Decision: Ship stage progress toasts this sprint.')
    const b = fingerprintDecision('Ship stage progress toasts this sprint')
    const merged = mergeThreadFingerprints([{ id: '1', fingerprint: a, status: 'open' }], b)
    expect(merged).toBe('1')
  })

  it('extracts actions and decisions from a meeting transcript', () => {
    const transcript = [
      'Decision: Keep Studio Amber as the default accent.',
      'Alex will draft the toast copy by Friday.',
      'Action: Sam review integrations OAuth checklist (Sam)',
    ].join('\n')
    expect(extractDecisionCandidates(transcript).length).toBeGreaterThan(0)
    expect(extractActionCandidates(transcript).length).toBeGreaterThanOrEqual(2)
  })
})
