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
  if (!player_id) {
    res.status(400).json({ error: 'player_id is required' })
    return
  }
  try {
    const sessions = await prisma.session.findMany({
      where: { playerId: String(player_id) },
      orderBy: { date: 'desc' },
    })
    res.json(sessions)
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
