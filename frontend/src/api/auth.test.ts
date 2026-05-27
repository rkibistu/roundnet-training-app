import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { register, login } from './auth'

const stubFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', stubFetch)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('register', () => {
  it('sends POST to /auth/register with email, password, and nickname', async () => {
    stubFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'jwt-abc' }),
    })

    const result = await register({ email: 'a@b.com', password: 'pw', nickname: 'spike' })

    expect(stubFetch).toHaveBeenCalledOnce()
    const [url, opts] = stubFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/auth/register')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual({ email: 'a@b.com', password: 'pw', nickname: 'spike' })
    expect(result).toEqual({ token: 'jwt-abc' })
  })

  it('omits nickname when not provided', async () => {
    stubFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'tok' }),
    })

    await register({ email: 'a@b.com', password: 'pw' })

    const body = JSON.parse(stubFetch.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('nickname')
  })

  it('throws with server error message on non-ok response', async () => {
    stubFetch.mockResolvedValue({
      ok: false,
      statusText: 'Conflict',
      json: () => Promise.resolve({ error: 'email already registered' }),
    })

    await expect(register({ email: 'a@b.com', password: 'pw' }))
      .rejects.toThrow('email already registered')
  })

  it('throws with statusText when response body has no error field', async () => {
    stubFetch.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
    })

    await expect(register({ email: 'a@b.com', password: 'pw' }))
      .rejects.toThrow('Internal Server Error')
  })

  it('throws with statusText when response body is not valid JSON', async () => {
    stubFetch.mockResolvedValue({
      ok: false,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new Error('invalid json')),
    })

    await expect(register({ email: 'a@b.com', password: 'pw' }))
      .rejects.toThrow('Bad Gateway')
  })
})

describe('login', () => {
  it('sends POST to /auth/login with email and password', async () => {
    stubFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'jwt-xyz' }),
    })

    const result = await login({ email: 'a@b.com', password: 'pw' })

    expect(stubFetch).toHaveBeenCalledOnce()
    const [url, opts] = stubFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/auth/login')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ email: 'a@b.com', password: 'pw' })
    expect(result).toEqual({ token: 'jwt-xyz' })
  })

  it('throws with server error message on invalid credentials', async () => {
    stubFetch.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: 'invalid credentials' }),
    })

    await expect(login({ email: 'a@b.com', password: 'wrong' }))
      .rejects.toThrow('invalid credentials')
  })
})
