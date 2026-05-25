import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../src/app.js'
import { calculateXP } from '../src/xpEngine.js'

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

async function registerAndLogin(email: string): Promise<{ token: string; playerId: string }> {
  const reg = await request(app).post('/auth/register').send({ email, password: 'pw' })
  const login = await request(app).post('/auth/login').send({ email, password: 'pw' })
  return { token: login.body.token, playerId: reg.body.id }
}

async function makeDomain(ownerId: string, name = 'D', state = 'public') {
  return prisma.habitDomain.create({ data: { name, ownerId, accessibilityState: state } })
}

async function makeSkill(domainId: string, name = 'Serve') {
  return prisma.skill.create({ data: { name, domainId } })
}

describe('GET /sessions/:id', () => {
  it('returns the Session with domainName and skillName per entry', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId, 'Roundnet')
    const skill = await makeSkill(domain.id, 'Serving')
    const sessionRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ domainId: domain.id })
    const sessionId = sessionRes.body.id
    await request(app)
      .post(`/sessions/${sessionId}/entries`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ skillId: skill.id, durationMinutes: 15, qualityScore: 5 })

    const res = await request(app)
      .get(`/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: sessionId, domainId: domain.id, domainName: 'Roundnet' })
    expect(res.body.entries).toHaveLength(1)
    expect(res.body.entries[0]).toMatchObject({ skillId: skill.id, skillName: 'Serving' })
    expect(res.body.entries[0].xpEarned).toBeGreaterThan(0)
  })
})

describe('POST /sessions/:id/entries', () => {
  it('returns 400 when skillId does not belong to the Session Domain', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId, 'Roundnet')
    const otherDomain = await makeDomain(alice.playerId, 'Fitness')
    const foreignSkill = await makeSkill(otherDomain.id, 'Running')
    const sessionRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ domainId: domain.id })
    const sessionId = sessionRes.body.id

    const res = await request(app)
      .post(`/sessions/${sessionId}/entries`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ skillId: foreignSkill.id, durationMinutes: 20, qualityScore: 2 })

    expect(res.status).toBe(400)
    expect(await prisma.sessionEntry.count()).toBe(0)
  })

  it('creates exactly three XpLedger rows per entry — Skill, Domain, and General', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId, 'Roundnet')
    const skill = await makeSkill(domain.id, 'Serving')
    const sessionRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ domainId: domain.id })
    const sessionId = sessionRes.body.id

    await request(app)
      .post(`/sessions/${sessionId}/entries`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ skillId: skill.id, durationMinutes: 20, qualityScore: 4 })

    const ledger = await prisma.xpLedger.findMany({ where: { playerId: alice.playerId } })
    expect(ledger).toHaveLength(3)

    const skillRow = ledger.find(r => r.skillId === skill.id && r.domainId === null)
    const domainRow = ledger.find(r => r.domainId === domain.id && r.skillId === null)
    const generalRow = ledger.find(r => r.skillId === null && r.domainId === null)

    expect(skillRow).toBeDefined()
    expect(domainRow).toBeDefined()
    expect(generalRow).toBeDefined()
    const expectedXp = calculateXP(20, 4)
    expect(skillRow!.xp).toBe(expectedXp)
    expect(domainRow!.xp).toBe(expectedXp)
    expect(generalRow!.xp).toBe(expectedXp)
  })

  it('creates an Entry under a Session when skillId belongs to the Session Domain', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId, 'Roundnet')
    const skill = await makeSkill(domain.id, 'Serving')
    const sessionRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ domainId: domain.id })
    const sessionId = sessionRes.body.id

    const res = await request(app)
      .post(`/sessions/${sessionId}/entries`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ skillId: skill.id, durationMinutes: 30, qualityScore: 3 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ sessionId, skillId: skill.id, durationMinutes: 30, qualityScore: 3 })
    expect(res.body.xpEarned).toBeGreaterThan(0)
  })
})

describe('POST /sessions', () => {
  it('returns 400 when domainId is missing', async () => {
    const alice = await registerAndLogin('alice@example.com')

    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 403 when the caller is not the Domain owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const domain = await makeDomain(alice.playerId, 'Roundnet')

    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ domainId: domain.id })

    expect(res.status).toBe(403)
    expect(await prisma.session.count()).toBe(0)
  })

  it('creates a Session in the Domain when the caller is the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId, 'Roundnet')

    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ domainId: domain.id })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ domainId: domain.id, playerId: alice.playerId })
    expect(res.body.id).toBeDefined()
    expect(res.body.date).toBeDefined()
  })
})
