export type LocaleCode = 'en' | 'es' | 'fr' | 'de' | 'ur' | 'ar'

export type MessageTree = { [key: string]: string | MessageTree }

export interface LocaleMeta {
  code: LocaleCode
  label: string
  nativeLabel: string
  dir: 'ltr' | 'rtl'
}
