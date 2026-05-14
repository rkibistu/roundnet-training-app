import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'

export interface PlayerContext {
  playerId: string
  isAdmin: boolean
}

declare global {
  namespace Express {
    interface Request {
      player?: PlayerContext
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing or invalid token' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as PlayerContext
    req.player = { playerId: payload.playerId, isAdmin: payload.isAdmin }
    next()
  } catch {
    res.status(401).json({ error: 'invalid token' })
  }
}
