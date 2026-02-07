# Tournament Runner

PWA, works offline at the court.

- Input: JSON file from the Planner app (paste or upload)
- Shows schedule, enter scores, live standings
- All state in localStorage — no network needed
- "Copy results" button for group chat backup
- Works on any phone, even with zero signal at the court

## Features

- **Americano format** with automatic schedule generation balanced for partner/opponent variety
- **Live scoring** — tap to enter match scores, round-by-round progression with interstitial between rounds
- **Standings** — live leaderboard with points, wins/losses, point differential, and games played/planned counts
- **Statistics** — per-player partner and opponent frequency breakdown to verify schedule fairness
- **Player management** mid-tournament — add, replace, or toggle availability with automatic schedule regeneration
- **Export/Import** — copy tournament state as JSON for backup or transfer between devices
- **Offline-first** — service worker caches everything; no network needed after install

## Tech

- React 19, TypeScript, Vite 7, CSS Modules
- `vite-plugin-pwa` for service worker and installability
- State via `useReducer` + Context, auto-saved to `localStorage`
- Strategy pattern for tournament formats (`packages/runner/src/strategies/`)

## Development

```sh
# from monorepo root
npm install
make dev        # starts runner dev server (+ planner)
make build      # production build
```

Dev server runs at `http://localhost:5173/play`.
