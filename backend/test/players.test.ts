import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import app from '../src/app.js'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'

function makeToken(playerId: string, isAdmin = false) {
  return jwt.sign({ sub: playerId, is_admin: isAdmin }, JWT_SECRET, { expiresIn: '1h' })
}

async function createPlayer(email: string, nickname?: string): Promise<string> {
  const player = await prisma.player.create({
    data: { email, passwordHash: 'x', nickname },
  })
  return player.id
}

async function getCategory(): Promise<{ id: string; name: string }> {
  return prisma.category.findFirstOrThrow()
}

async function createExercise(playerId: string, categoryId: string): Promise<string> {
  const exercise = await prisma.exercise.create({
    data: { name: 'Test exercise', categoryId, createdBy: playerId },
  })
  return exercise.id
}

async function earnXP(playerId: string, categoryId: string, xp: number, exerciseId: string): Promise<void> {
  const session = await prisma.session.create({ data: { playerId, date: new Date() } })
  await prisma.sessionEntry.create({
    data: {
      sessionId: session.id,
      exerciseId,
      durationMinutes: 10,
      qualityScore: 3,
      xpEarned: xp,
      xpLedger: {
        create: [
          { playerId, categoryId: null, xp },
          { playerId, categoryId, xp },
        ],
      },
    },
  })
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

// ─── GET /players ───────────────────────────────────────────────────────────

describe('GET /players', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/players')
    expect(res.status).toBe(401)
  })

  it('returns all players with generalLevel derived from xp_ledger', async () => {
    const alice = await createPlayer('alice@example.com', 'Alice')
    const category = await getCategory()
    const exerciseId = await createExercise(alice, category.id)
    await earnXP(alice, category.id, 50, exerciseId)

    const res = await request(app)
      .get('/players')
      .set('Authorization', `Bearer ${makeToken(alice)}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    const player = res.body[0]
    expect(player.id).toBe(alice)
    expect(player.nickname).toBe('Alice')
    expect(player.isAdmin).toBe(false)
    expect(player.generalLevel).toMatchObject({ level: expect.any(Number), xp: 50 })
    expect(player.generalLevel.level).toBeGreaterThanOrEqual(1)
  })
})

// ─── GET /players/:id ───────────────────────────────────────────────────────

describe('GET /players/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/players/abc')
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown player', async () => {
    const alice = await createPlayer('alice@example.com')
    const res = await request(app)
      .get('/players/nonexistent-id')
      .set('Authorization', `Bearer ${makeToken(alice)}`)
    expect(res.status).toBe(404)
  })

  it('returns correct General Level and XP floor/ceiling from xp_ledger', async () => {
    const alice = await createPlayer('alice@example.com', 'Alice')
    const category = await getCategory()
    const exerciseId = await createExercise(alice, category.id)
    await earnXP(alice, category.id, 50, exerciseId)

    const res = await request(app)
      .get(`/players/${alice}`)
      .set('Authorization', `Bearer ${makeToken(alice)}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(alice)
    expect(res.body.nickname).toBe('Alice')
    expect(res.body.isAdmin).toBe(false)
    const gl = res.body.generalLevel
    expect(gl.xp).toBe(50)
    expect(gl.level).toBeGreaterThanOrEqual(1)
    expect(typeof gl.xpFloor).toBe('number')
    expect(typeof gl.xpCeiling).toBe('number')
    expect(gl.xpFloor).toBeLessThanOrEqual(gl.xp)
    expect(gl.xpCeiling).toBeGreaterThan(gl.xp)
  })

  it('returns correct Category Level with xp floor/ceiling per category', async () => {
    const alice = await createPlayer('alice@example.com', 'Alice')
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    const [catA, catB] = categories
    const exA = await createExercise(alice, catA.id)
    const exB = await createExercise(alice, catB.id)
    await earnXP(alice, catA.id, 30, exA)
    await earnXP(alice, catB.id, 20, exB)

    const res = await request(app)
      .get(`/players/${alice}`)
      .set('Authorization', `Bearer ${makeToken(alice)}`)

    expect(res.status).toBe(200)
    const cl = res.body.categoryLevels as Array<{
      categoryId: string; categoryName: string; level: number; xp: number; xpFloor: number; xpCeiling: number
    }>
    expect(cl.length).toBeGreaterThanOrEqual(2)

    const clA = cl.find(c => c.categoryId === catA.id)
    const clB = cl.find(c => c.categoryId === catB.id)
    expect(clA).toBeDefined()
    expect(clB).toBeDefined()
    expect(clA!.xp).toBe(30)
    expect(clB!.xp).toBe(20)
    expect(typeof clA!.categoryName).toBe('string')
    expect(clA!.xpFloor).toBeLessThanOrEqual(clA!.xp)
    expect(clA!.xpCeiling).toBeGreaterThan(clA!.xp)
  })

  it('returns at most 10 most recent Sessions', async () => {
    const alice = await createPlayer('alice@example.com', 'Alice')
    for (let i = 0; i < 12; i++) {
      const d = new Date(`2026-01-${String(i + 1).padStart(2, '0')}`)
      await prisma.session.create({ data: { playerId: alice, date: d } })
    }

    const res = await request(app)
      .get(`/players/${alice}`)
      .set('Authorization', `Bearer ${makeToken(alice)}`)

    expect(res.status).toBe(200)
    expect(res.body.recentSessions).toHaveLength(10)
    // most recent first
    const dates = res.body.recentSessions.map((s: { date: string }) => s.date.slice(0, 10))
    expect(dates[0]).toBe('2026-01-12')
    expect(dates[9]).toBe('2026-01-03')
  })

  it('includes playerNickname and totalDuration in recentSessions', async () => {
    const alice = await createPlayer('alice@example.com', 'Alice')
    const category = await getCategory()
    const exerciseId = await createExercise(alice, category.id)
    const session = await prisma.session.create({ data: { playerId: alice, date: new Date() } })
    await prisma.sessionEntry.create({
      data: {
        sessionId: session.id,
        exerciseId,
        durationMinutes: 25,
        qualityScore: 3,
        xpEarned: 10,
        xpLedger: { create: [{ playerId: alice, categoryId: null, xp: 10 }, { playerId: alice, categoryId: category.id, xp: 10 }] },
      },
    })

    const res = await request(app)
      .get(`/players/${alice}`)
      .set('Authorization', `Bearer ${makeToken(alice)}`)

    expect(res.status).toBe(200)
    const s = res.body.recentSessions[0]
    expect(s.playerNickname).toBe('Alice')
    expect(s.totalDuration).toBe(25)
  })
})

// ─── PATCH /players/:id ─────────────────────────────────────────────────────

describe('PATCH /players/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch('/players/abc').send({ nickname: 'X' })
    expect(res.status).toBe(401)
  })

  it('updates own nickname and returns updated player', async () => {
    const alice = await createPlayer('alice@example.com', 'Alice')

    const res = await request(app)
      .patch(`/players/${alice}`)
      .set('Authorization', `Bearer ${makeToken(alice)}`)
      .send({ nickname: 'AliceUpdated' })

    expect(res.status).toBe(200)
    expect(res.body.nickname).toBe('AliceUpdated')
    const updated = await prisma.player.findUniqueOrThrow({ where: { id: alice } })
    expect(updated.nickname).toBe('AliceUpdated')
  })

  it('returns 403 when targeting another player', async () => {
    const alice = await createPlayer('alice@example.com', 'Alice')
    const bob = await createPlayer('bob@example.com', 'Bob')

    const res = await request(app)
      .patch(`/players/${bob}`)
      .set('Authorization', `Bearer ${makeToken(alice)}`)
      .send({ nickname: 'Hacked' })

    expect(res.status).toBe(403)
  })
})
