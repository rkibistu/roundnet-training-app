import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const dir = fileURLToPath(new URL('.', import.meta.url))
expand(config({ path: resolve(dir, '../../.env') }))

const { default: app } = await import('./app.js')

const PORT = process.env.PORT ?? '3000'
app.listen(Number(PORT), () => {
  console.log(`Server running on port ${PORT}`)
})
