import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../src/app.js'

const prisma = new PrismaClient()

beforeEach(async () => {
  await prisma.xpLedger.deleteMany()
  await prisma.sessionEntry.deleteMany()
  await prisma.session.deleteMany()
  await prisma.skillPair.deleteMany()
  await prisma.attunement.deleteMany()
  await prisma.skill.deleteMany()
  await prisma.habitDomain.deleteMany()
  await prisma.player.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

function decodeJwtPayload(token: string) {
  const base64 = token.split('.')[1]
  return JSON.parse(Buffer.from(base64, 'base64').toString())
}

describe('full-stack integration: frontend API → backend → database', () => {
  it('register → login → decode JWT (frontend contract) → access protected route → verify DB state', async () => {
    // Step 1: Register — simulates frontend calling POST /auth/register
    const registerRes = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'alice@example.com', password: 'secret123', nickname: 'Alice' })

    expect(registerRes.status).toBe(201)
    expect(registerRes.body).toMatchObject({
      email: 'alice@example.com',
      nickname: 'Alice',
      isAdmin: true,
    })
    const playerId = registerRes.body.id

    // Step 2: Verify player exists in DB with correct fields
    const dbPlayer = await prisma.player.findUnique({ where: { email: 'alice@example.com' } })
    expect(dbPlayer).not.toBeNull()
    expect(dbPlayer!.id).toBe(playerId)
    expect(dbPlayer!.nickname).toBe('Alice')
    expect(dbPlayer!.isAdmin).toBe(true)
    expect(dbPlayer!.passwordHash).not.toBe('secret123')

    // Step 3: Login — simulates frontend calling POST /auth/login
    const loginRes = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'alice@example.com', password: 'secret123' })

    expect(loginRes.status).toBe(200)
    const { token } = loginRes.body
    expect(token).toBeDefined()
    expect(token.split('.')).toHaveLength(3)

    // Step 4: Decode JWT the same way the frontend does (base64 decode payload)
    // This validates the frontend/backend contract — the JWT must contain
    // the exact fields the frontend's AuthContext.decodePayload expects
    const claims = decodeJwtPayload(token)
    expect(claims.sub).toBe(playerId)
    expect(claims.email).toBe('alice@example.com')
    expect(claims.nickname).toBe('Alice')
    expect(typeof claims.is_admin).toBe('boolean')
    expect(claims.is_admin).toBe(true)

    // Step 5: Use JWT to access protected route — proves the token is valid
    const protectedRes = await request(app)
      .get('/protected-test')
      .set('Authorization', `Bearer ${token}`)

    expect(protectedRes.status).toBe(200)
    expect(protectedRes.body.playerId).toBe(playerId)
  })

  it('register second player → login → JWT shows non-admin → DB has two players', async () => {
    // Register first player (becomes admin)
    await request(app)
      .post('/auth/register')
      .send({ email: 'admin@example.com', password: 'pw' })

    // Register second player (not admin)
    const regRes = await request(app)
      .post('/auth/register')
      .send({ email: 'bob@example.com', password: 'bobpw', nickname: 'Bob' })

    expect(regRes.status).toBe(201)
    expect(regRes.body.isAdmin).toBe(false)

    // Login as second player
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'bob@example.com', password: 'bobpw' })

    const claims = decodeJwtPayload(loginRes.body.token)
    expect(claims.is_admin).toBe(false)
    expect(claims.nickname).toBe('Bob')

    // Verify DB state
    const count = await prisma.player.count()
    expect(count).toBe(2)

    // Protected route works with Bob's token too
    const protectedRes = await request(app)
      .get('/protected-test')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
    expect(protectedRes.status).toBe(200)
    expect(protectedRes.body.playerId).toBe(regRes.body.id)
  })

  it('duplicate registration fails → login with original credentials still works', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'original', nickname: 'Alice' })

    // Attempt duplicate registration
    const dupeRes = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'different', nickname: 'Imposter' })
    expect(dupeRes.status).toBe(409)

    // Original credentials still work
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'original' })
    expect(loginRes.status).toBe(200)

    const claims = decodeJwtPayload(loginRes.body.token)
    expect(claims.nickname).toBe('Alice')

    // Only one player in DB
    const count = await prisma.player.count()
    expect(count).toBe(1)

    // The "different" password doesn't work
    const badLoginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'different' })
    expect(badLoginRes.status).toBe(401)
  })
})
