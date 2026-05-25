import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import domainsRouter from './routes/domains.js'
import sessionsRouter from './routes/sessions.js'
import { requireAuth } from './middleware/jwt.js'

const app = express()
const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
app.use(cors({
  origin: allowedOrigin === '*' ? true : allowedOrigin,
}))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/auth', authRouter)
app.use('/domains', domainsRouter)
app.use('/sessions', sessionsRouter)

// test-only route to verify JWT middleware
if (process.env.NODE_ENV !== 'production') {
  app.get('/protected-test', requireAuth, (req, res) => {
    res.json(req.player)
  })
}

export default app
