# Club Americano Strategy

Source: `packages/runner/src/strategies/clubAmericano.ts`

## Overview

Club Americano is a dynamic format where multiple clubs (3-5) of 2-3 pairs each compete against each other in a round-robin. Partners are always from the same club, opponents are always from other clubs. Club standings aggregate member pair points, making clubs a first-class gameplay mechanic.

Standings are per-pair (team) with an additional club standings view that aggregates pair points by club.

## Strategy Flags

| Flag | Value | Meaning |
|------|-------|---------|
| `isDynamic` | `true` | Rounds generated one at a time (needed for standings-based matching + rotating pairs) |
| `hasFixedPartners` | `true` | Uses team-pairing screen; pairs are always intra-club |

## Configuration Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `pairMode` | `fixed`, `rotating` | `fixed` | Fixed: pairs set during setup. Rotating: new random intra-club pairs each round |
| `matchMode` | `random`, `standings`, `slots` | `random` | How pairs from two clubs are matched within a fixture |

## Setup Requirements

Custom validation (`clubAmericanoValidateSetup`):

| Constraint | Value | Reason |
|-----------|-------|--------|
| Minimum clubs | 2 | Need at least 2 clubs for fixtures |
| Minimum players per club | 4 (2 pairs) | Each match needs 2 pairs |
| Even player count per club | Required | Players pair into teams of 2 |
| All players assigned | Required | No unassigned players allowed |
| Minimum courts | 1 (available) | |
| Minimum points per match | 1 | |

### Warnings

- Clubs with different sizes: some pairs may sit out more often.

## Schedule Generation

### Club Round-Robin Fixtures

The fixture schedule is generated using a standard round-robin rotation:

- **Even N clubs**: N/2 fixtures per round, all clubs play. N-1 total rounds.
- **Odd N clubs**: (N-1)/2 fixtures per round, one club has a bye each round. N total rounds.

The rotation uses the "fix first, rotate rest" algorithm. If `maxRounds` exceeds the cycle length, fixtures repeat cyclically.

### Default Round Count

```
defaultRounds = N even ? N - 1 : N
totalRounds = maxRounds ?? defaultRounds
```

### Per-Round Generation

For each round:

1. **Club fixture selection**: Pick the fixture set for this round from the round-robin schedule.

2. **Bye handling**: Clubs not in any fixture sit out — all their pairs' players are added to `sitOuts`.

3. **Fixture pair matching** (per fixture, based on `matchMode`):
   - `random`: Randomly pair teams from each club.
   - `standings`: Sort pairs by accumulated points within each club, match by rank (best vs best).
   - `slots`: Use team order as-is (1v1, 2v2, 3v3).

4. **Court assignment**: Matches are assigned to available courts sequentially. Pairs that don't fit on courts sit out.

5. **Tracking updates**: `opponentCounts`, `gamesPlayed`, `lastSitOutRound`, and `teamPoints` are updated after each round.

### Pair Rotation

When `pairMode === 'rotating'`:

After all matches in a round are scored, the reducer (`SET_MATCH_SCORE`) calls `createClubTeams()` to shuffle players within each club and form new pairs before generating the next round. The `tournament.teams` array is updated in-place.

### Additional Rounds

When generating additional rounds:
- Tracking maps are reconstructed from all existing rounds.
- `teamPoints` are computed from scored matches to support standings-based matching.
- Fixture index wraps cyclically: `fixtureIdx = (roundNum - 1) % clubFixtures.length`.

## Sit-out Handling

Sit-outs happen at two levels:

1. **Club-level bye**: When odd number of clubs, one club sits out entirely each round (round-robin bye).
2. **Pair-level overflow**: When a fixture produces more matches than available courts, excess pairs sit out.

Both levels add all affected player IDs to `round.sitOuts` for sit-out compensation.

## Standings Calculation

### Pair Standings

Per-team standings using `calculateCompetitorStandings` (same as Team Americano):

```
totalPoints = Σ(matchPoints) + sitOutCompensation
```

