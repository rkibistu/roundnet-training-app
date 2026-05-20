import { Router, Request, Response } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/jwt.js'
import { xpToLevel, levelToXpThreshold } from '../levelEngine.js'

const router = Router()

function levelBar(xp: number) {
  const level = xpToLevel(xp)
  const xpFloor = levelToXpThreshold(level)
  const xpCeiling = levelToXpThreshold(level + 1)
  return { level, xp, xpFloor, xpCeiling }
}

router.get('/players', requireAuth, async (_req: Request, res: Response) => {
  try {
    const players = await prisma.player.findMany({ orderBy: { createdAt: 'asc' } })

    const ledgerTotals = await prisma.xpLedger.groupBy({
      by: ['playerId'],
      where: { categoryId: null },
      _sum: { xp: true },
    })
    const xpByPlayer = new Map(ledgerTotals.map(r => [r.playerId, r._sum.xp ?? 0]))

    const result = players.map(p => ({
      id: p.id,
      nickname: p.nickname,
      isAdmin: p.isAdmin,
      generalLevel: levelBar(xpByPlayer.get(p.id) ?? 0),
    }))
    res.json(result)
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.get('/players/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const player = await prisma.player.findUnique({ where: { id } })
    if (!player) { res.status(404).json({ error: 'player not found' }); return }

    const ledger = await prisma.xpLedger.groupBy({
      by: ['categoryId'],
      where: { playerId: id },
      _sum: { xp: true },
    })

    const generalXP = ledger.find(r => r.categoryId === null)?._sum.xp ?? 0
    const categoryXPs = ledger.filter(r => r.categoryId !== null)

    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    const xpByCat = new Map(categoryXPs.map(r => [r.categoryId!, r._sum.xp ?? 0]))

    const categoryLevels = categories.map(cat => ({
      categoryId: cat.id,
      categoryName: cat.name,
      ...levelBar(xpByCat.get(cat.id) ?? 0),
    }))

    const sessions = await prisma.session.findMany({
      where: { playerId: id },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        player: { select: { nickname: true } },
        entries: { select: { durationMinutes: true } },
      },
    })

    const recentSessions = sessions.map(({ player: p, entries, ...s }) => ({
      ...s,
      playerNickname: p.nickname,
      totalDuration: entries.reduce((sum, e) => sum + e.durationMinutes, 0),
    }))

    res.json({
      id: player.id,
      nickname: player.nickname,
      isAdmin: player.isAdmin,
      generalLevel: levelBar(generalXP),
      categoryLevels,
      recentSessions,
    })
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.patch('/players/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  const authPlayerId = req.player!.playerId

  if (id !== authPlayerId) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  const { nickname } = req.body
  try {
    const updated = await prisma.player.update({
      where: { id },
      data: { nickname },
    })
    res.json({ id: updated.id, nickname: updated.nickname, isAdmin: updated.isAdmin })
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

export default router
