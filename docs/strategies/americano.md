# Americano Strategy — Distribution Algorithm

Source: `packages/runner/src/strategies/americano.ts`

## Overview

The Americano format generates a full schedule up front (or additional rounds on demand). Each round assigns players to courts in groups of 4, then pairs them into 2v2 matches. The algorithm optimizes for four fairness criteria, in priority order:

1. **Partnership diversity** — minimize repeat teammate pairings (highest priority)
2. **Opponent diversity** — spread opponent matchups evenly across all pairs
3. **Court balance** — distribute players evenly across courts
4. **Equal games played** — every player plays roughly the same number of matches

A time-budgeted retry loop generates multiple candidate schedules and keeps the best one.

## Round Generation Pipeline

### Step 1: Sit-out Selection

When `players > courts × 4`, some players must sit out each round.

- Players are sorted by `gamesPlayed` descending
- Players with the **most** games sit out first
- **Tie-breaking by rest spacing**: among players with equal games, the one whose last sit-out was longest ago sits out next (most "due" for a rest). Further ties are broken randomly.

This guarantees that no player falls more than 1 game behind any other, and that sit-outs are spaced as evenly as possible across rounds rather than clustering.

### Step 2: Court Grouping (which 4 players share a court)

Two strategies depending on tournament size:

**Exhaustive enumeration** (≤3 courts / ≤12 active players):

All unique partitions into groups of 4 are enumerated. The first element of each subproblem is fixed to avoid duplicate permutations.

| Active Players | Courts | Partitions |
|----------------|--------|------------|
| 4              | 1      | 1          |
| 8              | 2      | 105        |
| 12             | 3      | 5,775      |

