const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface Skill {
  id: string
  name: string
  domainId: string
  archivedAt: string | null
  createdAt: string
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

export async function listSkills(domainId: string, opts: { includeArchived?: boolean } = {}): Promise<Skill[]> {
  const qs = opts.includeArchived ? '?includeArchived=true' : ''
  const res = await fetch(`${BASE}/domains/${domainId}/skills${qs}`, { headers: authHeaders() })
  return asJson<Skill[]>(res)
}

export async function createSkill(domainId: string, name: string): Promise<Skill> {
  const res = await fetch(`${BASE}/domains/${domainId}/skills`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return asJson<Skill>(res)
}

export class SkillHasPairError extends Error {
  readonly hasPair = true
  constructor() {
    super('Skill has a pair — specify breakPair')
  }
}

export async function renameSkill(domainId: string, skillId: string, name: string, breakPair?: boolean): Promise<Skill> {
  const body: Record<string, unknown> = { name }
  if (breakPair !== undefined) body.breakPair = breakPair
  const res = await fetch(`${BASE}/domains/${domainId}/skills/${skillId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}))
    if (data.hasPair) throw new SkillHasPairError()
  }
  return asJson<Skill>(res)
}

export async function archiveSkill(domainId: string, skillId: string): Promise<void> {
  const res = await fetch(`${BASE}/domains/${domainId}/skills/${skillId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? res.statusText)
  }
}

export async function restoreSkill(domainId: string, skillId: string): Promise<Skill> {
  const res = await fetch(`${BASE}/domains/${domainId}/skills/${skillId}/restore`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return asJson<Skill>(res)
}
