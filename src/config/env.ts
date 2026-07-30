/**
 * Environment + feature flags for demo → production swap.
 * Only VITE_* vars are exposed to the browser.
 */

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === '1' || value.toLowerCase() === 'true'
}

export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '',
  useMockApi: bool(import.meta.env.VITE_USE_MOCK_API as string | undefined, true),
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) || 'Voice2Doc AI',
  enableAnalytics: bool(import.meta.env.VITE_ENABLE_ANALYTICS as string | undefined, false),
} as const

export function apiUrl(path: string): string {
  const base = env.apiBaseUrl || '/api'
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
