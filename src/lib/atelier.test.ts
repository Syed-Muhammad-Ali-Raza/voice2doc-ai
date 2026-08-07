import { describe, expect, it } from 'vitest'
import {
  applyBrandLetterhead,
  buildToneDnaPrompt,
  normalizeAccentHex,
  scoreToneFit,
} from './atelier'
import { getTour, localeToSpeechLang, VOICE_TOURS } from './voiceGuide'

describe('atelier brand + tone', () => {
  it('normalizes accent hex', () => {
    expect(normalizeAccentHex('C47B2D')).toBe('#c47b2d')
    expect(normalizeAccentHex('#AbcDef')).toBe('#abcdef')
    expect(normalizeAccentHex('bad')).toBe('#c47b2d')
  })

  it('wraps html in letterhead', () => {
    const html = applyBrandLetterhead('<p>Hello</p>', {
      name: 'Kit',
      accentHex: '#1f7a74',
      logoText: 'Acme',
      footerLine: 'Private',
      letterheadTitle: 'Brief',
    })
    expect(html).toContain('Acme')
    expect(html).toContain('Brief')
    expect(html).toContain('<p>Hello</p>')
    expect(html).toContain('#1f7a74')
  })

  it('builds tone DNA prompt', () => {
    const prompt = buildToneDnaPrompt({
      name: 'Board brief',
      voiceSummary: 'Crisp.',
      doList: ['Lead with the decision'],
      dontList: ['Emoji'],
      sampleOpening: 'Recommendation: go.',
    })
    expect(prompt).toContain('Tone DNA: Board brief')
    expect(prompt).toContain('Lead with the decision')
    expect(prompt).toContain("Don't:")
  })

  it('scores tone fit higher when dos match', () => {
    const dna = {
      name: 'Board',
      voiceSummary: 'x',
      doList: ['Recommendation'],
      dontList: ['emoji'],
      sampleOpening: 'Recommendation: proceed',
    }
    const high = scoreToneFit('Recommendation: proceed with care', dna)
    const low = scoreToneFit('lol emoji party', dna)
    expect(high).toBeGreaterThan(low)
  })
})

describe('voice guide tours', () => {
  it('exposes eight tours', () => {
    expect(VOICE_TOURS).toHaveLength(8)
    expect(getTour('record').steps.length).toBeGreaterThan(2)
  })

  it('maps locales to speech tags', () => {
    expect(localeToSpeechLang('ar')).toBe('ar-SA')
    expect(localeToSpeechLang('en')).toBe('en-US')
  })
})
