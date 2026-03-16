import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { resolve } from 'path'
import { globSync } from 'glob'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

// Auto-discover all index.html entry points, excluding dist/
const htmlFiles = globSync('**/index.html', {
  cwd: __dirname,
  ignore: ['dist/**', 'node_modules/**'],
})

const input = Object.fromEntries(
  htmlFiles.map(file => {
    const name = file === 'index.html'
      ? 'main'
      : file.replace(/\/index\.html$/, '').replace(/\//g, '-')
    return [name, resolve(__dirname, file)]
  })
)

export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  base: '/',
  server: { port: 5192, strictPort: true },
  plugins: [react()],
  build: {
    rollupOptions: { input },
  },
})
