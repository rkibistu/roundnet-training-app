import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('/invites route is removed', () => {
  it('POST /invites returns 404', async () => {
    const res = await request(app).post('/invites')
    expect(res.status).toBe(404)
  })

  it('GET /invites returns 404', async () => {
    const res = await request(app).get('/invites')
    expect(res.status).toBe(404)
  })
})
