import { Router, Request, Response } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/jwt.js'
import skillsRouter from './skills.js'
import { canSeeDomain } from '../visibility.js'

const ACCESSIBILITY_STATES = ['public', 'protected', 'private'] as const

const router = Router()

router.use('/:id/skills', skillsRouter)

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  const callerId = req.player!.playerId

  // Batch-compute the requester's group roots to avoid N+1
  const myDomains = await prisma.habitDomain.findMany({
    where: { ownerId: callerId },
    select: { id: true, rootDomainId: true },
  })
  const groupRootIds = new Set<string>()
  for (const d of myDomains) {
    groupRootIds.add(d.rootDomainId ?? d.id)
  }

  const privateConditions = groupRootIds.size > 0
    ? [
        { accessibilityState: 'private', id: { in: [...groupRootIds] } },
        { accessibilityState: 'private', rootDomainId: { in: [...groupRootIds] } },
      ]
    : []

  const domains = await prisma.habitDomain.findMany({
    where: {
      OR: [
        { ownerId: callerId },
        { accessibilityState: { in: ['public', 'protected'] } },
        ...privateConditions,
      ],
    },
  })
  res.json(domains)
})

router.get('/:id', async (req: Request, res: Response) => {
  const domain = await prisma.habitDomain.findUnique({ where: { id: req.params.id } })
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' })
    return
  }
  if (!await canSeeDomain(req.player!.playerId, domain)) {
    res.status(403).json({ error: 'forbidden' })
    return
  }
  res.json(domain)
})

router.patch('/:id', async (req: Request, res: Response) => {
  const domain = await prisma.habitDomain.findUnique({ where: { id: req.params.id } })
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' })
    return
  }
  if (domain.ownerId !== req.player!.playerId) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  const { name, accessibilityState } = req.body
  const data: { name?: string; accessibilityState?: string } = {}

  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (!trimmed) {
      res.status(400).json({ error: 'name is required' })
      return
    }
    data.name = trimmed
  }

  if (accessibilityState !== undefined) {
    if (!ACCESSIBILITY_STATES.includes(accessibilityState)) {
      res.status(400).json({ error: 'invalid accessibilityState' })
      return
    }
    if (domain.accessibilityState === 'public') {
      res.status(400).json({ error: 'public Domains are permanent and cannot change accessibilityState' })
      return
    }
    data.accessibilityState = accessibilityState
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'nothing to update' })
    return
  }

  const updated = await prisma.habitDomain.update({
    where: { id: domain.id },
    data,
  })
  res.json(updated)
})

router.post('/:id/fracture', async (req: Request, res: Response) => {
  const callerId = req.player!.playerId
  const source = await prisma.habitDomain.findUnique({ where: { id: req.params.id } })
  if (!source) {
    res.status(404).json({ error: 'Domain not found' })
    return
  }
  if (source.accessibilityState === 'private') {
    res.status(403).json({ error: 'Private Domains cannot be fractured' })
    return
  }
  if (source.ownerId === callerId) {
    res.status(403).json({ error: 'cannot fracture your own Domain' })
    return
  }

  const nameOverride = req.body?.name
  const fractureName = typeof nameOverride === 'string' && nameOverride.trim()
    ? nameOverride.trim()
    : source.name

  const existing = await prisma.habitDomain.findFirst({
    where: { ownerId: callerId, name: fractureName },
  })
  if (existing) {
    res.status(400).json({ error: 'you already own a Domain with that name' })
    return
  }

  const activeSkills = await prisma.skill.findMany({
    where: { domainId: source.id, archivedAt: null },
  })

  const newDomain = await prisma.habitDomain.create({
    data: {
      name: fractureName,
      ownerId: callerId,
      accessibilityState: 'public',
      rootDomainId: null,
      skills: {
        create: activeSkills.map(s => ({ name: s.name })),
      },
    },
  })

  res.status(201).json(newDomain)
})

