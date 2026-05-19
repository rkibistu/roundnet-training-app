import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, nickname, invite_code } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  try {
    const existing = await prisma.player.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'email already registered' })
      return
    }

    const playerCount = await prisma.player.count()
    const isFirstPlayer = playerCount === 0

    let invite = null
    if (!isFirstPlayer) {
      if (!invite_code) {
        res.status(400).json({ error: 'invite_code is required' })
        return
      }
      invite = await prisma.invite.findUnique({ where: { code: invite_code } })
      if (!invite || invite.usedBy) {
        res.status(400).json({ error: 'invalid or already used invite code' })
        return
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const player = await prisma.player.create({
      data: { email, passwordHash, nickname, isAdmin: isFirstPlayer },
    })

    if (invite) {
      await prisma.invite.update({ where: { id: invite.id }, data: { usedBy: player.id } })
    }

    res.status(201).json({
      id: player.id,
      email: player.email,
      nickname: player.nickname,
      isAdmin: player.isAdmin,
      createdAt: player.createdAt,
    })
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  try {
    const player = await prisma.player.findUnique({ where: { email } })
    if (!player) {
      res.status(401).json({ error: 'invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, player.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'invalid credentials' })
      return
    }

    const token = jwt.sign(
      { sub: player.id, email: player.email, nickname: player.nickname ?? '', is_admin: player.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.json({ token })
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

export default router
