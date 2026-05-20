const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface LevelBar {
  level: number
  xp: number
  xpFloor: number
  xpCeiling: number
}

export interface CategoryLevel extends LevelBar {
  categoryId: string
  categoryName: string
}

export interface RecentSession {
  id: string
  playerId: string
  date: string
  createdAt: string
  playerNickname: string | null
  totalDuration: number
}

export interface PlayerSummary {
  id: string
  nickname: string | null
  isAdmin: boolean
  generalLevel: LevelBar
}

export interface PlayerProfile extends PlayerSummary {
  categoryLevels: CategoryLevel[]
  recentSessions: RecentSession[]
}

export async function getPlayers(token: string): Promise<PlayerSummary[]> {
  const res = await fetch(`${BASE}/players`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function getPlayer(token: string, id: string): Promise<PlayerProfile> {
  const res = await fetch(`${BASE}/players/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function updateNickname(token: string, id: string, nickname: string): Promise<PlayerSummary> {
  const res = await fetch(`${BASE}/players/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nickname }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? res.statusText)
  }
  return res.json()
}
