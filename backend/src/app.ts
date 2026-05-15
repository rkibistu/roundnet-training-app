import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import { requireAuth } from './middleware/jwt.js'

const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/auth', authRouter)

// test-only route to verify JWT middleware
if (process.env.NODE_ENV !== 'production') {
  app.get('/protected-test', requireAuth, (req, res) => {
    res.json(req.player)
  })
}

export default app
