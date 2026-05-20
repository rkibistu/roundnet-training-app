import { Router, Request, Response } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/jwt.js'
import { xpToLevel } from '../levelEngine.js'

const router = Router()

router.get('/leaderboard', requireAuth, async (_req: Request, res: Response) => {
  try {
    const players = await prisma.player.findMany()
    const ledger = await prisma.xpLedger.groupBy({
      by: ['playerId'],
      where: { categoryId: null },
      _sum: { xp: true },
    })
    const xpByPlayer = new Map(ledger.map(r => [r.playerId, r._sum.xp ?? 0]))

    const ranked = players
      .map(p => ({ playerId: p.id, nickname: p.nickname, xp: xpByPlayer.get(p.id) ?? 0 }))
      .sort((a, b) => b.xp - a.xp)
      .map((entry, i) => ({ rank: i + 1, ...entry, level: xpToLevel(entry.xp) }))

    res.json(ranked)
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.get('/leaderboard/:category_id', requireAuth, async (req: Request, res: Response) => {
  const { category_id } = req.params
  try {
    const players = await prisma.player.findMany()
    const ledger = await prisma.xpLedger.groupBy({
      by: ['playerId'],
      where: { categoryId: category_id },
      _sum: { xp: true },
    })
    const xpByPlayer = new Map(ledger.map(r => [r.playerId, r._sum.xp ?? 0]))

    const ranked = players
      .map(p => ({ playerId: p.id, nickname: p.nickname, xp: xpByPlayer.get(p.id) ?? 0 }))
      .sort((a, b) => b.xp - a.xp)
      .map((entry, i) => ({ rank: i + 1, ...entry, level: xpToLevel(entry.xp) }))

    res.json(ranked)
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

export default router
