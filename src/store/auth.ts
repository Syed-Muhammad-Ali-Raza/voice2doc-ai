import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setToken } from '../lib/apiClient'
import type { PlanId, User } from '../lib/types'
import type { AuthUser } from '../services/authService'

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
  language: string
  notifications: boolean
  autoSave: boolean
  privacyAnalytics: boolean
  plan: PlanId
  toggleDarkMode: () => void
  setLanguage: (language: string) => void
  setNotifications: (value: boolean) => void
  setAutoSave: (value: boolean) => void
  setPrivacyAnalytics: (value: boolean) => void
  setPlan: (plan: PlanId) => void
  hydrateTheme: () => void
}

function applyDarkClass(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      darkMode: false,
      language: 'English',
      notifications: true,
      autoSave: true,
      privacyAnalytics: false,
      plan: 'free',
      toggleDarkMode: () => {
        const next = !get().darkMode
        applyDarkClass(next)
        set({ darkMode: next })
      },
      setLanguage: (language) => set({ language }),
      setNotifications: (notifications) => set({ notifications }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setPrivacyAnalytics: (privacyAnalytics) => set({ privacyAnalytics }),
      setPlan: (plan) => set({ plan }),
      hydrateTheme: () => applyDarkClass(get().darkMode),
    }),
    { name: 'v2d-settings' },
  ),
)
