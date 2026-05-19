import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'
import { expand } from 'dotenv-expand'

expand(config({ path: '../.env' }))

export default defineConfig({
  test: {
    globals: true,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
})
