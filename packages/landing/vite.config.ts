import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { resolve } from 'path'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  base: '/',
  server: { port: 5192, strictPort: true },
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        formats: resolve(__dirname, 'formats/index.html'),
        americano: resolve(__dirname, 'americano/index.html'),
        mexicano: resolve(__dirname, 'mexicano/index.html'),
        awards: resolve(__dirname, 'awards/index.html'),
        maldiciones: resolve(__dirname, 'maldiciones/index.html'),
        club: resolve(__dirname, 'club/index.html'),
      },
    },
  },
})
