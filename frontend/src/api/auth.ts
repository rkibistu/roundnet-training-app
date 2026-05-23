const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function request<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? res.statusText)
  }
  return res.json()
}

export interface RegisterPayload {
  email: string
  password: string
  nickname?: string
}

export interface AuthResult {
  token: string
}

export function register(payload: RegisterPayload): Promise<AuthResult> {
  return request('/auth/register', payload)
}

export function login(payload: { email: string; password: string }): Promise<AuthResult> {
  return request('/auth/login', payload)
}
