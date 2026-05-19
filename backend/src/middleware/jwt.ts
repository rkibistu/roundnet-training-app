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
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; is_admin: boolean }
    req.player = { playerId: payload.sub, isAdmin: payload.is_admin }
    next()
  } catch {
    res.status(401).json({ error: 'invalid token' })
  }
}
