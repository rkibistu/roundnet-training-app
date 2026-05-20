import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import { resolve } from 'path'
import { fileURLToPath } from 'url'



const dir = fileURLToPath(new URL('.', import.meta.url))
expand(config({ path: resolve(dir, '../../.env') }))

console.log('Starting server...')
const { default: app } = await import('./app.js')
console.log('App imported')
const { default: prisma } = await import('./db.js')
console.log('Prisma imported')
const { hash } = await import('bcrypt')
console.log('bcrypt imported')

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

try {
  await bootstrap()
} catch (err) {
  console.error('Bootstrap failed:', err)
  process.exit(1)
}

const PORT = process.env.PORT ?? '3000'
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})


