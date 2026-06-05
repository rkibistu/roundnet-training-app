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

describe('POST /domains', () => {
  it('creates a Domain owned by the authenticated Player, defaulting to public', async () => {
    const { token, playerId } = await registerAndLogin('alice@example.com')

    const res = await request(app)
      .post('/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Roundnet' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      name: 'Roundnet',
      ownerId: playerId,
      accessibilityState: 'public',
    })
    expect(res.body.id).toBeDefined()

    const stored = await prisma.habitDomain.findUnique({ where: { id: res.body.id } })
    expect(stored?.ownerId).toBe(playerId)
  })

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).post('/domains').send({ name: 'Roundnet' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing or only whitespace', async () => {
    const { token } = await registerAndLogin('alice@example.com')

    const missing = await request(app)
      .post('/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(missing.status).toBe(400)

    const empty = await request(app)
      .post('/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' })
    expect(empty.status).toBe(400)
  })

  it('accepts protected and private as accessibilityState; rejects unknown values', async () => {
    const { token } = await registerAndLogin('alice@example.com')

    const prot = await request(app)
      .post('/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A', accessibilityState: 'protected' })
    expect(prot.status).toBe(201)
    expect(prot.body.accessibilityState).toBe('protected')

    const priv = await request(app)
      .post('/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'B', accessibilityState: 'private' })
    expect(priv.body.accessibilityState).toBe('private')

    const bad = await request(app)
      .post('/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'C', accessibilityState: 'secret' })
    expect(bad.status).toBe(400)
  })
})

