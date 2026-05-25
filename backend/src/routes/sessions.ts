import { Router, Request, Response } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/jwt.js'
import { calculateXP } from '../xpEngine.js'

const router = Router()

router.use(requireAuth)

router.get('/:id', async (req: Request, res: Response) => {
  const callerId = req.player!.playerId
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: {
      domain: { select: { name: true } },
      entries: {
        include: { skill: { select: { name: true } } },
      },
    },
  })

  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  if (session.playerId !== callerId) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  const { domain, entries, ...rest } = session
  res.json({
    ...rest,
    domainName: domain.name,
    entries: entries.map(({ skill, ...e }) => ({ ...e, skillName: skill.name })),
  })
})

router.post('/', async (req: Request, res: Response) => {
  const { domainId, date } = req.body
  const callerId = req.player!.playerId

  if (!domainId) {
    res.status(400).json({ error: 'domainId is required' })
    return
  }

  const domain = await prisma.habitDomain.findUnique({ where: { id: domainId } })
  if (!domain) {
    res.status(400).json({ error: 'domainId is required' })
    return
  }
  if (domain.ownerId !== callerId) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  const session = await prisma.session.create({
    data: {
      playerId: callerId,
      domainId,
      date: date ? new Date(date) : new Date(),
    },
  })

  res.status(201).json(session)
})

router.post('/:id/entries', async (req: Request, res: Response) => {
  const { skillId, durationMinutes, qualityScore } = req.body
  const callerId = req.player!.playerId

  const session = await prisma.session.findUnique({ where: { id: req.params.id } })
  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  if (session.playerId !== callerId) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  if (!skillId || durationMinutes == null || qualityScore == null) {
    res.status(400).json({ error: 'skillId, durationMinutes, and qualityScore are required' })
    return
  }

  const skill = await prisma.skill.findUnique({ where: { id: skillId } })
  if (!skill || skill.domainId !== session.domainId) {
    res.status(400).json({ error: 'skillId must belong to the Session Domain' })
    return
  }

  const xpEarned = calculateXP(durationMinutes, qualityScore)

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.sessionEntry.create({
      data: {
        sessionId: session.id,
        skillId,
        durationMinutes,
        qualityScore,
        xpEarned,
      },
    })

    await tx.xpLedger.createMany({
      data: [
        { playerId: callerId, skillId, domainId: null, xp: xpEarned, sourceEntryId: created.id },
        { playerId: callerId, skillId: null, domainId: session.domainId, xp: xpEarned, sourceEntryId: created.id },
        { playerId: callerId, skillId: null, domainId: null, xp: xpEarned, sourceEntryId: created.id },
      ],
    })

    return created
  })

  res.status(201).json(entry)
})

export default router
