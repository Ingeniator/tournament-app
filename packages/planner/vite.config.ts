import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/plan',
  server: { port: 5191, strictPort: true },
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
