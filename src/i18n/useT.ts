import { useTranslation } from 'react-i18next'

/**
 * Thin wrapper around react-i18next `useTranslation`.
 * Keeps call sites as `const t = useT()` with dotted keys.
 */
export function useT() {
  const { t } = useTranslation()
  return (key: string, vars?: Record<string, string | number>) =>
    t(key, vars as Record<string, unknown> | undefined)
}
