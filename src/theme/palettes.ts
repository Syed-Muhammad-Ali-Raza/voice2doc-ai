export type AccentId =
  | 'studio-amber'
  | 'harbor-teal'
  | 'ember-clay'
  | 'brass-ink'
  | 'coastal-sage'
  | 'copper-dusk'

export interface AccentPalette {
  id: AccentId
  labelKey: string
  /** Primary CTA / active nav */
  accent: string
  accentSoft: string
  /** Secondary signal (success / formatted) */
  signal: string
  /** RGB channels for ambient gradients (no alpha) */
  accentRgb: string
  signalRgb: string
}

export const ACCENT_PALETTES: AccentPalette[] = [
  {
    id: 'studio-amber',
    labelKey: 'theme.studioAmber',
    accent: '#c47b2d',
    accentSoft: '#e8c9a0',
    signal: '#2a6f6a',
    accentRgb: '196, 123, 45',
    signalRgb: '42, 111, 106',
  },
  {
    id: 'harbor-teal',
    labelKey: 'theme.harborTeal',
    accent: '#1f7a74',
    accentSoft: '#9fd4cf',
    signal: '#c47b2d',
    accentRgb: '31, 122, 116',
    signalRgb: '196, 123, 45',
  },
  {
    id: 'ember-clay',
    labelKey: 'theme.emberClay',
    accent: '#b85c38',
    accentSoft: '#e8b8a0',
    signal: '#3d6b5a',
    accentRgb: '184, 92, 56',
    signalRgb: '61, 107, 90',
  },
  {
    id: 'brass-ink',
    labelKey: 'theme.brassInk',
    accent: '#8a7340',
    accentSoft: '#d4c49a',
    signal: '#2f4a5e',
    accentRgb: '138, 115, 64',
    signalRgb: '47, 74, 94',
  },
  {
    id: 'coastal-sage',
    labelKey: 'theme.coastalSage',
    accent: '#5a7a5e',
    accentSoft: '#c5d4c4',
    signal: '#a66b3a',
    accentRgb: '90, 122, 94',
    signalRgb: '166, 107, 58',
  },
  {
    id: 'copper-dusk',
    labelKey: 'theme.copperDusk',
    accent: '#a65d45',
    accentSoft: '#e0b8a8',
    signal: '#4a6670',
    accentRgb: '166, 93, 69',
    signalRgb: '74, 102, 112',
  },
]

export function getAccent(id: string): AccentPalette {
  return ACCENT_PALETTES.find((p) => p.id === id) ?? ACCENT_PALETTES[0]!
}
