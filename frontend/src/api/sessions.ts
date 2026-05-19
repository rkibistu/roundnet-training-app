const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface Session {
  id: string
  playerId: string
  date: string
  createdAt: string
}

export interface SessionEntry {
  id: string
  sessionId: string
  exerciseId: string
  durationMinutes: number
  qualityScore: number
  xpEarned: number
  createdAt: string
}

export async function createSession(token: string, date?: string): Promise<Session> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(date ? { date } : {}),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? res.statusText)
  }
  return res.json()
}

export async function getSessions(token: string, playerId: string): Promise<Session[]> {
  const res = await fetch(`${BASE}/sessions?player_id=${playerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function createSessionEntry(
  token: string,
  sessionId: string,
  data: { exercise_id: string; duration_minutes: number; quality_score: number }
): Promise<SessionEntry> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? res.statusText)
  }
  return res.json()
}
