# Tournament Manager

Two-app toolkit for running padel Americano tournaments: plan at home, run at the court.

## Apps

### [Runner](/packages/runner) (`/play`)

PWA, works offline at the court.

- Input: JSON file from the Planner app (paste or upload)
- Shows schedule, enter scores, live standings
- All state in localStorage — no network needed
- "Copy results" button for group chat backup
- Works on any phone, even with zero signal at the court

### [Planner](/packages/planner) (`/plan`)

Web app for pre-tournament setup (coming soon).

- Create tournament: pick format, set courts, add players
- Generate balanced schedule (Americano, Mexicano, etc.)
- Export as JSON — paste into Runner at the court
- Share tournament link with players beforehand

## Monorepo Structure

```
packages/
  common/    — shared types and utilities
  runner/    — PWA scoring app (offline-first)
  planner/   — tournament planning app
```

## Development

```sh
npm install
make dev          # starts both apps in parallel
make build        # production build (both apps)
make deploy-build # build + merge into dist/ for deployment
```

## Deployment

Cloudflare Pages. Root redirects to `/play`.

## Tech

- React 19, TypeScript, Vite 7, CSS Modules
- npm workspaces monorepo
- `vite-plugin-pwa` for Runner's service worker
