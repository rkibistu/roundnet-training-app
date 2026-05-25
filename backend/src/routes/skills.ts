import { Router, Request, Response } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/jwt.js'

const router = Router({ mergeParams: true })

router.use(requireAuth)

async function loadDomainForReader(req: Request, res: Response) {
  const domainId = req.params.id
  const domain = await prisma.habitDomain.findUnique({ where: { id: domainId } })
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' })
    return null
  }
  if (domain.accessibilityState === 'private' && domain.ownerId !== req.player!.playerId) {
    res.status(403).json({ error: 'forbidden' })
    return null
  }
  return domain
}

async function loadDomainForOwner(req: Request, res: Response) {
  const domain = await prisma.habitDomain.findUnique({ where: { id: req.params.id } })
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' })
    return null
  }
  if (domain.ownerId !== req.player!.playerId) {
    res.status(403).json({ error: 'forbidden' })
    return null
  }
  return domain
}

router.get('/', async (req: Request, res: Response) => {
  const domain = await loadDomainForReader(req, res)
  if (!domain) return
  const includeArchived = req.query.includeArchived === 'true'
  const skills = await prisma.skill.findMany({
    where: {
      domainId: domain.id,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
  })
  res.json(skills)
})

router.post('/', async (req: Request, res: Response) => {
  const domain = await loadDomainForOwner(req, res)
  if (!domain) return

  const trimmed = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!trimmed) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  const skill = await prisma.skill.create({
    data: { name: trimmed, domainId: domain.id },
  })
  res.status(201).json(skill)
})

router.patch('/:skillId', async (req: Request, res: Response) => {
  const domain = await loadDomainForOwner(req, res)
  if (!domain) return

  const skill = await prisma.skill.findUnique({ where: { id: req.params.skillId } })
  if (!skill || skill.domainId !== domain.id) {
    res.status(404).json({ error: 'Skill not found' })
    return
  }

  const trimmed = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!trimmed) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  const updated = await prisma.skill.update({ where: { id: skill.id }, data: { name: trimmed } })
  res.json(updated)
})

router.delete('/:skillId', async (req: Request, res: Response) => {
  const domain = await loadDomainForOwner(req, res)
  if (!domain) return

  const skill = await prisma.skill.findUnique({ where: { id: req.params.skillId } })
  if (!skill || skill.domainId !== domain.id) {
    res.status(404).json({ error: 'Skill not found' })
    return
  }

  await prisma.$transaction([
    prisma.skillPair.deleteMany({
      where: {
        OR: [{ playerDomainSkillId: skill.id }, { rootDomainSkillId: skill.id }],
      },
    }),
    prisma.skill.update({
      where: { id: skill.id },
      data: { archivedAt: new Date() },
    }),
  ])

  res.status(204).end()
})

router.post('/:skillId/restore', async (req: Request, res: Response) => {
  const domain = await loadDomainForOwner(req, res)
  if (!domain) return

  const skill = await prisma.skill.findUnique({ where: { id: req.params.skillId } })
  if (!skill || skill.domainId !== domain.id) {
    res.status(404).json({ error: 'Skill not found' })
    return
  }

  const updated = await prisma.skill.update({
    where: { id: skill.id },
    data: { archivedAt: null },
  })
  res.json(updated)
})

export default router
