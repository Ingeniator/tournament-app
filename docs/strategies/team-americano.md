# Team Americano Strategy

Source: `packages/runner/src/strategies/teamAmericano.ts`

## Overview

Team Americano is a static format where fixed teams (pairs of players) compete against each other. Teams are formed before the tournament and never change. The full schedule is generated up front, optimizing for opponent diversity through random sampling.

Standings are per-team, not per-individual.

## Strategy Flags

| Flag | Value | Meaning |
|------|-------|---------|
| `isDynamic` | `false` | Full schedule generated up front |
| `hasFixedPartners` | `true` | Teams never change; pair/duo awards are not available |

## Setup Requirements

Custom validation (`teamAmericanoValidateSetup`):

| Constraint | Value | Reason |
|-----------|-------|--------|
| Minimum players | 4 | Need at least 2 teams |
| Even player count | Required | Each team has exactly 2 players |
| Minimum courts | 1 (available) | |
| Minimum points per match | 1 | |
| Max courts | `floor(numTeams / 2)` | Each match needs 2 teams |

## Schedule Generation

### Full Schedule (Up Front)

The number of rounds is determined by:

```
totalRounds = maxRounds ?? max(1, ceil((numTeams - 1) × numTeams / teamsPerRound))
```

This formula ensures each team has a chance to face every other team at least once.

### Per-Round: Random Sampling with Opponent Minimization

For each round:

1. **Sit-out selection**: Teams with the most games played sit out first. Ties broken by longest time since last sit-out, then randomly.

2. **Opponent pairing**: The algorithm tries many random pairings of active teams (500 attempts for ≤8 teams, 2000 for larger) and keeps the one that minimizes opponent repeat imbalance:

```
score = Σ(previousMeetings²)
```

The sum-of-squares scoring penalizes imbalance: meeting one team 3 times scores `9`, while meeting three teams once each scores `3`. Early exit if a perfect score (0) is found.

3. **Tracking updates**: After each round, `opponentCounts`, `gamesPlayed`, and `lastSitOutRound` are updated.

### Additional Rounds

When generating additional rounds, tracking maps (`opponentCounts`, `gamesPlayed`, `lastSitOutRound`) are reconstructed from all existing rounds before generating new ones.

## Sit-out Handling

Sit-outs operate at the team level:
- Entire teams sit out together (both players)
- `selectTeamSitOuts` sorts teams by games played (descending), with tiebreak by last sit-out round
- Sit-out player IDs include both members of each sitting-out team

## Standings Calculation

Standings are per-team using `calculateCompetitorStandings`:

```
totalPoints = Σ(matchPoints) + sitOutCompensation
```

Sorting: totalPoints (desc) → pointDiff (desc) → matchesWon (desc) → name (alpha).

Each team's score in a match is the score of their side.

## Competitors

Each `Team` object becomes a competitor:
- `id`: team ID
- `name`: team name or `"Player1 & Player2"` fallback
- `playerIds`: both player IDs

Teams with any unavailable player are excluded.

## File Map

| File | Role |
|------|------|
| `strategies/teamAmericano.ts` | Core logic: validation, random sampling, opponent optimization, team-level standings |
| `strategies/shared.ts` | Shared utilities: `commonValidateScore`, `calculateCompetitorStandings` |
