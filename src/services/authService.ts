import { env } from '../config/env'
import { delay } from '../lib/mockAi'
import { apiFetch, getToken, setToken } from '../lib/apiClient'
import type { PlanId, User } from '../lib/types'

export interface AuthUser extends User {
  plan?: PlanId
  trialsUsed?: number
  trialsLimit?: number
}

export interface AuthSession {
  user: AuthUser
  token: string
}

export interface AuthService {
  login: (email: string, password: string) => Promise<AuthSession>
  register: (name: string, email: string, password: string) => Promise<AuthSession>
  loginWithGoogle: () => Promise<AuthSession>
  logout: () => Promise<void>
  getSession: () => Promise<AuthSession | null>
}

function base() {
  return env.apiBaseUrl || 'http://localhost:3001/api'
}

const mockAuth: AuthService = {
  async login(email) {
    await delay(400)
    return {
      token: 'mock-token',
      user: {
        id: 'user-demo',
        name: email.split('@')[0] || 'Demo User',
        email,
        plan: 'free',
        trialsUsed: 0,
        trialsLimit: 10,
      },
    }
  },
  async register(name, email) {
    await delay(500)
    return {
      token: 'mock-token',
      user: { id: 'user-demo', name, email, plan: 'free', trialsUsed: 0, trialsLimit: 10 },
    }
  },
  async loginWithGoogle() {
    await delay(350)
    return {
      token: 'mock-token',
      user: {
        id: 'user-demo',
        name: 'Google User',
        email: 'google@voice2doc.ai',
        plan: 'free',
        trialsUsed: 0,
        trialsLimit: 10,
      },
    }
  },
  async logout() {
    await delay(150)
    setToken(null)
  },
  async getSession() {
    return null
  },
}

const httpAuth: AuthService = {
  async login(email, password) {
    const session = await apiFetch<AuthSession>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      base(),
    )
    setToken(session.token)
    return session
  },
  async register(name, email, password) {
    const session = await apiFetch<AuthSession>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ name, email, password }) },
      base(),
    )
    setToken(session.token)
    return session
  },
  async loginWithGoogle() {
    throw new Error('Google OAuth is not configured in Phase 1. Use email/password.')
  },
  async logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' }, base())
    } finally {
      setToken(null)
    }
  },
  async getSession() {
    if (!getToken()) return null
    try {
      const session = await apiFetch<AuthSession>('/auth/session', {}, base())
      setToken(session.token)
      return session
    } catch {
      setToken(null)
      return null
    }
  },
}

export const authService: AuthService = env.useMockApi ? mockAuth : httpAuth
