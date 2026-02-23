import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  base: '/play',
  server: { port: 5190, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/play',
        name: 'PadelDay — Tournament Manager',
        short_name: 'PadelDay',
        description: 'Run padel & racket sport tournaments on your phone. Score matches live, view standings, americano & mexicano formats. Free & offline.',
        start_url: '/play',
        scope: '/play',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['sports', 'utilities'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: 'screenshots/mobile-scoring.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Live match scoring',
          },
          {
            src: 'screenshots/mobile-standings.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Tournament standings',
          },
        ],
      },
    }),
  ],
})
