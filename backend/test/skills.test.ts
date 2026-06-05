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

async function registerAndLogin(email: string): Promise<{ token: string; playerId: string }> {
  const reg = await request(app).post('/auth/register').send({ email, password: 'pw' })
  const login = await request(app).post('/auth/login').send({ email, password: 'pw' })
  return { token: login.body.token, playerId: reg.body.id }
}

async function makeDomain(ownerId: string, name = 'D', state = 'public') {
  return prisma.habitDomain.create({ data: { name, ownerId, accessibilityState: state } })
}

describe('POST /domains/:id/skills', () => {
  it('creates a Skill in the Domain when the caller is the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId, 'Roundnet')

    const res = await request(app)
      .post(`/domains/${domain.id}/skills`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Serving' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Serving', domainId: domain.id, archivedAt: null })
    expect(res.body.id).toBeDefined()

    const stored = await prisma.skill.findUnique({ where: { id: res.body.id } })
    expect(stored?.name).toBe('Serving')
  })

  it('returns 401 unauthenticated', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId)
    const res = await request(app).post(`/domains/${domain.id}/skills`).send({ name: 'X' })
    expect(res.status).toBe(401)
  })

  it('returns 403 when the caller is not the Domain owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const aliceDomain = await makeDomain(alice.playerId)

    const res = await request(app)
      .post(`/domains/${aliceDomain.id}/skills`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ name: 'Sneaky' })

    expect(res.status).toBe(403)
    expect(await prisma.skill.count()).toBe(0)
  })

  it('returns 400 when name is missing or only whitespace', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId)
    const a = await request(app).post(`/domains/${domain.id}/skills`).set('Authorization', `Bearer ${alice.token}`).send({})
    expect(a.status).toBe(400)
    const b = await request(app).post(`/domains/${domain.id}/skills`).set('Authorization', `Bearer ${alice.token}`).send({ name: '  ' })
    expect(b.status).toBe(400)
  })

  it('returns 404 when the Domain does not exist', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const res = await request(app)
      .post('/domains/missing-id/skills')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'X' })
    expect(res.status).toBe(404)
  })
})

