const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface SessionEntry {
  id: string
  sessionId: string
  skillId: string
  skillName: string
  durationMinutes: number
  qualityScore: number
  xpEarned: number
  createdAt: string
}

export interface Session {
  id: string
  playerId: string
  domainId: string
  domainName: string
  date: string
  createdAt: string
  entries: SessionEntry[]
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('jwt') ?? ''
  return { Authorization: `Bearer ${token}` }
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? res.statusText)
  }
  return res.json()
}

export async function createSession(domainId: string): Promise<{ id: string; domainId: string; date: string }> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ domainId }),
  })
  return asJson(res)
}

export async function addEntry(
  sessionId: string,
  payload: { skillId: string; durationMinutes: number; qualityScore: number },
): Promise<SessionEntry> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/entries`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return asJson(res)
}

export async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${BASE}/sessions/${id}`, { headers: authHeaders() })
  return asJson(res)
}
