# Tournament Planner

Web app for pre-tournament setup. Organize everything beforehand, share a join link with players.

## Features

- Create tournament with format, courts, and settings
- Share via 6-character short code -- players join and register their names
- Organizer dashboard with player list management
- Firebase-backed -- real-time sync across devices

## Tech

- React 19, TypeScript, Vite 7, CSS Modules
- Firebase Realtime Database + Anonymous Auth
- State via Context (no localStorage)

## Development

```sh
# from monorepo root
npm install
make dev        # starts planner dev server (+ runner)
make build      # production build
```

Dev server runs at `http://localhost:5174/plan`.

Requires Firebase environment variables (`VITE_FIREBASE_*`) for full functionality.
