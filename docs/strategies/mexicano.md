# Mexicano Strategy

Source: `packages/runner/src/strategies/mexicano.ts`

## Overview

Mexicano is a dynamic format where partners rotate every round and matchups are based on current standings. Round 1 uses random grouping; subsequent rounds group players by rank so that similarly ranked players face each other. Within each group, the strongest and weakest are paired together against the middle two (1st+4th vs 2nd+3rd), creating balanced matches.

Unlike Americano (which generates the full schedule up front), Mexicano generates one round at a time — each round depends on the previous round's results.

## Strategy Flags

| Flag | Value | Meaning |
|------|-------|---------|
| `isDynamic` | `true` | Rounds generated one at a time based on standings |
| `hasFixedPartners` | `false` | Partners rotate every round; pair/duo awards are available |

## Setup Requirements

Mexicano uses `commonValidateSetup`:

| Constraint | Value |
|-----------|-------|
| Minimum players | 4 |
| Minimum courts | 1 (available) |
| Minimum points per match | 1 |

If available courts exceed `floor(players / 4)`, a "too many courts" error is returned.

## Round Generation Pipeline

### Round 1: Random Grouping

Players are shuffled randomly and split into groups of 4 per court. Within each group, the pairing with the fewest partner repeats is selected from the 3 possible 2v2 combinations.

### Subsequent Rounds: Standings-Based Grouping

#### Step 1: Sit-out Selection

When `players > courts × 4`, some players must sit out. Players with the most games played sit out first. Ties are broken by longest time since last sit-out, then randomly.

#### Step 2: Calculate Standings

A temporary standings table is built from all rounds so far (existing + generated in this batch) using `calculateIndividualStandings`.

#### Step 3: Group by Rank

Active players (not sitting out) are sorted by their standings rank, then split into groups of 4:
- Group 1: ranks 1–4 (top court)
- Group 2: ranks 5–8
- Group 3: ranks 9–12
- etc.

#### Step 4: Mexicano Pairing

Within each group of 4 (ordered by rank), the pairing is always:
- **Team 1**: 1st + 4th (strongest + weakest)
- **Team 2**: 2nd + 3rd (middle two)

This ensures competitive balance — the best player carries the weakest, and vice versa.

### Tracking Updates

After each round, `partnerCounts` and `gamesPlayed` are updated to inform sit-out selection and partner-repeat avoidance in future rounds.

## Standings Calculation

Mexicano uses the standard individual standings calculation (`calculateCompetitorStandings`):

```
totalPoints = Σ(matchPoints) + sitOutCompensation
```

Sorting: totalPoints (desc) → pointDiff (desc) → matchesWon (desc) → name (alpha).

Where:
- `matchPoints` = points the player's team scored in the match
- `sitOutCompensation` = average points per player in that round (for rounds the player sat out)

## Competitors

Each individual player is a competitor. Unavailable players are excluded.

## File Map

| File | Role |
|------|------|
| `strategies/mexicano.ts` | Core logic: validation, round generation, standings-based grouping |
| `strategies/shared.ts` | Shared utilities: `commonValidateSetup`, `selectSitOuts`, `calculateIndividualStandings` |
