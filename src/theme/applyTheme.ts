import { getAccent, type AccentId } from './palettes'
import { getTypography, type TypographyId } from './typography'
import { localeMeta, type LocaleCode } from '../i18n'

export function applyStudioTheme(opts: {
  darkMode: boolean
  accentId: AccentId | string
  typographyId: TypographyId | string
  locale: LocaleCode | string
}) {
  const root = document.documentElement
  const accent = getAccent(opts.accentId)
  const type = getTypography(opts.typographyId)
  const meta = localeMeta(opts.locale as LocaleCode)

  root.classList.toggle('dark', opts.darkMode)
  root.lang = meta.code
  root.dir = meta.dir

  root.style.setProperty('--color-accent', accent.accent)
  root.style.setProperty('--color-accent-soft', accent.accentSoft)
  root.style.setProperty('--color-signal', accent.signal)
  root.style.setProperty('--studio-accent-rgb', accent.accentRgb)
  root.style.setProperty('--studio-signal-rgb', accent.signalRgb)
  root.style.setProperty('--font-display', type.display)
  root.style.setProperty('--font-sans', type.sans)
}
