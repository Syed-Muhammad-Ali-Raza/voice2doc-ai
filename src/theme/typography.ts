export type TypographyId =
  | 'fraunces-dm'
  | 'literata-figtree'
  | 'newsreader-source'
  | 'syne-outfit'
  | 'baskerville-karla'
  | 'bricolage-manrope'

export interface TypographyPair {
  id: TypographyId
  labelKey: string
  display: string
  sans: string
}

export const TYPOGRAPHY_PAIRS: TypographyPair[] = [
  {
    id: 'fraunces-dm',
    labelKey: 'theme.frauncesDm',
    display: "'Fraunces', Georgia, serif",
    sans: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'literata-figtree',
    labelKey: 'theme.literataFigtree',
    display: "'Literata', Georgia, serif",
    sans: "'Figtree', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'newsreader-source',
    labelKey: 'theme.newsreaderSource',
    display: "'Newsreader', Georgia, serif",
    sans: "'Source Sans 3', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'syne-outfit',
    labelKey: 'theme.syneOutfit',
    display: "'Syne', ui-sans-serif, system-ui, sans-serif",
    sans: "'Outfit', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'baskerville-karla',
    labelKey: 'theme.baskervilleKarla',
    display: "'Libre Baskerville', Georgia, serif",
    sans: "'Karla', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'bricolage-manrope',
    labelKey: 'theme.bricolageManrope',
    display: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
    sans: "'Manrope', ui-sans-serif, system-ui, sans-serif",
  },
]

export function getTypography(id: string): TypographyPair {
  return TYPOGRAPHY_PAIRS.find((p) => p.id === id) ?? TYPOGRAPHY_PAIRS[0]!
}