describe('GET /domains/:id/skills', () => {
  it('lists active Skills in the Domain, hiding archived ones by default', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId)
    await prisma.skill.create({ data: { name: 'Serving', domainId: domain.id } })
    await prisma.skill.create({ data: { name: 'Defense', domainId: domain.id } })
    await prisma.skill.create({ data: { name: 'OldThing', domainId: domain.id, archivedAt: new Date() } })

    const res = await request(app).get(`/domains/${domain.id}/skills`).set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    const names = (res.body as Array<{ name: string }>).map(s => s.name).sort()
    expect(names).toEqual(['Defense', 'Serving'])
  })

  it('includes archived Skills when ?includeArchived=true', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId)
    await prisma.skill.create({ data: { name: 'Active', domainId: domain.id } })
    await prisma.skill.create({ data: { name: 'Archived', domainId: domain.id, archivedAt: new Date() } })

    const res = await request(app)
      .get(`/domains/${domain.id}/skills?includeArchived=true`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    const names = (res.body as Array<{ name: string }>).map(s => s.name).sort()
    expect(names).toEqual(['Active', 'Archived'])
  })

  it('returns 403 for a private Domain when the caller is not the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const priv = await makeDomain(bob.playerId, 'Bob', 'private')

    const res = await request(app).get(`/domains/${priv.id}/skills`).set('Authorization', `Bearer ${alice.token}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 when the Domain does not exist', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const res = await request(app).get('/domains/missing/skills').set('Authorization', `Bearer ${alice.token}`)
    expect(res.status).toBe(404)
  })

  it('group member can GET skills of a private Root Domain they are attuned to', async () => {
    const rootOwner = await registerAndLogin('root@example.com')
    const alice = await registerAndLogin('alice@example.com')
    const root = await prisma.habitDomain.create({
      data: { name: 'Private Root', ownerId: rootOwner.playerId, accessibilityState: 'private' },
    })
    await prisma.skill.create({ data: { name: 'Spike', domainId: root.id } })
    await prisma.habitDomain.create({
      data: { name: 'Alice domain', ownerId: alice.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })

    const res = await request(app).get(`/domains/${root.id}/skills`).set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Spike')
  })
})

describe('PATCH /domains/:id/skills/:skillId', () => {
  it('renames the Skill when the caller is the Domain owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId)
    const skill = await prisma.skill.create({ data: { name: 'Old', domainId: domain.id } })

    const res = await request(app)
      .patch(`/domains/${domain.id}/skills/${skill.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'New' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New')
    expect((await prisma.skill.findUnique({ where: { id: skill.id } }))?.name).toBe('New')
  })

  it('returns 403 when the caller is not the Domain owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const domain = await makeDomain(alice.playerId)
    const skill = await prisma.skill.create({ data: { name: 'Old', domainId: domain.id } })

    const res = await request(app)
      .patch(`/domains/${domain.id}/skills/${skill.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ name: 'Hacked' })

    expect(res.status).toBe(403)
    expect((await prisma.skill.findUnique({ where: { id: skill.id } }))?.name).toBe('Old')
  })

  it('returns 400 when the new name is empty or whitespace', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId)
    const skill = await prisma.skill.create({ data: { name: 'Old', domainId: domain.id } })

    const res = await request(app)
      .patch(`/domains/${domain.id}/skills/${skill.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: '  ' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when the Skill does not exist or belongs to a different Domain', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const d1 = await makeDomain(alice.playerId, 'D1')
    const d2 = await makeDomain(alice.playerId, 'D2')
    const skill = await prisma.skill.create({ data: { name: 'X', domainId: d2.id } })

    const r1 = await request(app)
      .patch(`/domains/${d1.id}/skills/${skill.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'N' })
    expect(r1.status).toBe(404)

    const r2 = await request(app)
      .patch(`/domains/${d1.id}/skills/missing`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'N' })
    expect(r2.status).toBe(404)
  })
})

describe('PATCH /domains/:id/skills/:skillId — breakPair', () => {
  it('returns 400 when the skill has a pair and breakPair is not provided', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const mine = await makeDomain(alice.playerId, 'Mine')
    const root = await makeDomain(bob.playerId, 'Root')
    const mySkill = await prisma.skill.create({ data: { name: 'Old', domainId: mine.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'Old', domainId: root.id } })
    await prisma.skillPair.create({ data: { playerDomainSkillId: mySkill.id, rootDomainSkillId: rootSkill.id } })

    const res = await request(app)
      .patch(`/domains/${mine.id}/skills/${mySkill.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'New' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ hasPair: true })
  })

  it('renames the skill and keeps the pair when breakPair is false', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const mine = await makeDomain(alice.playerId, 'Mine')
    const root = await makeDomain(bob.playerId, 'Root')
    const mySkill = await prisma.skill.create({ data: { name: 'Old', domainId: mine.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'Old', domainId: root.id } })
    const pair = await prisma.skillPair.create({ data: { playerDomainSkillId: mySkill.id, rootDomainSkillId: rootSkill.id } })

    const res = await request(app)
      .patch(`/domains/${mine.id}/skills/${mySkill.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'New', breakPair: false })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New')
    expect(await prisma.skillPair.findUnique({ where: { id: pair.id } })).not.toBeNull()
  })

  it('renames the skill and breaks the pair when breakPair is true', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const mine = await makeDomain(alice.playerId, 'Mine')
    const root = await makeDomain(bob.playerId, 'Root')
    const mySkill = await prisma.skill.create({ data: { name: 'Old', domainId: mine.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'Old', domainId: root.id } })
    const pair = await prisma.skillPair.create({ data: { playerDomainSkillId: mySkill.id, rootDomainSkillId: rootSkill.id } })

    const res = await request(app)
      .patch(`/domains/${mine.id}/skills/${mySkill.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'New', breakPair: true })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New')
    expect(await prisma.skillPair.findUnique({ where: { id: pair.id } })).toBeNull()
  })

  it('renames without breakPair when the skill has no pair', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const mine = await makeDomain(alice.playerId, 'Mine')
    const mySkill = await prisma.skill.create({ data: { name: 'Old', domainId: mine.id } })

    const res = await request(app)
      .patch(`/domains/${mine.id}/skills/${mySkill.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'New' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New')
  })
})

describe('DELETE /domains/:id/skills/:skillId (archive)', () => {
  it('archives the Skill (sets archivedAt) and returns 204 when the caller is the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId)
    const skill = await prisma.skill.create({ data: { name: 'X', domainId: domain.id } })

    const res = await request(app)
      .delete(`/domains/${domain.id}/skills/${skill.id}`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(204)
    const reloaded = await prisma.skill.findUnique({ where: { id: skill.id } })
    expect(reloaded).not.toBeNull()
    expect(reloaded?.archivedAt).not.toBeNull()
  })

  it('breaks any SkillPair rows referencing the archived Skill but leaves XpLedger rows intact', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await makeDomain(bob.playerId, 'Root')
    const mine = await makeDomain(alice.playerId, 'Mine')
    const mySkill = await prisma.skill.create({ data: { name: 'A', domainId: mine.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'A', domainId: root.id } })
    await prisma.skillPair.create({ data: { playerDomainSkillId: mySkill.id, rootDomainSkillId: rootSkill.id } })

    const session = await prisma.session.create({ data: { playerId: alice.playerId, domainId: mine.id, date: new Date('2026-01-01') } })
    const entry = await prisma.sessionEntry.create({ data: { sessionId: session.id, skillId: mySkill.id, durationMinutes: 30, qualityScore: 3, xpEarned: 30 } })
    await prisma.xpLedger.create({ data: { playerId: alice.playerId, skillId: mySkill.id, domainId: mine.id, xp: 30, sourceEntryId: entry.id } })

    const res = await request(app)
      .delete(`/domains/${mine.id}/skills/${mySkill.id}`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(204)
    expect(await prisma.skillPair.count()).toBe(0)
    expect(await prisma.xpLedger.count({ where: { skillId: mySkill.id } })).toBe(1)
    expect(await prisma.sessionEntry.count({ where: { skillId: mySkill.id } })).toBe(1)
  })

  it('returns 403 when the caller is not the Domain owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const domain = await makeDomain(alice.playerId)
    const skill = await prisma.skill.create({ data: { name: 'X', domainId: domain.id } })

    const res = await request(app)
      .delete(`/domains/${domain.id}/skills/${skill.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
    expect(res.status).toBe(403)
    const reloaded = await prisma.skill.findUnique({ where: { id: skill.id } })
    expect(reloaded?.archivedAt).toBeNull()
  })

  it('returns 404 when the Skill does not exist', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId)
    const res = await request(app)
      .delete(`/domains/${domain.id}/skills/missing`)
      .set('Authorization', `Bearer ${alice.token}`)
    expect(res.status).toBe(404)
  })
})

describe('POST /domains/:id/skills/:skillId/restore', () => {
  it('clears archivedAt when the caller is the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const domain = await makeDomain(alice.playerId)
    const skill = await prisma.skill.create({ data: { name: 'X', domainId: domain.id, archivedAt: new Date() } })

    const res = await request(app)
      .post(`/domains/${domain.id}/skills/${skill.id}/restore`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    expect(res.body.archivedAt).toBeNull()
    expect((await prisma.skill.findUnique({ where: { id: skill.id } }))?.archivedAt).toBeNull()
  })

  it('returns 403 when the caller is not the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const domain = await makeDomain(alice.playerId)
    const skill = await prisma.skill.create({ data: { name: 'X', domainId: domain.id, archivedAt: new Date() } })

    const res = await request(app)
      .post(`/domains/${domain.id}/skills/${skill.id}/restore`)
      .set('Authorization', `Bearer ${bob.token}`)
    expect(res.status).toBe(403)
  })
})
