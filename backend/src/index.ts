import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const dir = fileURLToPath(new URL('.', import.meta.url))
expand(config({ path: resolve(dir, '../../.env') }))

const { default: app } = await import('./app.js')
const { default: prisma } = await import('./db.js')
const { hash } = await import('bcrypt')

async function bootstrap() {
  const exists = await prisma.player.findUnique({ where: { email: 'admin@admin.com' } })
  if (!exists) {
    await prisma.player.create({
      data: {
        email: 'admin@admin.com',
        passwordHash: await hash('admin', 10),
        nickname: 'admin',
        isAdmin: true,
      },
    })
    console.log('Bootstrap: admin@admin.com created')
  }
}

const PORT = process.env.PORT ?? '3000'
app.listen(Number(PORT), async () => {
  console.log(`Server running on port ${PORT}`)
  try {
    await bootstrap()
  } catch (err) {
    console.error('Bootstrap failed:', err)
    process.exit(1)
  }
})
