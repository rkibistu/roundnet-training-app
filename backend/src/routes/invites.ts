import { Router, Request, Response } from 'express'
import { randomBytes } from 'crypto'
import prisma from '../db.js'
import { requireAuth } from '../middleware/jwt.js'

const router = Router()

router.post('/', requireAuth, async (req: Request, res: Response) => {
  if (!req.player?.isAdmin) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  const code = randomBytes(9).toString('base64url')
  const invite = await prisma.invite.create({
    data: { code, createdBy: req.player.playerId },
  })

  res.status(201).json({ code: invite.code })
})

export default router
