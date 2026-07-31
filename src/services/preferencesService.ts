import { env } from '../config/env'
import { apiFetch, getToken } from '../lib/apiClient'
import type { LocaleCode } from '../i18n'
import type { AccentId } from '../theme/palettes'
import type { TypographyId } from '../theme/typography'

export interface UserPreferences {
  locale: LocaleCode
  darkMode: boolean
  accentId: AccentId
  typographyId: TypographyId
  notifications: boolean
  autoSave: boolean
  privacyAnalytics: boolean
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

export const preferencesService = {
  async get(): Promise<UserPreferences | null> {
    if (env.useMockApi || !getToken()) return null
    try {
      return await apiFetch<UserPreferences>('/preferences', {}, base())
    } catch {
      return null
    }
  },

  async save(prefs: Partial<UserPreferences>): Promise<UserPreferences | null> {
    if (env.useMockApi || !getToken()) return null
    try {
      return await apiFetch<UserPreferences>(
        '/preferences',
        { method: 'PUT', body: JSON.stringify(prefs) },
        base(),
      )
    } catch {
      return null
    }
  },
}
