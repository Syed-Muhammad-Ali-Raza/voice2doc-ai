import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setToken } from '../lib/apiClient'
import type { PlanId, User } from '../lib/types'
import type { AuthUser } from '../services/authService'
import { preferencesService } from '../services/preferencesService'
import { changeAppLanguage, normalizeLocale, type LocaleCode } from '../i18n'
import { applyStudioTheme } from '../theme/applyTheme'
import type { AccentId } from '../theme/palettes'
import type { TypographyId } from '../theme/typography'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, name?: string) => void
  register: (name: string, email: string) => void
  setSession: (session: { user: AuthUser; token: string }) => void
  logout: () => void
  updateProfile: (patch: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: (email, name) =>
        set({
          isAuthenticated: true,
          user: {
            id: 'user-demo',
            name: name || email.split('@')[0] || 'Demo User',
            email,
          },
        }),
      register: (name, email) =>
        set({
          isAuthenticated: true,
          user: { id: 'user-demo', name, email },
        }),
      setSession: ({ user, token }) => {
        setToken(token)
        set({
          isAuthenticated: true,
          user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
        })
      },
      logout: () => {
        setToken(null)
        set({ user: null, isAuthenticated: false })
      },
      updateProfile: (patch) => {
        const current = get().user
        if (!current) return
        set({ user: { ...current, ...patch } })
      },
    }),
    { name: 'v2d-auth' },
  ),
)

interface SettingsState {
  darkMode: boolean
  /** @deprecated use locale — kept for migrate */
  language?: string
  locale: LocaleCode
  accentId: AccentId
  typographyId: TypographyId
  notifications: boolean
  autoSave: boolean
  privacyAnalytics: boolean
  plan: PlanId
  toggleDarkMode: () => void
  setLanguage: (language: string) => void
  setLocale: (locale: LocaleCode) => void
  setAccentId: (accentId: AccentId) => void
  setTypographyId: (typographyId: TypographyId) => void
  resetAppearance: () => void
  setNotifications: (value: boolean) => void
  setAutoSave: (value: boolean) => void
  setPrivacyAnalytics: (value: boolean) => void
  setPlan: (plan: PlanId) => void
  hydrateTheme: () => void
  syncFromServer: () => Promise<void>
  persistToServer: () => Promise<boolean>
}

function applyFromState(state: {
  darkMode: boolean
  accentId: AccentId
  typographyId: TypographyId
  locale: LocaleCode
}) {
  applyStudioTheme(state)
}

function schedulePersist() {
  // Debounced cloud sync — fire-and-forget from UI actions
  void useSettingsStore.getState().persistToServer()
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      darkMode: false,
      locale: 'en',
      accentId: 'studio-amber',
      typographyId: 'fraunces-dm',
      notifications: true,
      autoSave: true,
      privacyAnalytics: false,
      plan: 'free',
      toggleDarkMode: () => {
        const next = !get().darkMode
        set({ darkMode: next })
        applyFromState({ ...get(), darkMode: next })
        schedulePersist()
      },
      setLanguage: (language) => {
        get().setLocale(normalizeLocale(language))
      },
      setLocale: (locale) => {
        set({ locale })
        void changeAppLanguage(locale)
        applyFromState({ ...get(), locale })
        schedulePersist()
      },
      setAccentId: (accentId) => {
        set({ accentId })
        applyFromState({ ...get(), accentId })
        schedulePersist()
      },
      setTypographyId: (typographyId) => {
        set({ typographyId })
        applyFromState({ ...get(), typographyId })
        schedulePersist()
      },
      resetAppearance: () => {
        set({ accentId: 'studio-amber', typographyId: 'fraunces-dm' })
        applyFromState({ ...get(), accentId: 'studio-amber', typographyId: 'fraunces-dm' })
        schedulePersist()
      },
      setNotifications: (notifications) => {
        set({ notifications })
        schedulePersist()
      },
      setAutoSave: (autoSave) => {
        set({ autoSave })
        schedulePersist()
      },
      setPrivacyAnalytics: (privacyAnalytics) => {
        set({ privacyAnalytics })
        schedulePersist()
      },
      setPlan: (plan) => set({ plan }),
      hydrateTheme: () => {
        const s = get()
        const locale = s.locale || normalizeLocale(s.language || 'en')
        if (locale !== s.locale) set({ locale })
        void changeAppLanguage(locale)
        applyFromState({ ...get(), locale })
      },
      syncFromServer: async () => {
        const remote = await preferencesService.get()
        if (!remote) return
        set({
          locale: remote.locale,
          darkMode: remote.darkMode,
          accentId: remote.accentId,
          typographyId: remote.typographyId,
          notifications: remote.notifications,
          autoSave: remote.autoSave,
          privacyAnalytics: remote.privacyAnalytics,
        })
        await changeAppLanguage(remote.locale)
        applyFromState(get())
      },
      persistToServer: async () => {
        const s = get()
        const saved = await preferencesService.save({
          locale: s.locale,
          darkMode: s.darkMode,
          accentId: s.accentId,
          typographyId: s.typographyId,
          notifications: s.notifications,
          autoSave: s.autoSave,
          privacyAnalytics: s.privacyAnalytics,
        })
        return Boolean(saved)
      },
    }),
    {
      name: 'v2d-settings',
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>
        const locale = p.locale || normalizeLocale(p.language || 'en')
        return {
          ...current,
          ...p,
          locale,
          accentId: p.accentId || 'studio-amber',
          typographyId: p.typographyId || 'fraunces-dm',
        }
      },
    },
  ),
)
