import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, nickname } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  const existing = await prisma.player.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'email already registered' })
    return
  }

  const playerCount = await prisma.player.count()
  const isAdmin = playerCount === 0

  const passwordHash = await bcrypt.hash(password, 10)
  const player = await prisma.player.create({
    data: { email, passwordHash, nickname, isAdmin },
  })

  res.status(201).json({
    id: player.id,
    email: player.email,
    nickname: player.nickname,
    isAdmin: player.isAdmin,
    createdAt: player.createdAt,
  })
})

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

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

  const token = jwt.sign({ playerId: player.id, isAdmin: player.isAdmin }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token })
})

export default router
