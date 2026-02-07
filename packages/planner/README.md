# Tournament Planner

Web app for pre-tournament setup. Plan everything at home, export to Runner for the court.

- Create tournament: pick format, set courts, add players
- Generate balanced schedule (Americano, Mexicano, etc.)
- Export as JSON — paste into Runner at the court
- Share tournament link with players beforehand

## Status

Placeholder — not yet implemented.

## Development

```sh
# from monorepo root
npm install
make dev        # starts planner dev server (+ runner)
make build      # production build
```

Dev server runs at `http://localhost:5174/plan`.
