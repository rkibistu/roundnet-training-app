const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface LeaderboardEntry {
  rank: number
  playerId: string
  nickname: string | null
  level: number
  xp: number
}

export async function getLeaderboard(token: string): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${BASE}/leaderboard`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function getLeaderboardByCategory(token: string, categoryId: string): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${BASE}/leaderboard/${categoryId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}
