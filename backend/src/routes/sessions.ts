import { Router, Request, Response } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/jwt.js'
import { calculateXP } from '../xpEngine.js'

const router = Router()

router.post('/sessions', requireAuth, async (req: Request, res: Response) => {
  const playerId = req.player!.playerId
  const date = req.body.date ? new Date(req.body.date) : new Date()
  try {
    const session = await prisma.session.create({
      data: { playerId, date },
    })
    res.status(201).json(session)
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  const { player_id } = req.query
  try {
    const sessions = await prisma.session.findMany({
      where: player_id ? { playerId: String(player_id) } : undefined,
      orderBy: { date: 'desc' },
      include: {
        player: { select: { nickname: true } },
        entries: { select: { durationMinutes: true } },
      },
    })
    const result = sessions.map(({ player, entries, ...s }) => ({
      ...s,
      playerNickname: player.nickname,
      totalDuration: entries.reduce((sum, e) => sum + e.durationMinutes, 0),
    }))
    res.json(result)
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.get('/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        player: { select: { id: true, nickname: true } },
        entries: {
          include: {
            exercise: { include: { category: { select: { name: true } } } },
          },
        },
      },
    })
    if (!session) { res.status(404).json({ error: 'session not found' }); return }
    const { player, entries, ...sessionFields } = session
    res.json({
      ...sessionFields,
      player,
      entries: entries.map(({ exercise, ...e }) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        exerciseName: exercise.name,
        categoryName: exercise.category.name,
        durationMinutes: e.durationMinutes,
        qualityScore: e.qualityScore,
        xpEarned: e.xpEarned,
      })),
    })
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.post('/sessions/:id/entries', requireAuth, async (req: Request, res: Response) => {
  const { id: sessionId } = req.params
  const { exercise_id, duration_minutes, quality_score } = req.body

  if (!exercise_id || !duration_minutes || !quality_score) {
    res.status(400).json({ error: 'exercise_id, duration_minutes, and quality_score are required' })
    return
  }

  try {
    const session = await prisma.session.findUnique({ where: { id: sessionId } })
    if (!session) { res.status(404).json({ error: 'session not found' }); return }

    const exercise = await prisma.exercise.findUnique({ where: { id: exercise_id } })
    if (!exercise) { res.status(404).json({ error: 'exercise not found' }); return }

    const score = Number(quality_score) as 1 | 2 | 3 | 4 | 5
    const xpEarned = calculateXP(Number(duration_minutes), score)

    const entry = await prisma.sessionEntry.create({
      data: {
        sessionId,
        exerciseId: exercise_id,
        durationMinutes: Number(duration_minutes),
        qualityScore: score,
        xpEarned,
        xpLedger: {
          create: [
            { playerId: session.playerId, categoryId: null, xp: xpEarned },
            { playerId: session.playerId, categoryId: exercise.categoryId, xp: xpEarned },
          ],
        },
      },
    })
    res.status(201).json(entry)
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

export default router
