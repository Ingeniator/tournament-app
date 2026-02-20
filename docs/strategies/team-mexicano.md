# Team Mexicano Strategy

Source: `packages/runner/src/strategies/teamMexicano.ts`

## Overview

Team Mexicano is a dynamic format that combines fixed teams with standings-based matchups. Teams are formed before the tournament and never change, but after round 1, opponents are determined by team standings: 1st vs 2nd, 3rd vs 4th, etc. This keeps matches competitive throughout the tournament.

Rounds are generated one at a time — each round depends on the previous round's results.

## Strategy Flags

| Flag | Value | Meaning |
|------|-------|---------|
| `isDynamic` | `true` | Rounds generated one at a time based on standings |
| `hasFixedPartners` | `true` | Teams never change; pair/duo awards are not available |

## Setup Requirements

Custom validation (`teamMexicanoValidateSetup`):

| Constraint | Value | Reason |
|-----------|-------|--------|
| Minimum players | 4 | Need at least 2 teams |
| Even player count | Required | Each team has exactly 2 players |
| Minimum courts | 1 (available) | |
| Minimum points per match | 1 | |
| Max courts | `floor(numTeams / 2)` | Each match needs 2 teams |

## Round Generation Pipeline

### Round 1: Random Matchups

Active teams (after sit-out selection) are shuffled randomly and paired sequentially: 1st+2nd, 3rd+4th, etc.

### Subsequent Rounds: Standings-Based Matchups

#### Step 1: Sit-out Selection

Teams with the most games played sit out first. Ties broken by longest time since last sit-out, then randomly. Entire teams sit out together.

#### Step 2: Calculate Team Standings

A standings table is built from all rounds so far using `calculateCompetitorStandings`. Each team is ranked by total points, point differential, and wins.

#### Step 3: Standings-Based Pairing

Active teams are sorted by their standings rank, then paired:
- **Court 1**: 1st vs 2nd (top two teams face each other)
- **Court 2**: 3rd vs 4th
- **Court 3**: 5th vs 6th
- etc.

This ensures the best teams always face the toughest opponents, keeping matches competitive.

### Tracking Updates

After each round, `gamesPlayed` and `lastSitOutRound` are updated for sit-out rotation.

## Standings Calculation

Standings are per-team using `calculateCompetitorStandings`:

```
totalPoints = Σ(matchPoints) + sitOutCompensation
```

Sorting: totalPoints (desc) → pointDiff (desc) → matchesWon (desc) → name (alpha).

## Competitors

Each `Team` object becomes a competitor:
- `id`: team ID
- `name`: team name or `"Player1 & Player2"` fallback
- `playerIds`: both player IDs

Teams with any unavailable player are excluded.

## Key Difference from Team Americano

| Aspect | Team Americano | Team Mexicano |
|--------|---------------|---------------|
| Schedule | Static (all rounds up front) | Dynamic (one round at a time) |
| Matchups | Random with opponent diversity | Standings-based (1st vs 2nd) |
| Goal | Maximize opponent variety | Maximize competitive balance |

## File Map

| File | Role |
|------|------|
| `strategies/teamMexicano.ts` | Core logic: validation, standings-based matchups, team-level sit-outs |
| `strategies/shared.ts` | Shared utilities: `commonValidateScore`, `calculateCompetitorStandings` |
