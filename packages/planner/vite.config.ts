import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  base: '/plan',
  server: { port: 5191, strictPort: true },
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
