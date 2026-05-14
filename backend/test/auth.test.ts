import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../src/app.js'
import prismaModule from '../src/db.js'

const prisma = new PrismaClient()

beforeEach(async () => {
  await prisma.player.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function registerPlayer(email: string, password: string) {
  await request(app).post('/auth/register').send({ email, password })
}

describe('POST /auth/register', () => {
  it('creates a Player and returns 201 with player data', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      email: 'alice@example.com',
      isAdmin: true,
    })
    expect(res.body.id).toBeDefined()
    expect(res.body.passwordHash).toBeUndefined()
  })

  it('first Player is Admin; subsequent Players are not', async () => {
    await request(app).post('/auth/register').send({ email: 'alice@example.com', password: 'pw' })
    const res = await request(app).post('/auth/register').send({ email: 'bob@example.com', password: 'pw' })

    expect(res.status).toBe(201)
    expect(res.body.isAdmin).toBe(false)
  })

  it('returns 409 when email is already registered', async () => {
    await request(app).post('/auth/register').send({ email: 'alice@example.com', password: 'pw' })
    const res = await request(app).post('/auth/register').send({ email: 'alice@example.com', password: 'other' })

    expect(res.status).toBe(409)
  })
})

describe('POST /auth/login', () => {
  it('returns a JWT for valid credentials', async () => {
    await registerPlayer('alice@example.com', 'password123')

    const res = await request(app).post('/auth/login').send({
      email: 'alice@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(200)
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.length).toBeGreaterThan(0)
  })

  it('returns 401 for wrong password', async () => {
    await registerPlayer('alice@example.com', 'password123')

    const res = await request(app).post('/auth/login').send({
      email: 'alice@example.com',
      password: 'wrong',
    })

    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(401)
  })
})

describe('JWT middleware', () => {
  it('rejects request to protected route without token', async () => {
    const res = await request(app).get('/protected-test')
    expect(res.status).toBe(401)
  })

  it('rejects request with an invalid token', async () => {
    const res = await request(app).get('/protected-test').set('Authorization', 'Bearer bad-token')
    expect(res.status).toBe(401)
  })

  it('allows request with a valid token and attaches player context', async () => {
    await registerPlayer('alice@example.com', 'password123')
    const loginRes = await request(app).post('/auth/login').send({ email: 'alice@example.com', password: 'password123' })
    const { token } = loginRes.body

    const res = await request(app).get('/protected-test').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.playerId).toBeDefined()
  })
})

describe('error handling', () => {
  it('returns 500 on register when the database throws unexpectedly', async () => {
    vi.spyOn(prismaModule.player, 'findUnique').mockRejectedValueOnce(new Error('db exploded'))

    const res = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(500)
    vi.restoreAllMocks()
  })

  it('returns 500 on login when the database throws unexpectedly', async () => {
    vi.spyOn(prismaModule.player, 'findUnique').mockRejectedValueOnce(new Error('db exploded'))

    const res = await request(app).post('/auth/login').send({
      email: 'alice@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(500)
    vi.restoreAllMocks()
  })
})
