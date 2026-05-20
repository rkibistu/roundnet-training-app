import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import app from '../src/app.js'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'

function makeToken(playerId: string) {
  return jwt.sign({ sub: playerId, is_admin: false }, JWT_SECRET, { expiresIn: '1h' })
}

async function createPlayer(email: string): Promise<string> {
  const player = await prisma.player.create({ data: { email, passwordHash: 'x' } })
  return player.id
}

async function addXP(playerId: string, categoryId: string | null, xp: number, sourceEntryId: string) {
  await prisma.xpLedger.create({ data: { playerId, categoryId, xp, sourceEntryId } })
}

async function createEntry(sessionId: string, exerciseId: string): Promise<string> {
  const entry = await prisma.sessionEntry.create({
    data: { sessionId, exerciseId, durationMinutes: 10, qualityScore: 3, xpEarned: 0 },
  })
  return entry.id
}

async function createSession(playerId: string): Promise<string> {
  const session = await prisma.session.create({ data: { playerId, date: new Date() } })
  return session.id
}

beforeEach(async () => {
  await prisma.xpLedger.deleteMany()
  await prisma.sessionEntry.deleteMany()
  await prisma.session.deleteMany()
  await prisma.exercise.deleteMany()
  await prisma.invite.deleteMany()
  await prisma.player.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /leaderboard', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/leaderboard')
    expect(res.status).toBe(401)
  })

  it('returns all Players sorted by General Level descending', async () => {
    const aliceId = await createPlayer('alice@example.com')
    const bobId = await createPlayer('bob@example.com')
    const token = makeToken(aliceId)

    const catRes = await request(app).get('/categories')
    const categoryId = catRes.body[0].id

    const aliceSession = await createSession(aliceId)
    const exercise = await prisma.exercise.create({
      data: { name: 'Test Ex', categoryId, createdBy: aliceId },
    })
    const aliceEntry = await createEntry(aliceSession, exercise.id)
    await addXP(aliceId, null, 200, aliceEntry)

    const res = await request(app)
      .get('/leaderboard')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].playerId).toBe(aliceId)
    expect(res.body[1].playerId).toBe(bobId)
    expect(res.body[0].level).toBeGreaterThan(res.body[1].level)
  })

  it('Players with 0 XP appear at level 1', async () => {
    const playerId = await createPlayer('zero@example.com')
    const token = makeToken(playerId)

    const res = await request(app)
      .get('/leaderboard')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].level).toBe(1)
    expect(res.body[0].xp).toBe(0)
  })
})

describe('GET /leaderboard/:category_id', () => {
  it('returns 401 without auth', async () => {
    const catRes = await request(app).get('/categories')
    const categoryId = catRes.body[0].id
    const res = await request(app).get(`/leaderboard/${categoryId}`)
    expect(res.status).toBe(401)
  })

  it('returns all Players sorted by Category Level descending', async () => {
    const aliceId = await createPlayer('alice@example.com')
    const bobId = await createPlayer('bob@example.com')
    const token = makeToken(aliceId)

    const catRes = await request(app).get('/categories')
    const categoryId = catRes.body[0].id

    const aliceSession = await createSession(aliceId)
    const exercise = await prisma.exercise.create({
      data: { name: 'Test Ex', categoryId, createdBy: aliceId },
    })
    const aliceEntry = await createEntry(aliceSession, exercise.id)
    await addXP(aliceId, categoryId, 200, aliceEntry)

    const res = await request(app)
      .get(`/leaderboard/${categoryId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].playerId).toBe(aliceId)
    expect(res.body[1].playerId).toBe(bobId)
    expect(res.body[0].level).toBeGreaterThan(res.body[1].level)
  })

  it('Players with 0 XP in the category still appear at level 1', async () => {
    const aliceId = await createPlayer('alice@example.com')
    const bobId = await createPlayer('bob@example.com')
    const token = makeToken(aliceId)

    const catRes = await request(app).get('/categories')
    const categoryId = catRes.body[0].id

    const aliceSession = await createSession(aliceId)
    const exercise = await prisma.exercise.create({
      data: { name: 'Test Ex', categoryId, createdBy: aliceId },
    })
    const aliceEntry = await createEntry(aliceSession, exercise.id)
    await addXP(aliceId, categoryId, 300, aliceEntry)

    const res = await request(app)
      .get(`/leaderboard/${categoryId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    const bob = res.body.find((r: { playerId: string }) => r.playerId === bobId)
    expect(bob.level).toBe(1)
    expect(bob.xp).toBe(0)
  })

  it('each row includes rank, playerId, nickname, level, xp', async () => {
    const aliceId = await createPlayer('alice@example.com')
    await prisma.player.update({ where: { id: aliceId }, data: { nickname: 'Alice' } })
    const token = makeToken(aliceId)

    const res = await request(app)
      .get('/leaderboard')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const row = res.body[0]
    expect(row).toHaveProperty('rank')
    expect(row).toHaveProperty('playerId')
    expect(row).toHaveProperty('nickname')
    expect(row).toHaveProperty('level')
    expect(row).toHaveProperty('xp')
  })
})
