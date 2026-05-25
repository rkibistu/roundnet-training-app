import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { listSkills, createSkill, renameSkill, archiveSkill, restoreSkill } from './skills'

const originalFetch = global.fetch

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('jwt', 'test-token')
})

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

function mockFetch(body: unknown, init: Partial<Response> = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    ...init,
  })
  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

describe('listSkills', () => {
  it('GETs /domains/:id/skills with auth', async () => {
    const skills = [{ id: 's1', name: 'Serving', domainId: 'd1', archivedAt: null, createdAt: '' }]
    const fetchMock = mockFetch(skills)

    const result = await listSkills('d1')

    expect(result).toEqual(skills)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/domains\/d1\/skills$/)
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-token' })
  })

  it('appends ?includeArchived=true when asked', async () => {
    const fetchMock = mockFetch([])
    await listSkills('d1', { includeArchived: true })
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/domains\/d1\/skills\?includeArchived=true$/)
  })
})

describe('createSkill', () => {
  it('POSTs JSON with name and returns the new Skill', async () => {
    const created = { id: 's1', name: 'Serving', domainId: 'd1', archivedAt: null, createdAt: '' }
    const fetchMock = mockFetch(created, { status: 201 })

    const result = await createSkill('d1', 'Serving')
    expect(result).toEqual(created)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/domains\/d1\/skills$/)
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: 'Serving' })
  })
})

describe('renameSkill', () => {
  it('PATCHes /domains/:id/skills/:skillId with the new name', async () => {
    const updated = { id: 's1', name: 'New', domainId: 'd1', archivedAt: null, createdAt: '' }
    const fetchMock = mockFetch(updated)

    const result = await renameSkill('d1', 's1', 'New')
    expect(result).toEqual(updated)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/domains\/d1\/skills\/s1$/)
    expect((init as RequestInit).method).toBe('PATCH')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: 'New' })
  })
})

describe('archiveSkill', () => {
  it('DELETEs /domains/:id/skills/:skillId', async () => {
    const fetchMock = mockFetch({}, { status: 204 })
    await archiveSkill('d1', 's1')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/domains\/d1\/skills\/s1$/)
    expect((init as RequestInit).method).toBe('DELETE')
  })
})

describe('restoreSkill', () => {
  it('POSTs /domains/:id/skills/:skillId/restore', async () => {
    const restored = { id: 's1', name: 'X', domainId: 'd1', archivedAt: null, createdAt: '' }
    const fetchMock = mockFetch(restored)
    const result = await restoreSkill('d1', 's1')
    expect(result).toEqual(restored)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/domains\/d1\/skills\/s1\/restore$/)
    expect((init as RequestInit).method).toBe('POST')
  })
})
