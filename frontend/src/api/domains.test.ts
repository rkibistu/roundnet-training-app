import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { listDomains, createDomain, getDomain, updateDomain, deleteDomain } from './domains'

const originalFetch = global.fetch

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('jwt', 'test-token')
})

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('listDomains', () => {
  it('sends an authenticated GET to /domains and returns the parsed array', async () => {
    const fakeDomains = [
      { id: 'd1', name: 'Roundnet', ownerId: 'p1', accessibilityState: 'public' },
    ]
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeDomains),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await listDomains()

    expect(result).toEqual(fakeDomains)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/domains$/)
    expect((init as RequestInit).method ?? 'GET').toBe('GET')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-token' })
  })
})

describe('createDomain', () => {
  it('POSTs JSON to /domains with auth and returns the created Domain', async () => {
    const created = {
      id: 'd1',
      name: 'Roundnet',
      ownerId: 'p1',
      accessibilityState: 'public',
      rootDomainId: null,
      isAscended: false,
      createdAt: '2026-05-24T00:00:00.000Z',
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve(created),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await createDomain({ name: 'Roundnet', accessibilityState: 'public' })

    expect(result).toEqual(created)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/domains$/)
    const reqInit = init as RequestInit
    expect(reqInit.method).toBe('POST')
    expect(reqInit.headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(reqInit.body as string)).toEqual({ name: 'Roundnet', accessibilityState: 'public' })
  })
})

describe('getDomain', () => {
  it('sends an authenticated GET to /domains/:id and returns the parsed Domain', async () => {
    const domain = {
      id: 'd1',
      name: 'Roundnet',
      ownerId: 'p1',
      accessibilityState: 'public',
      rootDomainId: null,
      isAscended: false,
      createdAt: '2026-05-24T00:00:00.000Z',
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(domain),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await getDomain('d1')

    expect(result).toEqual(domain)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/domains\/d1$/)
    expect((init as RequestInit).method ?? 'GET').toBe('GET')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-token' })
  })
})

describe('updateDomain', () => {
  it('PATCHes /domains/:id with the given name and returns the updated Domain', async () => {
    const updated = {
      id: 'd1',
      name: 'New name',
      ownerId: 'p1',
      accessibilityState: 'public',
      rootDomainId: null,
      isAscended: false,
      createdAt: '2026-05-24T00:00:00.000Z',
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updated),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await updateDomain('d1', { name: 'New name' })

    expect(result).toEqual(updated)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/domains\/d1$/)
    const reqInit = init as RequestInit
    expect(reqInit.method).toBe('PATCH')
    expect(reqInit.headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(reqInit.body as string)).toEqual({ name: 'New name' })
  })

  it('PATCHes /domains/:id with accessibilityState alone', async () => {
    const updated = {
      id: 'd1',
      name: 'My Domain',
      ownerId: 'p1',
      accessibilityState: 'private',
      rootDomainId: null,
      isAscended: false,
      createdAt: '2026-05-24T00:00:00.000Z',
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updated),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await updateDomain('d1', { accessibilityState: 'private' })

    expect(result).toEqual(updated)
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ accessibilityState: 'private' })
  })
})

describe('deleteDomain', () => {
  it('sends an authenticated DELETE to /domains/:id and resolves on 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await deleteDomain('d1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/domains\/d1$/)
    const reqInit = init as RequestInit
    expect(reqInit.method).toBe('DELETE')
    expect(reqInit.headers).toMatchObject({ Authorization: 'Bearer test-token' })
  })
})
