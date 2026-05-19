import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import app from '../src/app.js'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'

function makeToken(playerId: string) {
  return jwt.sign({ sub: playerId, is_admin: false }, JWT_SECRET, { expiresIn: '1h' })
}

async function createPlayer(email: string): Promise<string> {
  const player = await prisma.player.create({
    data: { email, passwordHash: 'x' },
  })
  return player.id
}

beforeEach(async () => {
  await prisma.exercise.deleteMany()
  await prisma.invite.deleteMany()
  await prisma.player.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /categories', () => {
  it('returns all 5 seeded categories', async () => {
    const res = await request(app).get('/categories')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(5)
    const names = res.body.map((c: { name: string }) => c.name)
    expect(names).toEqual(expect.arrayContaining(['Hitting', 'Serving', 'Reaction', 'Setting', 'Defence']))
  })
})

describe('POST /exercises', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/exercises').send({ name: 'Cross', categoryId: 'any' })
    expect(res.status).toBe(401)
  })

  it('creates an exercise attributed to the authenticated Player', async () => {
    const playerId = await createPlayer('alice@example.com')
    const categoryRes = await request(app).get('/categories')
    const categoryId = categoryRes.body[0].id

    const res = await request(app)
      .post('/exercises')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ name: 'Cross-court hit', categoryId })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Cross-court hit', createdBy: playerId })
    expect(res.body.category.id).toBe(categoryId)
  })
})

describe('GET /exercises', () => {
  it('returns all exercises', async () => {
    const playerId = await createPlayer('alice@example.com')
    const categoryRes = await request(app).get('/categories')
    const categoryId = categoryRes.body[0].id

    await request(app)
      .post('/exercises')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ name: 'Cross-court hit', categoryId })

    const res = await request(app).get('/exercises')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('filters by category_id', async () => {
    const playerId = await createPlayer('alice@example.com')
    const categoryRes = await request(app).get('/categories')
    const [catA, catB] = categoryRes.body

    await request(app)
      .post('/exercises')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ name: 'Exercise A', categoryId: catA.id })
    await request(app)
      .post('/exercises')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ name: 'Exercise B', categoryId: catB.id })

    const res = await request(app).get(`/exercises?category_id=${catA.id}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Exercise A')
  })
})

describe('PATCH /exercises/:id', () => {
  it('returns 403 when requester is not the creator', async () => {
    const alice = await createPlayer('alice@example.com')
    const bob = await createPlayer('bob@example.com')
    const categoryRes = await request(app).get('/categories')
    const categoryId = categoryRes.body[0].id

    const createRes = await request(app)
      .post('/exercises')
      .set('Authorization', `Bearer ${makeToken(alice)}`)
      .send({ name: 'Alice exercise', categoryId })
    const exerciseId = createRes.body.id

    const res = await request(app)
      .patch(`/exercises/${exerciseId}`)
      .set('Authorization', `Bearer ${makeToken(bob)}`)
      .send({ name: 'Stolen rename' })
    expect(res.status).toBe(403)
  })

  it('updates name for the creator', async () => {
    const playerId = await createPlayer('alice@example.com')
    const categoryRes = await request(app).get('/categories')
    const categoryId = categoryRes.body[0].id

    const createRes = await request(app)
      .post('/exercises')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ name: 'Old name', categoryId })
    const exerciseId = createRes.body.id

    const res = await request(app)
      .patch(`/exercises/${exerciseId}`)
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ name: 'New name', categoryId })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New name')
  })
})

describe('DELETE /exercises/:id', () => {
  it('returns 403 when requester is not the creator', async () => {
    const alice = await createPlayer('alice@example.com')
    const bob = await createPlayer('bob@example.com')
    const categoryRes = await request(app).get('/categories')
    const categoryId = categoryRes.body[0].id

    const createRes = await request(app)
      .post('/exercises')
      .set('Authorization', `Bearer ${makeToken(alice)}`)
      .send({ name: 'Alice exercise', categoryId })
    const exerciseId = createRes.body.id

    const res = await request(app)
      .delete(`/exercises/${exerciseId}`)
      .set('Authorization', `Bearer ${makeToken(bob)}`)
    expect(res.status).toBe(403)
  })

  it('deletes the exercise for the creator', async () => {
    const playerId = await createPlayer('alice@example.com')
    const categoryRes = await request(app).get('/categories')
    const categoryId = categoryRes.body[0].id

    const createRes = await request(app)
      .post('/exercises')
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
      .send({ name: 'To delete', categoryId })
    const exerciseId = createRes.body.id

    const res = await request(app)
      .delete(`/exercises/${exerciseId}`)
      .set('Authorization', `Bearer ${makeToken(playerId)}`)
    expect(res.status).toBe(204)

    const listRes = await request(app).get('/exercises')
    expect(listRes.body).toHaveLength(0)
  })
})
