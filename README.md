# Tournament Manager

Mobile-first web app for running Americano and Mexicano format tournaments. Works offline at the court -- no network needed after first load.

## How It Works

1. **Setup** -- name your tournament, add players, pick courts, choose format (Americano / Mexicano)
2. **Generate schedule** -- the algorithm balances partner variety, opponent spread, court distribution, and rest fairness
3. **Play** -- enter scores round-by-round, see live standings
4. **Adjust on the fly** -- add/remove players, toggle court availability, change round count mid-tournament

### Scoring

Players accumulate **total points** across all matches. If a match ends 21-15, both winners get 21 pts and both losers get 15. Players who sit out a round receive the average points scored that round.

Standings are ranked by: total points > point differential > wins.

### Schedule Fairness

The schedule generator optimizes five criteria (visible in the Statistics overlay):

- **Partner Repeats** -- minimize repeat teammate pairings (ideal depends on player/court/round count)
- **Opponent Balance** -- each pair faces each other as opponents roughly the same number of times
- **Never Shared Court** -- minimize pairs who never appear in the same match
- **Rest Balance** -- games played and sit-outs distributed evenly (within 1)
- **Court Balance** -- players distributed evenly across courts

Use **Reshuffle** or **Find Optimal Distribution** in the Statistics overlay to improve unscored rounds.

### Mid-Tournament Management

During a running tournament you can:

- Add or replace players (schedule regenerates for unscored rounds)
- Mark players or courts as unavailable (preserves scored round statistics)
- Change points per match or total round count
- Add new courts

## Apps

### [Runner](/packages/runner) (`/play`)

Offline-first PWA for scoring at the court.

- All state in localStorage -- no network needed
- Live standings, round-by-round scoring
- Statistics overlay with fairness metrics and schedule optimization
- Export/import tournament data as JSON

### [Planner](/packages/planner) (`/plan`)

Web app for pre-tournament setup. Firebase-backed, shareable via short codes.

- Create tournament, manage player registration
- Share join link with players beforehand

## Project Structure

```
packages/
  common/    Shared types, utilities, UI components (Button, Card)
  runner/    PWA scoring app -- offline-first, state in localStorage
  planner/   Tournament planning app -- Firebase Realtime Database
```

## Development

```sh
npm install
make dev          # starts both apps + dev proxy
make build        # production build
make deploy-build # build + merge into dist/ for Cloudflare Pages
```

| App     | Dev URL                     | Base  |
|---------|-----------------------------|-------|
| Runner  | http://localhost:5173/play   | /play |
| Planner | http://localhost:5174/plan   | /plan |

## Testing

```sh
npx vitest run                # unit + integration tests
npx vitest bench              # performance benchmarks
npx tsc --noEmit -p packages/runner/tsconfig.app.json   # type check
```

## Tech

- React 19, TypeScript, Vite 7, CSS Modules
- npm workspaces monorepo
- `vite-plugin-pwa` for Runner's service worker
- Firebase Realtime Database + Anonymous Auth (Planner)
- Cloudflare Pages deployment (root redirects to `/play`)
