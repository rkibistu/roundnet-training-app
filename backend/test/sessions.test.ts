import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import app from '../src/app.js'
import { calculateXP } from '../src/xpEngine.js'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'

function makeToken(playerId: string) {
  return jwt.sign({ sub: playerId, is_admin: false }, JWT_SECRET, { expiresIn: '1h' })
}

async function createPlayer(email: string): Promise<string> {
  const player = await prisma.player.create({ data: { email, passwordHash: 'x' } })
  return player.id
}

async function createExercise(playerId: string, categoryId: string): Promise<string> {
  const exercise = await prisma.exercise.create({
    data: { name: 'Test exercise', categoryId, createdBy: playerId },
  })
  return exercise.id
}

async function getCategory(): Promise<{ id: string; name: string }> {
  return prisma.category.findFirstOrThrow()
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

describe('POST /sessions/:id/entries', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/sessions/abc/entries').send({})
    expect(res.status).toBe(401)
  })

  it('returns entry with xp_earned matching calculateXP', async () => {
    const playerId = await createPlayer('alice@example.com')
    const category = await getCategory()
    const exerciseId = await createExercise(playerId, category.id)

    const sessionRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({})
    const sessionId = sessionRes.body.id

    const res = await request(app)
      .post(`/sessions/${sessionId}/entries`)
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ exercise_id: exerciseId, duration_minutes: 20, quality_score: 3 })

    expect(res.status).toBe(201)
    expect(res.body.xpEarned).toBe(calculateXP(20, 3))
  })

  it('writes two xp_ledger rows per entry: one general, one category-specific', async () => {
    const playerId = await createPlayer('alice@example.com')
    const category = await getCategory()
    const exerciseId = await createExercise(playerId, category.id)

    const sessionRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({})
    const sessionId = sessionRes.body.id

    await request(app)
      .post(`/sessions/${sessionId}/entries`)
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ exercise_id: exerciseId, duration_minutes: 10, quality_score: 4 })

    const ledger = await prisma.xpLedger.findMany({ where: { playerId } })
    expect(ledger).toHaveLength(2)

    const general = ledger.find(r => r.categoryId === null)
    const categoryRow = ledger.find(r => r.categoryId === category.id)
    expect(general).toBeDefined()
    expect(categoryRow).toBeDefined()
    expect(general!.xp).toBe(calculateXP(10, 4))
    expect(categoryRow!.xp).toBe(calculateXP(10, 4))
  })

  it('XP from different categories accumulates independently', async () => {
    const playerId = await createPlayer('alice@example.com')
    const categories = await prisma.category.findMany({ take: 2, orderBy: { name: 'asc' } })
    const [catA, catB] = categories
    const exA = await createExercise(playerId, catA.id)
    const exB = await createExercise(playerId, catB.id)

    const sessionRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({})
    const sessionId = sessionRes.body.id

    await request(app)
      .post(`/sessions/${sessionId}/entries`)
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ exercise_id: exA, duration_minutes: 10, quality_score: 2 })

    await request(app)
      .post(`/sessions/${sessionId}/entries`)
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ exercise_id: exB, duration_minutes: 15, quality_score: 5 })

    const catALedger = await prisma.xpLedger.findMany({ where: { playerId, categoryId: catA.id } })
    const catBLedger = await prisma.xpLedger.findMany({ where: { playerId, categoryId: catB.id } })

    expect(catALedger).toHaveLength(1)
    expect(catBLedger).toHaveLength(1)
    expect(catALedger[0].xp).toBe(calculateXP(10, 2))
    expect(catBLedger[0].xp).toBe(calculateXP(15, 5))
  })

  it('general XP accumulates across all categories', async () => {
    const playerId = await createPlayer('alice@example.com')
    const categories = await prisma.category.findMany({ take: 2, orderBy: { name: 'asc' } })
    const [catA, catB] = categories
    const exA = await createExercise(playerId, catA.id)
    const exB = await createExercise(playerId, catB.id)

    const sessionRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({})
    const sessionId = sessionRes.body.id

    await request(app)
      .post(`/sessions/${sessionId}/entries`)
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ exercise_id: exA, duration_minutes: 10, quality_score: 2 })

    await request(app)
      .post(`/sessions/${sessionId}/entries`)
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ exercise_id: exB, duration_minutes: 20, quality_score: 3 })

    const generalLedger = await prisma.xpLedger.findMany({ where: { playerId, categoryId: null } })
    expect(generalLedger).toHaveLength(2)

    const totalXP = generalLedger.reduce((sum, r) => sum + r.xp, 0)
    expect(totalXP).toBe(calculateXP(10, 2) + calculateXP(20, 3))
  })
})

describe('GET /sessions', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/sessions?player_id=abc')
    expect(res.status).toBe(401)
  })

  it('returns sessions for the specified player', async () => {
    const alice = await createPlayer('alice@example.com')
    const bob = await createPlayer('bob@example.com')

    await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${makeToken(alice)}`)
      .send({})
    await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${makeToken(bob)}`)
      .send({})

    const res = await request(app)
      .get(`/sessions?player_id=${alice}`)
      .set('Authorization', `Bearer ${makeToken(alice)}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].playerId).toBe(alice)
  })
})

describe('POST /sessions', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/sessions').send({})
    expect(res.status).toBe(401)
  })

  it('creates a session with date defaulting to today', async () => {
    const playerId = await createPlayer('alice@example.com')
    const today = new Date().toISOString().slice(0, 10)

    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({})

    expect(res.status).toBe(201)
    expect(res.body.playerId).toBe(playerId)
    expect(res.body.date.slice(0, 10)).toBe(today)
  })

  it('creates a session with a specified date', async () => {
    const playerId = await createPlayer('alice@example.com')

    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ date: '2026-01-15' })

    expect(res.status).toBe(201)
    expect(res.body.date.slice(0, 10)).toBe('2026-01-15')
  })
})
