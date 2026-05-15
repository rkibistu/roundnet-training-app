import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

const FRONTEND_ORIGIN = 'http://localhost:5173'

describe('CORS', () => {
  it('sets Access-Control-Allow-Origin on normal requests', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', FRONTEND_ORIGIN)

    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN)
  })

  it('handles OPTIONS preflight for /auth/register', async () => {
    const res = await request(app)
      .options('/auth/register')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type')

    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN)
  })
})
