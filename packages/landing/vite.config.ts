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
        'which-format': resolve(__dirname, 'which-format/index.html'),
        organize: resolve(__dirname, 'organize/index.html'),
        'americano-vs-mexicano': resolve(__dirname, 'americano-vs-mexicano/index.html'),
        'team-americano': resolve(__dirname, 'team-americano/index.html'),
        'king-of-the-court': resolve(__dirname, 'king-of-the-court/index.html'),
        'mexicano-12-players': resolve(__dirname, 'mexicano-12-players/index.html'),
        'mexicano-16-players': resolve(__dirname, 'mexicano-16-players/index.html'),
        features: resolve(__dirname, 'features/index.html'),
        'americano-8-players': resolve(__dirname, 'americano-8-players/index.html'),
        'americano-12-players': resolve(__dirname, 'americano-12-players/index.html'),
        'mexicano-8-players': resolve(__dirname, 'mexicano-8-players/index.html'),
        'how-long-padel-tournament': resolve(__dirname, 'how-long-padel-tournament/index.html'),
        'social-padel-events': resolve(__dirname, 'social-padel-events/index.html'),
        'inter-club': resolve(__dirname, 'inter-club/index.html'),
        'round-robin-vs-americano': resolve(__dirname, 'round-robin-vs-americano/index.html'),
        'balanced-matches': resolve(__dirname, 'balanced-matches/index.html'),
        beginners: resolve(__dirname, 'beginners/index.html'),
        'score-tracker': resolve(__dirname, 'score-tracker/index.html'),
        planner: resolve(__dirname, 'planner/index.html'),
        'es': resolve(__dirname, 'es/index.html'),
        'es-formatos': resolve(__dirname, 'es/formatos/index.html'),
        'es-americano': resolve(__dirname, 'es/americano/index.html'),
        'es-mexicano': resolve(__dirname, 'es/mexicano/index.html'),
        'es-organizar': resolve(__dirname, 'es/organizar-torneo-padel/index.html'),
      },
    },
  },
})
