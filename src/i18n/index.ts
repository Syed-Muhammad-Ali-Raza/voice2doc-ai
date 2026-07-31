import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { ar } from './locales/ar'
import { de } from './locales/de'
import { en } from './locales/en'
import { es } from './locales/es'
import { fr } from './locales/fr'
import { ur } from './locales/ur'
import type { LocaleCode, LocaleMeta, MessageTree } from './types'

export type { LocaleCode, LocaleMeta, MessageTree }

export const LOCALES: LocaleMeta[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', dir: 'ltr' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', dir: 'rtl' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
]

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  ur: { translation: ur },
  ar: { translation: ar },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: LOCALES.map((l) => l.code),
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
})

export default i18n

export function localeMeta(code: LocaleCode): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0]!
}

export function isLocaleCode(value: string): value is LocaleCode {
  return LOCALES.some((l) => l.code === value)
}

/** Map legacy settings labels to locale codes. */
export function normalizeLocale(value: string): LocaleCode {
  if (isLocaleCode(value)) return value
  const map: Record<string, LocaleCode> = {
    English: 'en',
    Spanish: 'es',
    French: 'fr',
    German: 'de',
    Urdu: 'ur',
    Arabic: 'ar',
  }
  return map[value] ?? 'en'
}

export async function changeAppLanguage(locale: LocaleCode) {
  await i18n.changeLanguage(locale)
}