router.post('/:id/attune', async (req: Request, res: Response) => {
  // :id = the Root Domain being attuned to (the one the caller is viewing)
  // callerDomainId = the caller's own Domain being linked
  const callerId = req.player!.playerId
  const target = await prisma.habitDomain.findUnique({ where: { id: req.params.id } })
  if (!target) {
    res.status(404).json({ error: 'Domain not found' })
    return
  }
  if (target.accessibilityState === 'private') {
    res.status(403).json({ error: 'use an invite' })
    return
  }

  const { callerDomainId } = req.body

  // Flat model: if target is itself attuned, use its rootDomainId directly
  const rootDomainId = target.rootDomainId ?? target.id

  if (!callerDomainId) {
    // Auto-copy path: create a copy of the root domain for the caller
    const activeSkills = await prisma.skill.findMany({
      where: { domainId: rootDomainId, archivedAt: null },
    })

    const newDomain = await prisma.habitDomain.create({
      data: {
        name: target.name,
        ownerId: callerId,
        accessibilityState: 'public',
        rootDomainId,
        skills: {
          create: activeSkills.map(s => ({ name: s.name })),
        },
      },
      include: { skills: true },
    })

    await prisma.attunement.create({
      data: { domainId: newDomain.id, rootDomainId },
    })

    const rootSkillMap = new Map(activeSkills.map(s => [s.name, s.id]))
    const pairData = newDomain.skills
      .filter(s => rootSkillMap.has(s.name))
      .map(s => ({ playerDomainSkillId: s.id, rootDomainSkillId: rootSkillMap.get(s.name)! }))

    if (pairData.length > 0) {
      await prisma.skillPair.createMany({ data: pairData })
    }

    res.status(201).json({ id: newDomain.id })
    return
  }

  const domain = await prisma.habitDomain.findUnique({ where: { id: callerDomainId } })
  if (!domain) {
    res.status(404).json({ error: 'Caller Domain not found' })
    return
  }
  if (domain.ownerId !== callerId) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  const existing = await prisma.attunement.findFirst({ where: { domainId: domain.id } })
  if (existing) {
    res.status(400).json({ error: 'Domain is already attuned' })
    return
  }

  const [, attunement] = await prisma.$transaction([
    prisma.habitDomain.update({ where: { id: domain.id }, data: { rootDomainId } }),
    prisma.attunement.create({ data: { domainId: domain.id, rootDomainId } }),
  ])
  res.status(201).json(attunement)
})

router.get('/:id/skill-pairs', async (req: Request, res: Response) => {
  const callerId = req.player!.playerId
  const domain = await prisma.habitDomain.findUnique({ where: { id: req.params.id } })
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' })
    return
  }
  if (!await canSeeDomain(callerId, domain)) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  const skills = await prisma.skill.findMany({ where: { domainId: domain.id }, select: { id: true } })
  const skillIds = skills.map(s => s.id)
  const pairs = await prisma.skillPair.findMany({
    where: { playerDomainSkillId: { in: skillIds } },
  })
  res.json(pairs)
})

router.post('/:id/skill-pairs', async (req: Request, res: Response) => {
  const callerId = req.player!.playerId
  const domain = await prisma.habitDomain.findUnique({ where: { id: req.params.id } })
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' })
    return
  }
  if (domain.ownerId !== callerId) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  const attunement = await prisma.attunement.findFirst({ where: { domainId: domain.id } })
  if (!attunement) {
    res.status(400).json({ error: 'Domain is not attuned' })
    return
  }

  const { playerSkillId, rootSkillId } = req.body
  const playerSkill = await prisma.skill.findUnique({ where: { id: playerSkillId } })
  if (!playerSkill || playerSkill.domainId !== domain.id) {
    res.status(400).json({ error: 'playerSkillId does not belong to this Domain' })
    return
  }

  const rootSkill = await prisma.skill.findUnique({ where: { id: rootSkillId } })
  if (!rootSkill || rootSkill.domainId !== attunement.rootDomainId) {
    res.status(400).json({ error: 'rootSkillId does not belong to the attuned Root Domain' })
    return
  }

  const pair = await prisma.skillPair.create({
    data: { playerDomainSkillId: playerSkillId, rootDomainSkillId: rootSkillId },
  })
  res.status(201).json(pair)
})

router.delete('/:id/skill-pairs/:pairId', async (req: Request, res: Response) => {
  const callerId = req.player!.playerId
  const domain = await prisma.habitDomain.findUnique({ where: { id: req.params.id } })
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' })
    return
  }
  if (domain.ownerId !== callerId) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  const skills = await prisma.skill.findMany({ where: { domainId: domain.id }, select: { id: true } })
  const skillIds = new Set(skills.map(s => s.id))
  const pair = await prisma.skillPair.findUnique({ where: { id: req.params.pairId } })
  if (!pair || !skillIds.has(pair.playerDomainSkillId)) {
    res.status(404).json({ error: 'SkillPair not found' })
    return
  }

  await prisma.skillPair.delete({ where: { id: pair.id } })
  res.status(204).end()
})

router.delete('/:id', async (req: Request, res: Response) => {
  const domain = await prisma.habitDomain.findUnique({ where: { id: req.params.id } })
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' })
    return
  }
  if (domain.ownerId !== req.player!.playerId) {
    res.status(403).json({ error: 'forbidden' })
    return
  }
  const attunedCount = await prisma.attunement.count({ where: { rootDomainId: domain.id } })
  if (attunedCount > 0) {
    res.status(409).json({ error: 'Domain has attuned Players; Ascension required (not yet implemented)' })
    return
  }
  await prisma.habitDomain.delete({ where: { id: domain.id } })
  res.status(204).end()
})

router.post('/', async (req: Request, res: Response) => {
  const { name, accessibilityState } = req.body
  const ownerId = req.player!.playerId

  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  const state = accessibilityState ?? 'public'
  if (!ACCESSIBILITY_STATES.includes(state)) {
    res.status(400).json({ error: 'invalid accessibilityState' })
    return
  }

  const domain = await prisma.habitDomain.create({
    data: {
      name: trimmed,
      ownerId,
      accessibilityState: state,
    },
  })

  res.status(201).json(domain)
})

export default router