Each partition is scored (see [Scoring](#scoring)). All partitions tied at the best score are collected, then further filtered by court balance (see [Court Balance Tiebreak](#court-balance-tiebreak)). One of the remaining candidates is chosen at random.

**Random sampling** (4+ courts):

Random partitions are evaluated up to a budget (6,000 attempts for 4 courts, 20,000 for 5+). Early exit if a perfect score (0) is found.

### Step 3: Court Assignment Optimization

After selecting the best grouping, the algorithm optimizes which group plays on which court. For 2–4 courts, all `n!` permutations of court assignments are enumerated (2 for 2 courts, 6 for 3, 24 for 4). Each permutation is scored by **sum-of-squares** of player-court play counts (lower = more balanced). The best permutation is selected.

This minimizes imbalance like one player always ending up on Court 1.

### Step 4: Team Pairing (who partners with whom)

For each group of 4 players `[A, B, C, D]`, there are 3 possible pairings:

| Pairing | Team 1 | Team 2 |
|---------|--------|--------|
| 1       | A, B   | C, D   |
| 2       | A, C   | B, D   |
| 3       | A, D   | B, C   |

The pairing with the lowest combined score is selected.

### Step 5: Tracking Updates

After creating all matches for a round, the algorithm updates:
- `partnerCounts[X:Y]` += 1 for each teammate pair
- `opponentCounts[X:Y]` += 1 for each cross-team pair (4 pairs per match)
- `gamesPlayed[X]` += 1 for each participating player
- `courtCounts[X:courtId]` += 1 for each player on each court
- `lastSitOutRound[X]` = current round number for each sitting-out player

These maps carry forward to the next round within the same generation pass.

## Scoring

### Pairing Score

```
pairingScore = partnerScore × 100 + Σ(opponentCount²)
```

Where:
- **partnerScore** = sum of existing `partnerCounts` for the two teammate pairs in the match
- **opponentCount²** = sum of squares of existing `opponentCounts` for all 4 cross-team pairs

The `×100` weight on partnership ensures repeat partners are heavily penalized. The sum-of-squares on opponents penalizes imbalance: `[2,0,0,0]→4` vs `[1,1,0,0]→2`, so the balanced option wins.

### Grouping Score

The score for a group of 4 is the **minimum** pairing score across all 3 possible pairings (assumes the best pairing will be chosen later). The total grouping score is the sum across all groups.

### Court Balance Tiebreak

In exhaustive enumeration mode, when multiple groupings tie at the same partner/opponent score, they are further ranked by court balance. For each tied grouping, the algorithm finds the best court permutation (by sum-of-squares of player-court counts) and uses that as a secondary score. Only the groupings with the best court score survive.

This ensures court balance is optimized without ever compromising partner/opponent quality.

## Schedule-Level Scoring and Retry Loop

The algorithm generates complete schedules within a time budget (500ms) and keeps the best.

A complete schedule is scored as a 3-tuple, compared lexicographically:

```
[partnerRepeats, opponentSpread, courtSpread]
```

Where:
- **partnerRepeats** — total repeat count across all partner pairs (0 is perfect)
- **opponentSpread** — max minus min of opponent pair counts (≤1 is ideal)
- **courtSpread** — max spread of player-court counts across all courts (≤1 is ideal)

The retry loop exits early when all three metrics reach their ideal values (`[0, ≤1, ≤1]`).

## Sit-out Compensation

Players who sit out still receive points in standings:

```
sitOutPoints = round(avgPointsPerPlayer)
```

Where `avgPointsPerPlayer` is calculated from all scored matches in that round. This prevents sit-outs from being purely punitive to standings.

## Seeding from Existing Rounds

When generating additional rounds (`generateAdditionalRounds`), the algorithm reconstructs `partnerCounts`, `opponentCounts`, `gamesPlayed`, `courtCounts`, and `lastSitOutRound` from all existing rounds before generating new ones. This ensures continuity of fairness tracking.

## Duplicate Name Handling

Before schedule generation, the `GENERATE_SCHEDULE` reducer action detects players with identical names and auto-suffixes them from a pool of 24 friendly labels (e.g. "Jr.", "Sr.", "the Great", "II", "el Magnifico", "the Bold", "v2.0", "Turbo", "OG", etc.). If more than 24 players share the same name, a numeric fallback `#N` is used. The renamed players are stored in tournament state, so suffixed names appear consistently everywhere.

## Fairness Statistics (UI)

The distribution stats overlay (`DistributionStats` component) displays five metrics:

| # | Metric | ✅ Condition | Detail |
|---|--------|-------------|--------|
| 1 | **Rest Balance** | Games spread ≤ 1 | Games: min–max (ideal) • Sit-outs: min–max (ideal) |
| 2 | **Partner Repeats** | No repeats | Lists repeat pairs with count |
| 3 | **Opponent Balance** | Spread ≤ ideal | Min/Max vs ideal range |
| 4 | **Court Balance** | All courts within ideal spread | Lists skewed courts (only shown with 2+ courts) |
| 5 | **Never Shared Court** | All players met | Lists pairs who never shared a court |

Ideal values are computed mathematically:
- Games ideal: `floor/ceil(courts × 4 × rounds / players)`
- Sit-outs ideal: `floor/ceil(sitOutsPerRound × rounds / players)`
- Opponent ideal: `floor/ceil(totalOpponentEncounters / totalPairs)`
- Court ideal: `floor/ceil(matchesOnCourt × 4 / players)`

## Performance Characteristics

| Config | Strategy | Time Budget | Typical Result |
|--------|----------|-------------|----------------|
| 8p / 2c / 7r | Exhaustive | 500ms | 0 repeats, ≤1 opp spread |
| 10p / 2c / 9r | Exhaustive | 500ms | 0 repeats, ≤1 opp spread |
| 12p / 3c / 11r | Exhaustive | 500ms | 0 repeats, ≤1 opp spread |
| 16p / 4c | Sampling (6K) | 500ms | Near-optimal |
| 24p / 6c | Sampling (20K) | 500ms | Probabilistic best-effort |
