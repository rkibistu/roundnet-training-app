import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import invitesRouter from './routes/invites.js'
import exercisesRouter from './routes/exercises.js'
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
app.use('/invites', invitesRouter)
app.use('/', exercisesRouter)

// test-only route to verify JWT middleware
if (process.env.NODE_ENV !== 'production') {
  app.get('/protected-test', requireAuth, (req, res) => {
    res.json(req.player)
  })
}

export default app
