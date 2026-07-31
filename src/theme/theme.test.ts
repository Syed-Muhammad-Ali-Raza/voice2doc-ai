import { describe, expect, it } from 'vitest'
import { ACCENT_PALETTES, getAccent } from '../theme/palettes'
import { TYPOGRAPHY_PAIRS, getTypography } from '../theme/typography'
import { isLocaleCode, normalizeLocale, localeMeta } from '../i18n'

describe('theme palettes', () => {
  it('returns studio-amber by default for unknown ids', () => {
    expect(getAccent('not-real').id).toBe('studio-amber')
  })

  it('exposes six curated accents', () => {
    expect(ACCENT_PALETTES).toHaveLength(6)
    expect(ACCENT_PALETTES.every((p) => p.accent.startsWith('#'))).toBe(true)
  })
})

describe('typography pairs', () => {
  it('returns fraunces-dm for unknown ids', () => {
    expect(getTypography('missing').id).toBe('fraunces-dm')
  })

  it('exposes six pairs', () => {
    expect(TYPOGRAPHY_PAIRS).toHaveLength(6)
  })
})

describe('locale helpers', () => {
  it('normalizes legacy language labels', () => {
    expect(normalizeLocale('Spanish')).toBe('es')
    expect(normalizeLocale('ur')).toBe('ur')
  })

  it('marks RTL for ur and ar', () => {
    expect(localeMeta('ur').dir).toBe('rtl')
    expect(localeMeta('ar').dir).toBe('rtl')
    expect(localeMeta('en').dir).toBe('ltr')
  })

  it('validates locale codes', () => {
    expect(isLocaleCode('fr')).toBe(true)
    expect(isLocaleCode('xx')).toBe(false)
  })
})
