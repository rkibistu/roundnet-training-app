import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { groupRoot, canSeeDomain } from '../src/visibility.js'

const prisma = new PrismaClient()

beforeEach(async () => {
  await prisma.skillPair.deleteMany()
  await prisma.attunement.deleteMany()
  await prisma.skill.deleteMany()
  await prisma.habitDomain.deleteMany()
  await prisma.player.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function makePlayer(email: string) {
  return prisma.player.create({ data: { email, passwordHash: 'x' } })
}

async function makeDomain(ownerId: string, state = 'public', rootDomainId?: string) {
  return prisma.habitDomain.create({
    data: { name: 'D', ownerId, accessibilityState: state, rootDomainId: rootDomainId ?? null },
  })
}

describe('groupRoot', () => {
  it('returns the domain id when the domain has no rootDomainId (it is the root)', async () => {
    const p = await makePlayer('a@example.com')
    const d = await makeDomain(p.id)
    expect(groupRoot(d)).toBe(d.id)
  })

  it('returns rootDomainId when the domain is attuned to a root', async () => {
    const p = await makePlayer('a@example.com')
    const root = await makeDomain(p.id)
    const attuned = await makeDomain(p.id, 'public', root.id)
    expect(groupRoot(attuned)).toBe(root.id)
  })
})

describe('canSeeDomain', () => {
  it('returns true when the requester is the owner, even for private', async () => {
    const p = await makePlayer('a@example.com')
    const d = await makeDomain(p.id, 'private')
    expect(await canSeeDomain(p.id, d)).toBe(true)
  })

  it('returns true for a public domain regardless of requester', async () => {
    const owner = await makePlayer('owner@example.com')
    const other = await makePlayer('other@example.com')
    const d = await makeDomain(owner.id, 'public')
    expect(await canSeeDomain(other.id, d)).toBe(true)
  })

  it('returns true for a protected domain regardless of requester', async () => {
    const owner = await makePlayer('owner@example.com')
    const other = await makePlayer('other@example.com')
    const d = await makeDomain(owner.id, 'protected')
    expect(await canSeeDomain(other.id, d)).toBe(true)
  })

  it('returns true for a private domain when requester owns a domain attuned to the same root', async () => {
    const rootOwner = await makePlayer('root@example.com')
    const alice = await makePlayer('alice@example.com')
    const bob = await makePlayer('bob@example.com')

    const root = await makeDomain(rootOwner.id, 'private')
    const aliceDomain = await makeDomain(alice.id, 'private', root.id)
    const bobDomain = await makeDomain(bob.id, 'private', root.id)

    // alice can see bob's domain (both attuned to same root)
    expect(await canSeeDomain(alice.id, bobDomain)).toBe(true)
    // bob can see alice's domain
    expect(await canSeeDomain(bob.id, aliceDomain)).toBe(true)
  })

  it('returns true for a private root domain when requester owns a domain attuned to that root', async () => {
    const rootOwner = await makePlayer('root@example.com')
    const alice = await makePlayer('alice@example.com')

    const root = await makeDomain(rootOwner.id, 'private')
    await makeDomain(alice.id, 'private', root.id)

    // alice is attuned to the root → can see the root itself
    expect(await canSeeDomain(alice.id, root)).toBe(true)
  })

  it('returns true for a private domain when requester is the root domain owner', async () => {
    const rootOwner = await makePlayer('root@example.com')
    const alice = await makePlayer('alice@example.com')

    const root = await makeDomain(rootOwner.id, 'private')
    const aliceDomain = await makeDomain(alice.id, 'private', root.id)

    // root owner can see alice's attuned domain
    expect(await canSeeDomain(rootOwner.id, aliceDomain)).toBe(true)
  })

  it('returns false for a private domain when requester is not a group member', async () => {
    const owner = await makePlayer('owner@example.com')
    const stranger = await makePlayer('stranger@example.com')
    const d = await makeDomain(owner.id, 'private')
    expect(await canSeeDomain(stranger.id, d)).toBe(false)
  })

  it('returns false for a private domain when requester owns an unrelated attuned domain', async () => {
    const rootA = await makePlayer('rootA@example.com')
    const rootB = await makePlayer('rootB@example.com')
    const alice = await makePlayer('alice@example.com')

    const domainA = await makeDomain(rootA.id, 'private')
    const domainB = await makeDomain(rootB.id, 'private')
    await makeDomain(alice.id, 'private', domainA.id) // alice attuned to A, not B

    expect(await canSeeDomain(alice.id, domainB)).toBe(false)
  })
})
