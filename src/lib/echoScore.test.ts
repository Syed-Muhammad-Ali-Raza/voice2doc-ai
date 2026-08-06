import { describe, expect, it } from 'vitest'
import {
  computeEchoScore,
  extractIntentPhrases,
  phraseCoverage,
  scoreBand,
  stripHtml,
} from './echoScore'

const transcript = [
  'We decided to ship the Q3 roadmap by Friday.',
  'Alex will send the client recap tonight.',
  'Keep the budget under twelve thousand.',
  'Also mention the Harbor launch date in the summary.',
].join(' ')

describe('echoScore', () => {
  it('strips html to plain text', () => {
    expect(stripHtml('<h2>Hello</h2><p>world &amp; team</p>')).toBe('Hello world & team')
  })

  it('extracts commitment and action phrases', () => {
    const phrases = extractIntentPhrases(transcript)
    expect(phrases.some((p) => p.kind === 'commitment')).toBe(true)
    expect(phrases.some((p) => p.kind === 'action')).toBe(true)
  })

  it('scores highly when the draft keeps spoken intent', () => {
    const draft = `
      <h2>Notes</h2>
      <p>We decided to ship the Q3 roadmap by Friday.</p>
      <p>Alex will send the client recap tonight.</p>
      <p>Keep the budget under twelve thousand and mention the Harbor launch date.</p>
    `
    const result = computeEchoScore(transcript, draft)
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.lostPhrases).toHaveLength(0)
    expect(result.tips.some((tip) => tip.id === 'high_fidelity')).toBe(true)
  })

  it('surfaces lost commitments and actions', () => {
    const result = computeEchoScore(transcript, '<p>General meeting notes about next steps.</p>')
    expect(result.score).toBeLessThan(55)
    expect(result.lostPhrases.length).toBeGreaterThan(0)
    expect(result.tips.map((tip) => tip.id)).toContain('restore_actions')
    expect(result.tips.map((tip) => tip.id)).toContain('restore_commitments')
  })

  it('returns no-transcript tip when audio is missing', () => {
    const result = computeEchoScore('No audio attached. Document generated from processing preferences only.', '<p>Draft</p>')
    expect(result.score).toBe(0)
    expect(result.tips[0]?.id).toBe('no_transcript')
  })

  it('measures phrase coverage and score bands', () => {
    expect(phraseCoverage('ship the q3 roadmap', 'ship the q3 roadmap friday')).toBeGreaterThan(0.7)
    expect(scoreBand(90)).toBe('high')
    expect(scoreBand(60)).toBe('mid')
    expect(scoreBand(20)).toBe('low')
  })
})
