import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../src/app.js'

const prisma = new PrismaClient()

beforeEach(async () => {
  await prisma.xpLedger.deleteMany()
  await prisma.sessionEntry.deleteMany()
  await prisma.session.deleteMany()
  await prisma.skillPair.deleteMany()
  await prisma.attunement.deleteMany()
  await prisma.skill.deleteMany()
  await prisma.habitDomain.deleteMany()
  await prisma.player.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

function decodeJwtPayload(token: string) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
}

describe('JWT claims returned from login', () => {
  it('contains sub, email, nickname, and is_admin matching the registered player', async () => {
    const regRes = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'password123',
      nickname: 'Alice',
    })
    const playerId = regRes.body.id

    const loginRes = await request(app).post('/auth/login').send({
      email: 'alice@example.com',
      password: 'password123',
    })

    const claims = decodeJwtPayload(loginRes.body.token)
    expect(claims.sub).toBe(playerId)
    expect(claims.email).toBe('alice@example.com')
    expect(claims.nickname).toBe('Alice')
    expect(claims.is_admin).toBe(true)
    expect(claims.exp).toBeDefined()
  })

  it('sets is_admin to false for non-first player', async () => {
    await request(app).post('/auth/register').send({ email: 'first@example.com', password: 'pw' })
    await request(app).post('/auth/register').send({
      email: 'second@example.com',
      password: 'pw',
      nickname: 'Bob',
    })

    const loginRes = await request(app).post('/auth/login').send({
      email: 'second@example.com',
      password: 'pw',
    })

    const claims = decodeJwtPayload(loginRes.body.token)
    expect(claims.is_admin).toBe(false)
    expect(claims.nickname).toBe('Bob')
  })

  it('sets nickname to empty string when player registered without one', async () => {
    await request(app).post('/auth/register').send({
      email: 'noname@example.com',
      password: 'pw',
    })

    const loginRes = await request(app).post('/auth/login').send({
      email: 'noname@example.com',
      password: 'pw',
    })

    const claims = decodeJwtPayload(loginRes.body.token)
    expect(claims.nickname).toBe('')
  })
})

describe('POST /auth/register input validation', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/auth/register').send({ password: 'pw' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/email/)
  })

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'a@b.com' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/password/)
  })

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/auth/register').send({})
    expect(res.status).toBe(400)
  })
})
