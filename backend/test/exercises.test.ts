import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('/categories and /exercises routes are removed', () => {
  it('GET /categories returns 404', async () => {
    const res = await request(app).get('/categories')
    expect(res.status).toBe(404)
  })

  it('GET /exercises returns 404', async () => {
    const res = await request(app).get('/exercises')
    expect(res.status).toBe(404)
  })

  it('POST /exercises returns 404', async () => {
    const res = await request(app).post('/exercises').send({ name: 'x', categoryId: 'y' })
    expect(res.status).toBe(404)
  })

  it('PATCH /exercises/:id returns 404', async () => {
    const res = await request(app).patch('/exercises/anything').send({})
    expect(res.status).toBe(404)
  })

  it('DELETE /exercises/:id returns 404', async () => {
    const res = await request(app).delete('/exercises/anything')
    expect(res.status).toBe(404)
  })
})