Sorting: totalPoints (desc) → pointDiff (desc) → matchesWon (desc) → name (alpha).

### Club Standings

Aggregated from pair standings via `useClubStandings` hook:

```
clubTotalPoints = Σ(pairTotalPoints for pairs in club)
```

Sorted by `totalPoints` descending. Ties share the same rank.

Displayed in a dedicated `ClubStandingsTable` component with colored club dots.

## Competitors

Each `Team` becomes a competitor (same as Team Americano):
- `id`: team ID
- `name`: team name or `"Player1 & Player2"` fallback
- `playerIds`: both player IDs

Teams with any unavailable player are excluded.

## Club Nominations

Four club-specific awards are generated when the tournament completes:

| ID | Title | Emoji | Tier | Criteria |
|-----|-------|-------|------|----------|
| `club-champion` | Club Champion | 🏆 | — (podium-style) | Club with the most aggregate points. Always shown after podium. |
| `club-rivalry` | Club Rivalry | ⚔️ | Rare | Two clubs with closest total points (gap ≤ 10% of leader). |
| `club-mvp` | Club MVP | 🌟 | Rare | Pair scoring the highest % of their club's total points. |
| `club-solidarity` | Club Solidarity | 🤝 | Common | Club with smallest points spread between pairs. |

Club Champion is always shown (like podium medals). The other three enter the regular tier-weighted award lottery.

## UI Specifics

### Setup

- **ClubSection** component appears between Players and Settings when format is `club-americano`.
- Club cards with editable names, remove buttons, and assigned player tags.
- Unassigned players shown below with per-club assignment buttons.
- 5-color palette: blue, pink, green, amber, purple.

### Team Pairing

- Teams grouped by club with colored club headers.
- Swap constraint: players can only be swapped within the same club.
- Shuffle reshuffles within clubs, not across clubs.

### Standings Display

- **In-progress modal**: Tab toggle between "Pairs" and "Clubs" views.
- **Completed carousel**: Club standings added as an additional slide after pair standings.
- **StandingsTable**: Club badge (colored pill) shown next to each pair name.

## Reducer Actions

| Action | Phase | Description |
|--------|-------|-------------|
| `ADD_CLUB` | setup | Append club with generated ID |
| `REMOVE_CLUB` | setup | Remove club, clear `clubId` from affected players |
| `RENAME_CLUB` | setup | Update club name |
| `SET_PLAYER_CLUB` | setup | Set or clear a player's `clubId` |

Modified actions:
- `SET_TEAMS` / `SHUFFLE_TEAMS`: Use `createClubTeams()` for club-americano (pairs players within clubs).
- `REPLACE_PLAYER`: Inherits `clubId` from replaced player.
- `SET_MATCH_SCORE`: For rotating pair mode, regenerates intra-club pairs when generating next round.

## File Map

| File | Role |
|------|------|
| `strategies/clubAmericano.ts` | Core logic: club round-robin fixtures, fixture pair matching, validation, warnings |
| `strategies/shared.ts` | Shared utilities: `calculateCompetitorStandings`, `findTeamByPair`, `shuffle` |
| `state/tournamentReducer.ts` | Club actions, club-aware team creation, rotating pair regeneration |
| `state/actions.ts` | `ADD_CLUB`, `REMOVE_CLUB`, `RENAME_CLUB`, `SET_PLAYER_CLUB` action types |
| `hooks/useClubStandings.ts` | Aggregates pair standings into club standings |
| `components/setup/ClubSection.tsx` | Club management UI for setup screen |
| `components/standings/ClubStandingsTable.tsx` | Club standings table component |
| `screens/TeamPairingScreen.tsx` | Club grouping + intra-club swap constraint |
| `screens/PlayScreen.tsx` | Standings tabs + club standings carousel slide |
| `components/standings/StandingsTable.tsx` | Club badge rendering via `clubInfo` prop |
| `hooks/awards/club.ts` | Club-specific awards: Champion, Rivalry, MVP, Solidarity |
