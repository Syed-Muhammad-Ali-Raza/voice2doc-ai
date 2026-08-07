import { describe, expect, it } from 'vitest'
import {
  analyzeWritingSamples,
  applyVoiceTwinLocally,
  buildVoiceTwinProfile,
  scoreVoiceMatch,
  stripHtml,
} from './voiceTwin'

const formalSamples = [
  'Recommendation: proceed with the staged rollout. Therefore we should keep the board pack concise.',
  'Regarding the Harbor launch, Alex owns QA. Avoid hedging language in the summary.',
]

const casualSamples = [
  "Hey folks, let's maybe ship something cool this week. I think we could kinda wait.",
  'Anyway btw the update is gonna be quick.',
]

describe('voiceTwin', () => {
  it('strips html', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('marks formal samples as more formal than casual ones', () => {
    const formal = analyzeWritingSamples(formalSamples)
    const casual = analyzeWritingSamples(casualSamples)
    expect(formal.formality).toBeGreaterThan(casual.formality)
  })

  it('builds do/dont lists and an opening', () => {
    const twin = buildVoiceTwinProfile(formalSamples, ['Ship Harbor launch'])
    expect(twin.doList.length).toBeGreaterThan(0)
    expect(twin.dontList.length).toBeGreaterThan(0)
    expect(twin.sampleOpening.length).toBeGreaterThan(10)
    expect(twin.voiceSummary.toLowerCase()).toMatch(/formal|approachable/)
  })

  it('applies local twin transforms', () => {
    const twin = buildVoiceTwinProfile(formalSamples)
    const html = applyVoiceTwinLocally('<p>I think maybe we should wait.</p>', twin)
    expect(html.toLowerCase()).toContain('voice twin applied')
    expect(html.toLowerCase()).not.toContain('i think')
  })

  it('scores voice match higher for aligned drafts', () => {
    const twin = buildVoiceTwinProfile(formalSamples)
    const aligned = applyVoiceTwinLocally(formalSamples[0]!, twin)
    const drifted = '<p>hey gonna ship something cool maybe</p>'
    expect(scoreVoiceMatch(aligned, twin)).toBeGreaterThan(scoreVoiceMatch(drifted, twin))
  })
})
