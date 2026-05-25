const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface Domain {
  id: string
  name: string
  ownerId: string
  accessibilityState: 'public' | 'protected' | 'private'
  rootDomainId: string | null
  isAscended: boolean
  createdAt: string
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('jwt') ?? ''
  return { Authorization: `Bearer ${token}` }
}

export async function listDomains(): Promise<Domain[]> {
  const res = await fetch(`${BASE}/domains`, { headers: authHeaders() })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? res.statusText)
  }
  return res.json()
}

export async function getDomain(id: string): Promise<Domain> {
  const res = await fetch(`${BASE}/domains/${id}`, { headers: authHeaders() })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? res.statusText)
  }
  return res.json()
}

export interface CreateDomainPayload {
  name: string
  accessibilityState?: 'public' | 'protected' | 'private'
}

export async function createDomain(payload: CreateDomainPayload): Promise<Domain> {
  const res = await fetch(`${BASE}/domains`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? res.statusText)
  }
  return res.json()
}

export interface UpdateDomainPayload {
  name?: string
  accessibilityState?: 'protected' | 'private'
}

export async function updateDomain(id: string, payload: UpdateDomainPayload): Promise<Domain> {
  const res = await fetch(`${BASE}/domains/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? res.statusText)
  }
  return res.json()
}

export async function fractureDomain(id: string, payload: { name?: string } = {}): Promise<Domain> {
  const res = await fetch(`${BASE}/domains/${id}/fracture`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? res.statusText)
  }
  return res.json()
}

export async function deleteDomain(id: string): Promise<void> {
  const res = await fetch(`${BASE}/domains/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? res.statusText)
  }
}
