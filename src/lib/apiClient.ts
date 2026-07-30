const TOKEN_KEY = 'v2d-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  baseUrl: string,
): Promise<T> {
  const headers = new Headers(init.headers)
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (!headers.has('Content-Type') && init.body && !isForm) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
  })

  if (res.status === 204) return undefined as T

  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new ApiError(res.status, data.error || res.statusText || 'Request failed')
  }
  return data as T
}
