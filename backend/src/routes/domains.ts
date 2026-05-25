import { Router, Request, Response } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/jwt.js'
import skillsRouter from './skills.js'

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
  if (domain.accessibilityState === 'private' && domain.ownerId !== req.player!.playerId) {
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
  const { name } = req.body
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const updated = await prisma.habitDomain.update({
    where: { id: domain.id },
    data: { name: trimmed },
  })
  res.json(updated)
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
