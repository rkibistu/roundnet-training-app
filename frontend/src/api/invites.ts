const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface InviteResult {
  code: string
}

export async function generateInvite(token: string): Promise<InviteResult> {
  const res = await fetch(`${BASE}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? res.statusText)
  }
  return res.json()
}