describe('GET /domains', () => {
  it('returns the caller\'s own Domains plus other Players\' public and protected Domains, excluding private Domains owned by others', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')

    await prisma.habitDomain.create({ data: { name: 'Alice public', ownerId: alice.playerId, accessibilityState: 'public' } })
    await prisma.habitDomain.create({ data: { name: 'Alice private', ownerId: alice.playerId, accessibilityState: 'private' } })
    await prisma.habitDomain.create({ data: { name: 'Bob public', ownerId: bob.playerId, accessibilityState: 'public' } })
    await prisma.habitDomain.create({ data: { name: 'Bob protected', ownerId: bob.playerId, accessibilityState: 'protected' } })
    await prisma.habitDomain.create({ data: { name: 'Bob private', ownerId: bob.playerId, accessibilityState: 'private' } })

    const res = await request(app).get('/domains').set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    const names = (res.body as Array<{ name: string }>).map(d => d.name).sort()
    expect(names).toEqual(['Alice private', 'Alice public', 'Bob protected', 'Bob public'])
    for (const d of res.body) {
      expect(d.ownerId).toBeDefined()
      expect(d.accessibilityState).toBeDefined()
    }
  })

  it('includes group-visible private Domains (root + siblings) for a group member', async () => {
    const rootOwner = await registerAndLogin('root@example.com')
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const charlie = await registerAndLogin('charlie@example.com')

    const root = await prisma.habitDomain.create({
      data: { name: 'Private Root', ownerId: rootOwner.playerId, accessibilityState: 'private' },
    })
    const aliceDomain = await prisma.habitDomain.create({
      data: { name: 'Alice domain', ownerId: alice.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })
    const bobDomain = await prisma.habitDomain.create({
      data: { name: 'Bob domain', ownerId: bob.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })
    await prisma.habitDomain.create({
      data: { name: 'Charlie unrelated', ownerId: charlie.playerId, accessibilityState: 'private' },
    })

    const res = await request(app).get('/domains').set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    const ids = (res.body as Array<{ id: string }>).map(d => d.id)
    expect(ids).toContain(root.id)
    expect(ids).toContain(aliceDomain.id)
    expect(ids).toContain(bobDomain.id)
    // unrelated private Domain is excluded
    const names = (res.body as Array<{ name: string }>).map(d => d.name)
    expect(names).not.toContain('Charlie unrelated')
  })
})

describe('GET /domains/:id', () => {
  it('returns a single Domain the caller can see', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const bobsDomain = await prisma.habitDomain.create({
      data: { name: 'Bob public', ownerId: bob.playerId, accessibilityState: 'public' },
    })

    const res = await request(app).get(`/domains/${bobsDomain.id}`).set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: bobsDomain.id, name: 'Bob public', ownerId: bob.playerId })
  })

  it('returns 403 for a private Domain when the caller is not the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const bobsPrivate = await prisma.habitDomain.create({
      data: { name: 'Bob private', ownerId: bob.playerId, accessibilityState: 'private' },
    })

    const res = await request(app).get(`/domains/${bobsPrivate.id}`).set('Authorization', `Bearer ${alice.token}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 when the Domain does not exist', async () => {
    const { token } = await registerAndLogin('alice@example.com')
    const res = await request(app).get('/domains/does-not-exist').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('group member can GET a private Root Domain they are attuned to', async () => {
    const rootOwner = await registerAndLogin('root@example.com')
    const alice = await registerAndLogin('alice@example.com')
    const root = await prisma.habitDomain.create({
      data: { name: 'Private Root', ownerId: rootOwner.playerId, accessibilityState: 'private' },
    })
    await prisma.habitDomain.create({
      data: { name: 'Alice domain', ownerId: alice.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })

    const res = await request(app).get(`/domains/${root.id}`).set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(root.id)
  })

  it('group member can GET a private sibling Domain in the same group', async () => {
    const rootOwner = await registerAndLogin('root@example.com')
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({
      data: { name: 'Root', ownerId: rootOwner.playerId, accessibilityState: 'private' },
    })
    await prisma.habitDomain.create({
      data: { name: 'Alice domain', ownerId: alice.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })
    const bobDomain = await prisma.habitDomain.create({
      data: { name: 'Bob domain', ownerId: bob.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })

    const res = await request(app).get(`/domains/${bobDomain.id}`).set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(bobDomain.id)
  })
})

describe('PATCH /domains/:id', () => {
  it('updates the Domain name when the caller is the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const d = await prisma.habitDomain.create({
      data: { name: 'Old name', ownerId: alice.playerId, accessibilityState: 'public' },
    })

    const res = await request(app)
      .patch(`/domains/${d.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'New name' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New name')

    const reloaded = await prisma.habitDomain.findUnique({ where: { id: d.id } })
    expect(reloaded?.name).toBe('New name')
  })

  it('returns 403 when the caller is not the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const bobs = await prisma.habitDomain.create({
      data: { name: 'Bob domain', ownerId: bob.playerId, accessibilityState: 'public' },
    })

    const res = await request(app)
      .patch(`/domains/${bobs.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Hacked' })

    expect(res.status).toBe(403)

    const reloaded = await prisma.habitDomain.findUnique({ where: { id: bobs.id } })
    expect(reloaded?.name).toBe('Bob domain')
  })

  it('returns 400 when name is empty or only whitespace', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const d = await prisma.habitDomain.create({
      data: { name: 'Original', ownerId: alice.playerId, accessibilityState: 'public' },
    })

    const res = await request(app)
      .patch(`/domains/${d.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: '   ' })

    expect(res.status).toBe(400)
    const reloaded = await prisma.habitDomain.findUnique({ where: { id: d.id } })
    expect(reloaded?.name).toBe('Original')
  })

  it('owner can switch accessibilityState from protected to private', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const d = await prisma.habitDomain.create({
      data: { name: 'My Domain', ownerId: alice.playerId, accessibilityState: 'protected' },
    })

    const res = await request(app)
      .patch(`/domains/${d.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ accessibilityState: 'private' })

    expect(res.status).toBe(200)
    expect(res.body.accessibilityState).toBe('private')
    const reloaded = await prisma.habitDomain.findUnique({ where: { id: d.id } })
    expect(reloaded?.accessibilityState).toBe('private')
  })

  it('owner can switch accessibilityState from private to protected', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const d = await prisma.habitDomain.create({
      data: { name: 'My Domain', ownerId: alice.playerId, accessibilityState: 'private' },
    })

    const res = await request(app)
      .patch(`/domains/${d.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ accessibilityState: 'protected' })

    expect(res.status).toBe(200)
    expect(res.body.accessibilityState).toBe('protected')
  })

  it('returns 400 when trying to change accessibilityState away from public', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const d = await prisma.habitDomain.create({
      data: { name: 'My Domain', ownerId: alice.playerId, accessibilityState: 'public' },
    })

    const toPrivate = await request(app)
      .patch(`/domains/${d.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ accessibilityState: 'private' })
    expect(toPrivate.status).toBe(400)

    const toProtected = await request(app)
      .patch(`/domains/${d.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ accessibilityState: 'protected' })
    expect(toProtected.status).toBe(400)

    const reloaded = await prisma.habitDomain.findUnique({ where: { id: d.id } })
    expect(reloaded?.accessibilityState).toBe('public')
  })

  it('returns 400 for an invalid accessibilityState value in PATCH', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const d = await prisma.habitDomain.create({
      data: { name: 'My Domain', ownerId: alice.playerId, accessibilityState: 'protected' },
    })

    const res = await request(app)
      .patch(`/domains/${d.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ accessibilityState: 'secret' })
    expect(res.status).toBe(400)
  })
})

describe('POST /domains/:id/fracture', () => {
  it('copies only active skills; archived skills are excluded', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const source = await prisma.habitDomain.create({
      data: { name: 'Roundnet', ownerId: bob.playerId, accessibilityState: 'public' },
    })
    await prisma.skill.create({ data: { name: 'Spike', domainId: source.id } })
    await prisma.skill.create({ data: { name: 'OldSkill', domainId: source.id, archivedAt: new Date() } })

    const res = await request(app)
      .post(`/domains/${source.id}/fracture`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(201)
    const skills = await prisma.skill.findMany({ where: { domainId: res.body.id } })
    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('Spike')
    expect(skills[0].archivedAt).toBeNull()
  })

  it('modifying a source skill after fracture does not affect the copy', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const source = await prisma.habitDomain.create({
      data: { name: 'Roundnet', ownerId: bob.playerId, accessibilityState: 'public' },
    })
    const skill = await prisma.skill.create({ data: { name: 'Spike', domainId: source.id } })

    const res = await request(app)
      .post(`/domains/${source.id}/fracture`)
      .set('Authorization', `Bearer ${alice.token}`)
    expect(res.status).toBe(201)

    await prisma.skill.update({ where: { id: skill.id }, data: { name: 'Renamed' } })

    const copySkills = await prisma.skill.findMany({ where: { domainId: res.body.id } })
    expect(copySkills[0].name).toBe('Spike')
  })

  it('returns 403 when the source Domain is private and the caller is not the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const source = await prisma.habitDomain.create({
      data: { name: 'Secret', ownerId: bob.playerId, accessibilityState: 'private' },
    })

    const res = await request(app)
      .post(`/domains/${source.id}/fracture`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(403)
    const count = await prisma.habitDomain.count({ where: { ownerId: alice.playerId } })
    expect(count).toBe(0)
  })

  it('returns 403 when the caller tries to fracture their own Domain', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const source = await prisma.habitDomain.create({
      data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' },
    })

    const res = await request(app)
      .post(`/domains/${source.id}/fracture`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(403)
  })

  it('returns 400 when the caller already owns a Domain with the same name', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    await prisma.habitDomain.create({ data: { name: 'Roundnet', ownerId: alice.playerId, accessibilityState: 'public' } })
    const source = await prisma.habitDomain.create({
      data: { name: 'Roundnet', ownerId: bob.playerId, accessibilityState: 'public' },
    })

    const res = await request(app)
      .post(`/domains/${source.id}/fracture`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(400)
  })

  it('returns 404 when the source Domain does not exist', async () => {
    const { token } = await registerAndLogin('alice@example.com')
    const res = await request(app)
      .post('/domains/does-not-exist/fracture')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/domains/any-id/fracture')
    expect(res.status).toBe(401)
  })

  it('guardrail: group member who can read a private sibling still gets 403 on fracture', async () => {
    const rootOwner = await registerAndLogin('root@example.com')
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({
      data: { name: 'Root', ownerId: rootOwner.playerId, accessibilityState: 'private' },
    })
    await prisma.habitDomain.create({
      data: { name: 'Alice domain', ownerId: alice.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })
    const bobDomain = await prisma.habitDomain.create({
      data: { name: 'Bob domain', ownerId: bob.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })

    const res = await request(app)
      .post(`/domains/${bobDomain.id}/fracture`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(403)
    const count = await prisma.habitDomain.count({ where: { ownerId: alice.playerId } })
    expect(count).toBe(1) // only alice's own domain, no new fracture
  })

  it('creates a new Domain owned by the caller with the same name, rootDomainId null, and accessibilityState public', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const source = await prisma.habitDomain.create({
      data: { name: 'Roundnet', ownerId: bob.playerId, accessibilityState: 'public' },
    })

    const res = await request(app)
      .post(`/domains/${source.id}/fracture`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      name: 'Roundnet',
      ownerId: alice.playerId,
      accessibilityState: 'public',
      rootDomainId: null,
    })
    expect(res.body.id).toBeDefined()
    expect(res.body.id).not.toBe(source.id)

    const stored = await prisma.habitDomain.findUnique({ where: { id: res.body.id } })
    expect(stored?.ownerId).toBe(alice.playerId)
    expect(stored?.rootDomainId).toBeNull()
  })
})

describe('POST /domains/:id/attune', () => {
  it('creates an Attunement when attuning to a public domain', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: bob.playerId, accessibilityState: 'public' } })
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })

    const res = await request(app)
      .post(`/domains/${root.id}/attune`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ callerDomainId: mine.id })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ domainId: mine.id, rootDomainId: root.id })
    const row = await prisma.attunement.findFirst({ where: { domainId: mine.id } })
    expect(row?.rootDomainId).toBe(root.id)
    const updatedDomain = await prisma.habitDomain.findUnique({ where: { id: mine.id } })
    expect(updatedDomain?.rootDomainId).toBe(root.id)
  })

  it('resolves chain: attuning to an intermediary stores rootDomainId pointing to the actual root', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const charlie = await registerAndLogin('charlie@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: alice.playerId, accessibilityState: 'public' } })
    const intermediary = await prisma.habitDomain.create({ data: { name: 'Bob domain', ownerId: bob.playerId, accessibilityState: 'public', rootDomainId: root.id } })
    await prisma.attunement.create({ data: { domainId: intermediary.id, rootDomainId: root.id } })
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: charlie.playerId, accessibilityState: 'public' } })

    const res = await request(app)
      .post(`/domains/${intermediary.id}/attune`)
      .set('Authorization', `Bearer ${charlie.token}`)
      .send({ callerDomainId: mine.id })

    expect(res.status).toBe(201)
    expect(res.body.rootDomainId).toBe(root.id)
    const row = await prisma.attunement.findFirst({ where: { domainId: mine.id } })
    expect(row?.rootDomainId).toBe(root.id)
  })

  it('returns 400 if the domain is already attuned', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: bob.playerId, accessibilityState: 'public' } })
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })
    await prisma.attunement.create({ data: { domainId: mine.id, rootDomainId: root.id } })

    const res = await request(app)
      .post(`/domains/${root.id}/attune`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ callerDomainId: mine.id })

    expect(res.status).toBe(400)
  })

  it('returns 403 if the target domain is private and the caller does not own it', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const privateRoot = await prisma.habitDomain.create({ data: { name: 'Secret', ownerId: bob.playerId, accessibilityState: 'private' } })
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })

    const res = await request(app)
      .post(`/domains/${privateRoot.id}/attune`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ callerDomainId: mine.id })

    expect(res.status).toBe(403)
  })

  it('returns 403 when the caller does not own the domain being attuned', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: alice.playerId, accessibilityState: 'public' } })
    const bobs = await prisma.habitDomain.create({ data: { name: 'Bobs', ownerId: bob.playerId, accessibilityState: 'public' } })

    const res = await request(app)
      .post(`/domains/${root.id}/attune`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ callerDomainId: bobs.id })

    expect(res.status).toBe(403)
  })

  it('returns 404 when the target domain does not exist', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })

    const res = await request(app)
      .post('/domains/does-not-exist/attune')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ callerDomainId: mine.id })

    expect(res.status).toBe(404)
  })

  it('guardrail: group member who can read a private Domain still gets 403 on attune', async () => {
    const rootOwner = await registerAndLogin('root@example.com')
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({
      data: { name: 'Root', ownerId: rootOwner.playerId, accessibilityState: 'private' },
    })
    await prisma.habitDomain.create({
      data: { name: 'Alice domain', ownerId: alice.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })
    const bobDomain = await prisma.habitDomain.create({
      data: { name: 'Bob domain', ownerId: bob.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })
    const fresh = await prisma.habitDomain.create({
      data: { name: 'Fresh', ownerId: alice.playerId, accessibilityState: 'public' },
    })

    const res = await request(app)
      .post(`/domains/${bobDomain.id}/attune`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ callerDomainId: fresh.id })

    expect(res.status).toBe(403)
    const attunement = await prisma.attunement.findFirst({ where: { domainId: fresh.id } })
    expect(attunement).toBeNull()
  })
})

describe('GET /domains/:id/skill-pairs', () => {
  it('lists SkillPairs for the domain', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: bob.playerId, accessibilityState: 'public' } })
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })
    const mySkill = await prisma.skill.create({ data: { name: 'Serving', domainId: mine.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'Serving', domainId: root.id } })
    await prisma.skillPair.create({ data: { playerDomainSkillId: mySkill.id, rootDomainSkillId: rootSkill.id } })

    const res = await request(app)
      .get(`/domains/${mine.id}/skill-pairs`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ playerDomainSkillId: mySkill.id, rootDomainSkillId: rootSkill.id })
  })

  it('returns 404 when domain does not exist', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const res = await request(app).get('/domains/missing/skill-pairs').set('Authorization', `Bearer ${alice.token}`)
    expect(res.status).toBe(404)
  })

  it('group member can GET skill-pairs of a private sibling Domain', async () => {
    const rootOwner = await registerAndLogin('root@example.com')
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({
      data: { name: 'Root', ownerId: rootOwner.playerId, accessibilityState: 'private' },
    })
    await prisma.habitDomain.create({
      data: { name: 'Alice domain', ownerId: alice.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })
    const bobDomain = await prisma.habitDomain.create({
      data: { name: 'Bob domain', ownerId: bob.playerId, accessibilityState: 'private', rootDomainId: root.id },
    })
    const rootSkill = await prisma.skill.create({ data: { name: 'Spike', domainId: root.id } })
    const bobSkill = await prisma.skill.create({ data: { name: 'Spike', domainId: bobDomain.id } })
    await prisma.skillPair.create({ data: { playerDomainSkillId: bobSkill.id, rootDomainSkillId: rootSkill.id } })

    const res = await request(app)
      .get(`/domains/${bobDomain.id}/skill-pairs`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('POST /domains/:id/skill-pairs', () => {
  it('creates a SkillPair when both skills belong to their respective domains', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: bob.playerId, accessibilityState: 'public' } })
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })
    await prisma.attunement.create({ data: { domainId: mine.id, rootDomainId: root.id } })
    const mySkill = await prisma.skill.create({ data: { name: 'Serving', domainId: mine.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'Serving', domainId: root.id } })

    const res = await request(app)
      .post(`/domains/${mine.id}/skill-pairs`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ playerSkillId: mySkill.id, rootSkillId: rootSkill.id })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ playerDomainSkillId: mySkill.id, rootDomainSkillId: rootSkill.id })
    const stored = await prisma.skillPair.findFirst({ where: { playerDomainSkillId: mySkill.id } })
    expect(stored).not.toBeNull()
  })

  it('returns 400 if rootSkillId does not belong to the attuned root domain', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const charlie = await registerAndLogin('charlie@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: bob.playerId, accessibilityState: 'public' } })
    const other = await prisma.habitDomain.create({ data: { name: 'Other', ownerId: charlie.playerId, accessibilityState: 'public' } })
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })
    await prisma.attunement.create({ data: { domainId: mine.id, rootDomainId: root.id } })
    const mySkill = await prisma.skill.create({ data: { name: 'A', domainId: mine.id } })
    const otherSkill = await prisma.skill.create({ data: { name: 'B', domainId: other.id } })

    const res = await request(app)
      .post(`/domains/${mine.id}/skill-pairs`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ playerSkillId: mySkill.id, rootSkillId: otherSkill.id })

    expect(res.status).toBe(400)
  })

  it('returns 400 if playerSkillId does not belong to the domain', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: bob.playerId, accessibilityState: 'public' } })
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })
    const other = await prisma.habitDomain.create({ data: { name: 'Other', ownerId: alice.playerId, accessibilityState: 'public' } })
    await prisma.attunement.create({ data: { domainId: mine.id, rootDomainId: root.id } })
    const otherSkill = await prisma.skill.create({ data: { name: 'A', domainId: other.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'A', domainId: root.id } })

    const res = await request(app)
      .post(`/domains/${mine.id}/skill-pairs`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ playerSkillId: otherSkill.id, rootSkillId: rootSkill.id })

    expect(res.status).toBe(400)
  })

  it('returns 400 if the domain has no attunement', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: bob.playerId, accessibilityState: 'public' } })
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })
    const mySkill = await prisma.skill.create({ data: { name: 'A', domainId: mine.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'A', domainId: root.id } })

    const res = await request(app)
      .post(`/domains/${mine.id}/skill-pairs`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ playerSkillId: mySkill.id, rootSkillId: rootSkill.id })

    expect(res.status).toBe(400)
  })

  it('returns 403 when the caller is not the domain owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const domain = await prisma.habitDomain.create({ data: { name: 'Alice domain', ownerId: alice.playerId, accessibilityState: 'public' } })
    const skill = await prisma.skill.create({ data: { name: 'A', domainId: domain.id } })

    const res = await request(app)
      .post(`/domains/${domain.id}/skill-pairs`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ playerSkillId: skill.id, rootSkillId: skill.id })

    expect(res.status).toBe(403)
  })
})

describe('DELETE /domains/:id/skill-pairs/:pairId', () => {
  it('destroys the SkillPair', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: bob.playerId, accessibilityState: 'public' } })
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })
    const mySkill = await prisma.skill.create({ data: { name: 'A', domainId: mine.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'A', domainId: root.id } })
    const pair = await prisma.skillPair.create({ data: { playerDomainSkillId: mySkill.id, rootDomainSkillId: rootSkill.id } })

    const res = await request(app)
      .delete(`/domains/${mine.id}/skill-pairs/${pair.id}`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(204)
    expect(await prisma.skillPair.findUnique({ where: { id: pair.id } })).toBeNull()
  })

  it('returns 404 when the pair does not exist', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })

    const res = await request(app)
      .delete(`/domains/${mine.id}/skill-pairs/missing`)
      .set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(404)
  })

  it('returns 403 when the caller is not the domain owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const mine = await prisma.habitDomain.create({ data: { name: 'Mine', ownerId: alice.playerId, accessibilityState: 'public' } })
    const root = await prisma.habitDomain.create({ data: { name: 'Root', ownerId: bob.playerId, accessibilityState: 'public' } })
    const mySkill = await prisma.skill.create({ data: { name: 'A', domainId: mine.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'A', domainId: root.id } })
    const pair = await prisma.skillPair.create({ data: { playerDomainSkillId: mySkill.id, rootDomainSkillId: rootSkill.id } })

    const res = await request(app)
      .delete(`/domains/${mine.id}/skill-pairs/${pair.id}`)
      .set('Authorization', `Bearer ${bob.token}`)

    expect(res.status).toBe(403)
    expect(await prisma.skillPair.findUnique({ where: { id: pair.id } })).not.toBeNull()
  })
})

describe('POST /domains/:id/attune — auto-copy path (no callerDomainId)', () => {
  it('creates a new Domain owned by the caller with the Root Domain name and returns { id }', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Roundnet', ownerId: bob.playerId, accessibilityState: 'public' } })

    const res = await request(app)
      .post(`/domains/${root.id}/attune`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({})

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.id).not.toBe(root.id)

    const newDomain = await prisma.habitDomain.findUnique({ where: { id: res.body.id } })
    expect(newDomain).not.toBeNull()
    expect(newDomain!.name).toBe('Roundnet')
    expect(newDomain!.ownerId).toBe(alice.playerId)
  })

  it('copies only active skills from the Root Domain into the new Domain', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Roundnet', ownerId: bob.playerId, accessibilityState: 'public' } })
    await prisma.skill.create({ data: { name: 'Spike', domainId: root.id } })
    await prisma.skill.create({ data: { name: 'OldMove', domainId: root.id, archivedAt: new Date() } })

    const res = await request(app)
      .post(`/domains/${root.id}/attune`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({})

    expect(res.status).toBe(201)
    const skills = await prisma.skill.findMany({ where: { domainId: res.body.id } })
    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('Spike')
    expect(skills[0].archivedAt).toBeNull()
  })

  it('creates an Attunement record linking the new Domain to the Root', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Roundnet', ownerId: bob.playerId, accessibilityState: 'public' } })

    const res = await request(app)
      .post(`/domains/${root.id}/attune`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({})

    expect(res.status).toBe(201)
    const attunement = await prisma.attunement.findFirst({ where: { domainId: res.body.id } })
    expect(attunement).not.toBeNull()
    expect(attunement!.rootDomainId).toBe(root.id)
  })

  it('auto-pairs all copied Skills to their corresponding Root Skills by exact name match', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({ data: { name: 'Roundnet', ownerId: bob.playerId, accessibilityState: 'public' } })
    const rootSkill1 = await prisma.skill.create({ data: { name: 'Spike', domainId: root.id } })
    const rootSkill2 = await prisma.skill.create({ data: { name: 'Defense', domainId: root.id } })
    await prisma.skill.create({ data: { name: 'OldMove', domainId: root.id, archivedAt: new Date() } })

    const res = await request(app)
      .post(`/domains/${root.id}/attune`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({})

    expect(res.status).toBe(201)
    const newSkills = await prisma.skill.findMany({ where: { domainId: res.body.id } })
    const pairs = await prisma.skillPair.findMany({
      where: { playerDomainSkillId: { in: newSkills.map(s => s.id) } },
    })
    expect(pairs).toHaveLength(2)
    const rootSkillIds = new Set(pairs.map(p => p.rootDomainSkillId))
    expect(rootSkillIds).toContain(rootSkill1.id)
    expect(rootSkillIds).toContain(rootSkill2.id)
  })
})

describe('DELETE /domains/:id', () => {
  it('hard-deletes a Domain that has no attuned Players when the caller is the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const d = await prisma.habitDomain.create({
      data: { name: 'Alice domain', ownerId: alice.playerId, accessibilityState: 'public' },
    })

    const res = await request(app).delete(`/domains/${d.id}`).set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(204)
    const reloaded = await prisma.habitDomain.findUnique({ where: { id: d.id } })
    expect(reloaded).toBeNull()
  })

  it('returns 403 when the caller is not the owner', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const bobs = await prisma.habitDomain.create({
      data: { name: 'Bob domain', ownerId: bob.playerId, accessibilityState: 'public' },
    })

    const res = await request(app).delete(`/domains/${bobs.id}`).set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(403)
    const reloaded = await prisma.habitDomain.findUnique({ where: { id: bobs.id } })
    expect(reloaded).not.toBeNull()
  })

  it('returns 409 when the Domain has attuned Players (Ascension deferred to #33)', async () => {
    const alice = await registerAndLogin('alice@example.com')
    const bob = await registerAndLogin('bob@example.com')
    const root = await prisma.habitDomain.create({
      data: { name: 'Alice root', ownerId: alice.playerId, accessibilityState: 'public' },
    })
    const bobsAttuned = await prisma.habitDomain.create({
      data: { name: 'Bob attuned', ownerId: bob.playerId, accessibilityState: 'public', rootDomainId: root.id },
    })
    await prisma.attunement.create({
      data: { domainId: bobsAttuned.id, rootDomainId: root.id },
    })

    const res = await request(app).delete(`/domains/${root.id}`).set('Authorization', `Bearer ${alice.token}`)

    expect(res.status).toBe(409)
    const reloaded = await prisma.habitDomain.findUnique({ where: { id: root.id } })
    expect(reloaded).not.toBeNull()
  })
})
