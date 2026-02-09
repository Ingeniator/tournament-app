# Americano Strategy - Player Distribution Logic

Source: `packages/runner/src/strategies/americano.ts`

## Overview

The Americano format generates a full schedule up front (or additional rounds on demand). Each round assigns players to courts in groups of 4, then pairs them into 2v2 matches. The algorithm optimizes for three fairness goals:

1. **Equal games played** - every player plays roughly the same number of matches
2. **Partnership diversity** - minimize repeat teammate pairings
3. **Opponent diversity** - minimize repeat opponent matchups

## Round Generation

### Step 1: Sit-out Selection

When `players > courts * 4`, some players must sit out each round.

- Players are sorted by `gamesPlayed` descending
- Players with the **most** games sit out first
- **Tie-breaking is randomized**: the player array is shuffled before sorting, so tied players are equally likely to sit out

This guarantees that no player falls more than 1 game behind any other.

### Step 2: Court Grouping (which 4 players share a court)

A Monte Carlo approach tries many random partitions and picks the best:

- Active players are randomly shuffled and split into groups of 4
- Each grouping is scored (see [Scoring](#scoring))
- The grouping with the lowest score wins
- **Early exit** if a perfect score (0) is found

**Attempt scaling**: `min(500 * numCourts^2, 5000)` attempts are made. Quadratic scaling gives larger tournaments proportionally more search budget.

### Step 3: Team Pairing (who partners with whom within each court)

For each group of 4 players `[A, B, C, D]`, there are 3 possible pairings:

| Pairing | Team 1 | Team 2 |
|---------|--------|--------|
| 1       | A, B   | C, D   |
| 2       | A, C   | B, D   |
| 3       | A, D   | B, C   |

The pairing with the lowest combined score is selected.

### Step 4: Tracking Updates

After creating all matches for a round, the algorithm updates:
- `partnerCounts[X:Y]` += 1 for each teammate pair
- `opponentCounts[X:Y]` += 1 for each cross-team pair (4 pairs per match)
- `gamesPlayed[X]` += 1 for each participating player

These maps carry forward to the next round.

## Scoring

Both grouping evaluation and pairing selection use the same combined score:

```
score = partnerScore * 2 + opponentScore
```

Where:
- **partnerScore** = sum of `partnerCounts` for the two teammate pairs in the match
- **opponentScore** = sum of `opponentCounts` for all 4 cross-team opponent pairs

Partnership repeats are weighted **2x** because there are naturally fewer partner pairs (2) than opponent pairs (4) per match. Equal weighting would cause opponent diversity to dominate the optimization.

At the grouping stage, the score for a group is the **minimum** across all 3 possible pairings (i.e., we evaluate the group assuming we'll pick the best pairing later).

## Sit-out Compensation

Players who sit out still receive points in standings:

```
sitOutPoints = round(avgPointsPerPlayer)
```

Where `avgPointsPerPlayer` is calculated from all scored matches in that round. This prevents sit-outs from being purely punitive to standings.

## Seeding from Existing Rounds

When generating additional rounds (`generateAdditionalRounds`), the algorithm reconstructs `partnerCounts`, `opponentCounts`, and `gamesPlayed` from all existing rounds before generating new ones. This ensures continuity of fairness tracking.

## Practical Limits

| Players | Courts | Partition Space | Attempts | Raw Coverage |
|---------|--------|-----------------|----------|--------------|
| 8       | 2      | 35              | 2,000    | Full         |
| 12      | 3      | 5,775           | 4,500    | ~78%         |
| 16      | 4      | ~2.6M           | 5,000    | ~0.2%        |
| 18      | 4      | ~2.6M (16 active) | 5,000  | ~0.2%        |

Raw coverage is low for 16+ active players, but this is not the relevant metric. What matters is the probability of finding a near-optimal partition. If just 0.1% of partitions are good, 5,000 attempts gives a >99% chance of finding one. For early rounds most partitions score 0, so the search exits immediately. Coverage only matters in late rounds when constraints accumulate, and even then 5,000 attempts reliably finds good solutions.
