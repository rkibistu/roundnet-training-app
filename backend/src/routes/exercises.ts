import { Router, Request, Response } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/jwt.js'

const router = Router()

router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    res.json(categories)
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.get('/exercises', async (req: Request, res: Response) => {
  try {
    const { category_id } = req.query
    const exercises = await prisma.exercise.findMany({
      where: category_id ? { categoryId: String(category_id) } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    })
    res.json(exercises)
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.post('/exercises', requireAuth, async (req: Request, res: Response) => {
  const { name, categoryId } = req.body
  if (!name || !categoryId) {
    res.status(400).json({ error: 'name and categoryId are required' })
    return
  }
  try {
    const exercise = await prisma.exercise.create({
      data: { name, categoryId, createdBy: req.player!.playerId },
      include: { category: true },
    })
    res.status(201).json(exercise)
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.patch('/exercises/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const exercise = await prisma.exercise.findUnique({ where: { id } })
    if (!exercise) { res.status(404).json({ error: 'not found' }); return }
    if (exercise.createdBy !== req.player!.playerId) { res.status(403).json({ error: 'forbidden' }); return }

    const updated = await prisma.exercise.update({
      where: { id },
      data: { name: req.body.name, categoryId: req.body.categoryId },
      include: { category: true },
    })
    res.json(updated)
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

router.delete('/exercises/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const exercise = await prisma.exercise.findUnique({ where: { id } })
    if (!exercise) { res.status(404).json({ error: 'not found' }); return }
    if (exercise.createdBy !== req.player!.playerId) { res.status(403).json({ error: 'forbidden' }); return }

    await prisma.exercise.delete({ where: { id } })
    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'internal server error' })
  }
})

export default router
