# Tournament Runner

Offline-first PWA for scoring tournaments at the court.

## Features

- **Americano & Mexicano formats** with automatic schedule generation
- **Live scoring** -- tap to enter match scores, round-by-round progression
- **Standings** -- live leaderboard ranked by total points > point differential > wins
- **Statistics overlay** -- five fairness metrics with ideal values:
  - Partner Repeats, Opponent Balance, Never Shared Court, Rest Balance, Court Balance
  - Reshuffle and Find Optimal Distribution for unscored rounds
- **Mid-tournament adjustments**:
  - Add, replace, or mark players unavailable
  - Mark courts unavailable or add new courts
  - Change points per match or round count
  - All changes auto-regenerate unscored rounds
- **Sit-out compensation** -- players who sit out receive average points for that round
- **Export/Import** -- copy tournament state as JSON for backup or device transfer
- **Offline-first** -- service worker caches everything; no network needed after install

## Schedule Algorithm

The Americano schedule generator uses a multi-criteria optimization:

1. **Group selection** -- enumerate (up to 3 courts) or random-sample (4+ courts) player groupings per round, scoring by partner/opponent balance
2. **Court assignment** -- permute court assignments to balance per-player court counts
3. **Coverage tiebreaker** -- prefer groupings that create new player-pair encounters
4. **Retry loop** -- generate multiple candidates within a time budget, keep the best by `[partnerRepeats, opponentSpread, neverPlayed, courtSpread]`

The optimizer (Find Optimal Distribution) runs iteratively in the browser, saving each improvement and allowing early stop when all metrics hit their mathematical ideals.

## Tech

- React 19, TypeScript, Vite 7, CSS Modules
- `vite-plugin-pwa` for service worker and installability
- State via `useReducer` + Context, auto-saved to `localStorage`
- Strategy pattern for tournament formats (`src/strategies/`)

## Development

```sh
# from monorepo root
npm install
make dev        # starts runner dev server (+ planner)
make build      # production build
```

Dev server runs at `http://localhost:5173/play`.

## Testing

```sh
npx vitest run packages/runner/src/strategies/americano.test.ts   # quality + performance tests
npx vitest bench packages/runner/src/strategies/americano.bench.ts # benchmarks
```
