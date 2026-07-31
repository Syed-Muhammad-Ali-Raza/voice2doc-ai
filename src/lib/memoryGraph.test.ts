import { describe, expect, it } from 'vitest'
import {
  extractActionCandidates,
  extractDecisionCandidates,
  extractSpeakerSegments,
  fingerprintDecision,
  mergeThreadFingerprints,
  shouldMergeByFingerprint,
} from './memoryGraph'

describe('fingerprintDecision', () => {
  it('normalizes casing and stop words', () => {
    expect(fingerprintDecision('We decided to Ship the Stage Progress Toasts')).toBe(
      fingerprintDecision('ship the stage progress toasts'),
    )
  })

  it('strips punctuation', () => {
    expect(fingerprintDecision('Keep Studio Amber!')).toContain('studio amber')
  })
})

describe('shouldMergeByFingerprint', () => {
  it('merges identical fingerprints', () => {
    expect(shouldMergeByFingerprint('ship toasts', 'ship toasts')).toBe(true)
  })

  it('merges contained fingerprints', () => {
    expect(shouldMergeByFingerprint('ship stage progress toasts sprint', 'ship stage progress toasts')).toBe(
      true,
    )
  })

  it('rejects empty', () => {
    expect(shouldMergeByFingerprint('', 'x')).toBe(false)
  })
})

describe('extractSpeakerSegments', () => {
  it('parses Speaker: lines with increasing timestamps', () => {
    const segs = extractSpeakerSegments('Alex: Hello there\nSam: Hi back')
    expect(segs).toHaveLength(2)
    expect(segs[0]?.speaker).toBe('Alex')
    expect(segs[1]?.speaker).toBe('Sam')
    expect(segs[1]!.startMs).toBeGreaterThan(segs[0]!.startMs)
  })

  it('labels unmarked lines as Unknown', () => {
    const segs = extractSpeakerSegments('Just a note')
    expect(segs[0]?.speaker).toBe('Unknown')
  })
})

describe('extractActionCandidates', () => {
  it('extracts Action: lines with owner in parentheses', () => {
    const actions = extractActionCandidates('Action: Review OAuth checklist (Sam)')
    expect(actions).toHaveLength(1)
    expect(actions[0]?.text).toMatch(/Review OAuth/i)
    expect(actions[0]?.ownerLabel).toBe('Sam')
  })

  it('extracts will-by patterns', () => {
    const actions = extractActionCandidates('Alex will draft the toast copy by Friday.')
    expect(actions[0]?.ownerLabel).toBe('Alex')
    expect(actions[0]?.dueHint).toBe('Friday')
  })
})

describe('extractDecisionCandidates', () => {
  it('finds Decision: lines', () => {
    expect(extractDecisionCandidates('Decision: Keep Studio Amber as default.')).toEqual([
      'Keep Studio Amber as default.',
    ])
  })
})

describe('mergeThreadFingerprints', () => {
  it('returns matching open thread id', () => {
    const id = mergeThreadFingerprints(
      [
        { id: 't1', fingerprint: 'keep studio amber default', status: 'open' },
        { id: 't2', fingerprint: 'other', status: 'closed' },
      ],
      'keep studio amber default',
    )
    expect(id).toBe('t1')
  })

  it('skips closed threads', () => {
    const id = mergeThreadFingerprints(
      [{ id: 't1', fingerprint: 'keep studio amber default', status: 'closed' }],
      'keep studio amber default',
    )
    expect(id).toBeNull()
  })
})
