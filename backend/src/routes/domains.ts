import { Router, Request, Response } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/jwt.js'
import skillsRouter from './skills.js'
import { canSee } from '../visibility.js'

const ACCESSIBILITY_STATES = ['public', 'protected', 'private'] as const

const router = Router()

router.use('/:id/skills', skillsRouter)

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  const callerId = req.player!.playerId
  const domains = await prisma.habitDomain.findMany({
    where: {
      OR: [
        { ownerId: callerId },
        { accessibilityState: { in: ['public', 'protected'] } },
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
  if (!canSee(req.player!.playerId, domain)) {
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
  if (!canSee(callerId, source)) {
    res.status(403).json({ error: 'forbidden' })
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
