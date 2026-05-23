import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

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

describe('Habit Tracker schema', () => {
  it('supports the full Player → HabitDomain → Skill → Session → Entry → XpLedger chain', async () => {
    const owner = await prisma.player.create({
      data: { email: 'owner@example.com', passwordHash: 'x' },
    })

    const domain = await prisma.habitDomain.create({
      data: { name: 'Roundnet', ownerId: owner.id },
    })
    expect(domain.accessibilityState).toBe('public')
    expect(domain.rootDomainId).toBeNull()
    expect(domain.isAscended).toBe(false)

    const skill = await prisma.skill.create({
      data: { name: 'Serving', domainId: domain.id },
    })

    const session = await prisma.session.create({
      data: { playerId: owner.id, domainId: domain.id, date: new Date('2026-05-23') },
    })
    expect(session.domainId).toBe(domain.id)

    const entry = await prisma.sessionEntry.create({
      data: {
        sessionId: session.id,
        skillId: skill.id,
        durationMinutes: 30,
        qualityScore: 3,
        xpEarned: 30,
      },
    })

    // Three XpLedger row shapes from the spec
    const general = await prisma.xpLedger.create({
      data: { playerId: owner.id, xp: 30, sourceEntryId: entry.id },
    })
    const domainOnly = await prisma.xpLedger.create({
      data: { playerId: owner.id, domainId: domain.id, xp: 30, sourceEntryId: entry.id },
    })
    const skillRow = await prisma.xpLedger.create({
      data: { playerId: owner.id, domainId: domain.id, skillId: skill.id, xp: 30, sourceEntryId: entry.id },
    })

    expect(general.skillId).toBeNull()
    expect(general.domainId).toBeNull()

    expect(domainOnly.skillId).toBeNull()
    expect(domainOnly.domainId).toBe(domain.id)

    expect(skillRow.skillId).toBe(skill.id)
    expect(skillRow.domainId).toBe(domain.id)
  })

  it('supports Attunement linking one Domain to a Root Domain', async () => {
    const alice = await prisma.player.create({ data: { email: 'a@x', passwordHash: 'x' } })
    const bob = await prisma.player.create({ data: { email: 'b@x', passwordHash: 'x' } })

    const root = await prisma.habitDomain.create({ data: { name: 'Roundnet', ownerId: alice.id } })
    const bobsDomain = await prisma.habitDomain.create({
      data: { name: 'Roundnet (Bob)', ownerId: bob.id, rootDomainId: root.id },
    })

    const att = await prisma.attunement.create({
      data: { domainId: bobsDomain.id, rootDomainId: root.id },
    })
    expect(att.domainId).toBe(bobsDomain.id)
    expect(att.rootDomainId).toBe(root.id)
  })

  it('supports SkillPair between a Player Skill and a Root Skill', async () => {
    const alice = await prisma.player.create({ data: { email: 'a2@x', passwordHash: 'x' } })
    const bob = await prisma.player.create({ data: { email: 'b2@x', passwordHash: 'x' } })

    const root = await prisma.habitDomain.create({ data: { name: 'Roundnet', ownerId: alice.id } })
    const rootSkill = await prisma.skill.create({ data: { name: 'Serving', domainId: root.id } })

    const bobsDomain = await prisma.habitDomain.create({
      data: { name: 'Roundnet (Bob)', ownerId: bob.id, rootDomainId: root.id },
    })
    const playerSkill = await prisma.skill.create({ data: { name: 'Serve', domainId: bobsDomain.id } })

    const pair = await prisma.skillPair.create({
      data: { playerDomainSkillId: playerSkill.id, rootDomainSkillId: rootSkill.id },
    })

    expect(pair.playerDomainSkillId).toBe(playerSkill.id)
    expect(pair.rootDomainSkillId).toBe(rootSkill.id)
  })
})
