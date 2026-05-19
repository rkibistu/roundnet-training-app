import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app.js'
import prisma from '../src/db.js'

vi.mock('../src/db.js', () => ({
  default: {
    invite: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

const mockPrisma = prisma as {
  invite: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'

function makeToken(playerId: string, isAdmin: boolean) {
  return jwt.sign({ playerId, isAdmin }, JWT_SECRET, { expiresIn: '1h' })
}

describe('POST /invites', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/invites')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin player', async () => {
    const token = makeToken('player-1', false)
    const res = await request(app).post('/invites').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('returns 201 with a code for admin', async () => {
    mockPrisma.invite.create.mockResolvedValue({ code: 'abc123' })
    const token = makeToken('admin-1', true)
    const res = await request(app).post('/invites').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('code')
    expect(typeof res.body.code).toBe('string')
  })
})
